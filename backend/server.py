from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import secrets
import logging
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'routine_app')]

app = FastAPI(title="Routine Management API")
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============ PYDANTIC MODELS ============

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=6)

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RoutineCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "list"
    color: str = "#0047FF"
    recurrence_type: str = "daily"
    recurrence_config: dict = {}

class RoutineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    recurrence_type: Optional[str] = None
    recurrence_config: Optional[dict] = None

class ItemTemplateCreate(BaseModel):
    title: str
    notes: str = ""
    priority: str = "medium"
    has_specific_time: bool = False
    time: str = ""
    is_all_day: bool = True
    order_index: int = 0
    repeat_per_day_count: int = 1

class ItemTemplateUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    has_specific_time: Optional[bool] = None
    time: Optional[str] = None
    is_all_day: Optional[bool] = None
    order_index: Optional[int] = None
    repeat_per_day_count: Optional[int] = None

class InstanceToggle(BaseModel):
    is_completed: bool

class SettingsUpdate(BaseModel):
    language: Optional[str] = None
    theme_mode: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    reminder_times: Optional[List[str]] = None

class PushTokenRegister(BaseModel):
    token: str
    platform: str = "ios"
    device_name: str = ""

class GoogleCallbackRequest(BaseModel):
    session_id: str


# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_data = {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
            "preferred_language": user.get("preferred_language", "en"),
            "theme_mode": user.get("theme_mode", "system"),
            "notifications_enabled": user.get("notifications_enabled", True),
        }
        return user_data
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def format_user_response(user_doc: dict) -> dict:
    return {
        "id": str(user_doc["_id"]) if "_id" in user_doc else user_doc.get("id", ""),
        "email": user_doc["email"],
        "name": user_doc.get("name", ""),
        "preferred_language": user_doc.get("preferred_language", "en"),
        "theme_mode": user_doc.get("theme_mode", "system"),
        "notifications_enabled": user_doc.get("notifications_enabled", True),
    }


# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register")
async def register(data: UserRegister):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "preferred_language": "en",
        "theme_mode": "system",
        "notifications_enabled": True,
        "reminder_times": [],
        "push_tokens": [],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "email": email,
            "name": data.name,
            "preferred_language": "en",
            "theme_mode": "system",
            "notifications_enabled": True,
        }
    }


@api_router.post("/auth/login")
async def login(data: UserLogin):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": format_user_response(user),
    }


@api_router.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/refresh")
async def refresh_token(data: RefreshTokenRequest):
    try:
        payload = jwt.decode(data.refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        new_access = create_access_token(user_id, user["email"])
        new_refresh = create_refresh_token(user_id)
        return {"access_token": new_access, "refresh_token": new_refresh}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "If the email exists, a reset link has been sent."}

    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": str(user["_id"]),
        "email": email,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False,
    })
    logger.info(f"Password reset token for {email}: {token}")
    return {"message": "If the email exists, a reset link has been sent."}


@api_router.post("/auth/google-callback")
async def google_callback(data: GoogleCallbackRequest):
    """Exchange Emergent Google OAuth session_id for JWT tokens"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": data.session_id},
                timeout=15.0,
            )
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Failed to contact auth service")

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired Google session")

    auth_data = response.json()
    email = auth_data["email"].lower()
    name = auth_data.get("name", "")
    picture = auth_data.get("picture", "")

    existing = await db.users.find_one({"email": email})

    if existing:
        user_id = str(existing["_id"])
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name or existing.get("name", ""), "picture": picture}}
        )
        user_doc = await db.users.find_one({"email": email})
    else:
        user_doc = {
            "email": email,
            "password_hash": "",
            "name": name,
            "picture": picture,
            "auth_provider": "google",
            "preferred_language": "en",
            "theme_mode": "system",
            "notifications_enabled": True,
            "reminder_times": [],
            "push_tokens": [],
            "created_at": datetime.now(timezone.utc),
        }
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": format_user_response(user_doc) if existing else {
            "id": user_id,
            "email": email,
            "name": name,
            "preferred_language": "en",
            "theme_mode": "system",
            "notifications_enabled": True,
        },
    }


@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    reset_doc = await db.password_reset_tokens.find_one({
        "token": data.token,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    new_hash = hash_password(data.password)
    await db.users.update_one(
        {"_id": ObjectId(reset_doc["user_id"])},
        {"$set": {"password_hash": new_hash}}
    )
    await db.password_reset_tokens.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    return {"message": "Password reset successfully"}


# ============ ROUTINES ENDPOINTS ============

@api_router.get("/routines")
async def get_routines(user: dict = Depends(get_current_user)):
    routines = await db.routines.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return routines


@api_router.post("/routines")
async def create_routine(data: RoutineCreate, user: dict = Depends(get_current_user)):
    routine = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": data.name,
        "description": data.description,
        "icon": data.icon,
        "color": data.color,
        "is_active": True,
        "recurrence_type": data.recurrence_type,
        "recurrence_config": data.recurrence_config,
        "current_streak": 0,
        "best_streak": 0,
        "last_successful_date": None,
        "created_at": datetime.now(timezone.utc),
    }
    await db.routines.insert_one(routine)
    routine.pop("_id", None)
    return routine


@api_router.get("/routines/{routine_id}")
async def get_routine(routine_id: str, user: dict = Depends(get_current_user)):
    routine = await db.routines.find_one(
        {"id": routine_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    return routine


@api_router.put("/routines/{routine_id}")
async def update_routine(routine_id: str, data: RoutineUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.routines.update_one(
        {"id": routine_id, "user_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Routine not found")

    routine = await db.routines.find_one(
        {"id": routine_id, "user_id": user["id"]}, {"_id": 0}
    )
    return routine


@api_router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: str, user: dict = Depends(get_current_user)):
    result = await db.routines.delete_one({"id": routine_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Routine not found")

    await db.routine_item_templates.delete_many({"user_id": user["id"], "routine_id": routine_id})
    await db.scheduled_item_instances.delete_many({"user_id": user["id"], "routine_id": routine_id})
    return {"message": "Routine deleted"}


# ============ ITEM TEMPLATE ENDPOINTS ============

@api_router.get("/routines/{routine_id}/items")
async def get_items(routine_id: str, user: dict = Depends(get_current_user)):
    items = await db.routine_item_templates.find(
        {"user_id": user["id"], "routine_id": routine_id}, {"_id": 0}
    ).sort("order_index", 1).to_list(100)
    return items


@api_router.post("/routines/{routine_id}/items")
async def create_item(routine_id: str, data: ItemTemplateCreate, user: dict = Depends(get_current_user)):
    routine = await db.routines.find_one({"id": routine_id, "user_id": user["id"]})
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")

    item = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "routine_id": routine_id,
        "title": data.title,
        "notes": data.notes,
        "priority": data.priority,
        "has_specific_time": data.has_specific_time,
        "time": data.time,
        "is_all_day": data.is_all_day,
        "order_index": data.order_index,
        "repeat_per_day_count": data.repeat_per_day_count,
        "created_at": datetime.now(timezone.utc),
    }
    await db.routine_item_templates.insert_one(item)
    item.pop("_id", None)
    return item


@api_router.put("/items/{item_id}")
async def update_item(item_id: str, data: ItemTemplateUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.routine_item_templates.update_one(
        {"id": item_id, "user_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")

    item = await db.routine_item_templates.find_one(
        {"id": item_id, "user_id": user["id"]}, {"_id": 0}
    )
    return item


@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
    result = await db.routine_item_templates.delete_one({"id": item_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.scheduled_item_instances.delete_many({"user_id": user["id"], "template_item_id": item_id})
    return {"message": "Item deleted"}


# ============ INSTANCE LOGIC ============

def is_routine_due_today(routine: dict, date_str: str) -> bool:
    recurrence_type = routine.get("recurrence_type", "daily")

    if recurrence_type == "daily":
        return True

    if recurrence_type == "weekly":
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        day_name = date_obj.strftime("%A").lower()
        config = routine.get("recurrence_config", {})
        days = config.get("days", ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
        return day_name in days

    if recurrence_type == "custom":
        config = routine.get("recurrence_config", {})
        interval = config.get("interval_days", 1)
        start_date_str = config.get("start_date")
        if not start_date_str:
            return True
        try:
            start = datetime.strptime(start_date_str, "%Y-%m-%d")
            current = datetime.strptime(date_str, "%Y-%m-%d")
            diff = (current - start).days
            return diff >= 0 and diff % interval == 0
        except ValueError:
            return True

    return True


async def generate_instances(user_id: str, date_str: str):
    routines = await db.routines.find(
        {"user_id": user_id, "is_active": True}, {"_id": 0}
    ).to_list(100)

    for routine in routines:
        routine_id = routine["id"]

        if not is_routine_due_today(routine, date_str):
            continue

        templates = await db.routine_item_templates.find(
            {"user_id": user_id, "routine_id": routine_id}, {"_id": 0}
        ).sort("order_index", 1).to_list(100)

        for template in templates:
            repeat_count = template.get("repeat_per_day_count", 1)

            for i in range(repeat_count):
                existing = await db.scheduled_item_instances.find_one({
                    "user_id": user_id,
                    "template_item_id": template["id"],
                    "date": date_str,
                    "instance_index": i,
                })

                if not existing:
                    instance = {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "routine_id": routine_id,
                        "template_item_id": template["id"],
                        "title_snapshot": template["title"],
                        "notes_snapshot": template.get("notes", ""),
                        "date": date_str,
                        "scheduled_time": template.get("time", ""),
                        "instance_index": i,
                        "is_completed": False,
                        "completed_at": None,
                        "created_at": datetime.now(timezone.utc),
                    }
                    await db.scheduled_item_instances.insert_one(instance)


async def calculate_streak(user_id: str, routine_id: str, date_str: str):
    instances = await db.scheduled_item_instances.find(
        {"user_id": user_id, "routine_id": routine_id, "date": date_str}
    ).to_list(100)

    if not instances:
        return

    all_completed = all(inst.get("is_completed", False) for inst in instances)

    routine = await db.routines.find_one({"user_id": user_id, "id": routine_id}, {"_id": 0})
    if not routine:
        return

    current_streak = routine.get("current_streak", 0)
    best_streak = routine.get("best_streak", 0)
    last_successful = routine.get("last_successful_date")

    if all_completed:
        today = datetime.strptime(date_str, "%Y-%m-%d").date()

        if last_successful:
            try:
                last_date = datetime.strptime(last_successful, "%Y-%m-%d").date()
                diff = (today - last_date).days
                if diff == 0:
                    return
                elif diff == 1:
                    new_streak = current_streak + 1
                else:
                    new_streak = 1
            except ValueError:
                new_streak = 1
        else:
            new_streak = 1

        new_best = max(best_streak, new_streak)

        await db.routines.update_one(
            {"user_id": user_id, "id": routine_id},
            {"$set": {
                "current_streak": new_streak,
                "best_streak": new_best,
                "last_successful_date": date_str,
            }}
        )
    else:
        if last_successful and last_successful == date_str:
            today = datetime.strptime(date_str, "%Y-%m-%d").date()
            yesterday = (today - timedelta(days=1)).strftime("%Y-%m-%d")
            yesterday_instances = await db.scheduled_item_instances.find(
                {"user_id": user_id, "routine_id": routine_id, "date": yesterday}
            ).to_list(100)
            if yesterday_instances and all(i.get("is_completed", False) for i in yesterday_instances):
                prev_routine = await db.routines.find_one({"user_id": user_id, "id": routine_id})
                if prev_routine:
                    recalc_streak = max(prev_routine.get("current_streak", 1) - 1, 0)
                    await db.routines.update_one(
                        {"user_id": user_id, "id": routine_id},
                        {"$set": {
                            "current_streak": recalc_streak,
                            "last_successful_date": yesterday if recalc_streak > 0 else None,
                        }}
                    )
            else:
                await db.routines.update_one(
                    {"user_id": user_id, "id": routine_id},
                    {"$set": {
                        "current_streak": 0,
                        "last_successful_date": None,
                    }}
                )


# ============ INSTANCE ENDPOINTS ============

@api_router.post("/instances/generate-today")
async def generate_today_instances(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await generate_instances(user["id"], today)
    return {"message": "Instances generated", "date": today}


@api_router.get("/instances/today")
async def get_today_instances(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await generate_instances(user["id"], today)

    instances = await db.scheduled_item_instances.find(
        {"user_id": user["id"], "date": today}, {"_id": 0}
    ).to_list(500)

    routines = await db.routines.find(
        {"user_id": user["id"], "is_active": True}, {"_id": 0}
    ).to_list(100)

    routine_map = {r["id"]: r for r in routines}
    groups = {}

    for inst in instances:
        rid = inst["routine_id"]
        if rid not in routine_map:
            continue
        if rid not in groups:
            groups[rid] = {
                "routine": routine_map[rid],
                "instances": [],
                "completedCount": 0,
                "totalCount": 0,
            }
        groups[rid]["instances"].append(inst)
        groups[rid]["totalCount"] += 1
        if inst.get("is_completed"):
            groups[rid]["completedCount"] += 1

    for g in groups.values():
        g["instances"].sort(key=lambda x: (x.get("scheduled_time", ""), x.get("instance_index", 0)))

    return {"date": today, "groups": list(groups.values())}


@api_router.put("/instances/{instance_id}/toggle")
async def toggle_instance(instance_id: str, data: InstanceToggle, user: dict = Depends(get_current_user)):
    update_fields = {"is_completed": data.is_completed}
    if data.is_completed:
        update_fields["completed_at"] = datetime.now(timezone.utc)
    else:
        update_fields["completed_at"] = None

    result = await db.scheduled_item_instances.update_one(
        {"id": instance_id, "user_id": user["id"]},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Instance not found")

    instance = await db.scheduled_item_instances.find_one(
        {"id": instance_id, "user_id": user["id"]}, {"_id": 0}
    )

    if instance:
        await calculate_streak(user["id"], instance["routine_id"], instance["date"])

    return instance


# ============ SETTINGS ENDPOINTS ============

@api_router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "language": user_doc.get("preferred_language", "en"),
        "theme_mode": user_doc.get("theme_mode", "system"),
        "notifications_enabled": user_doc.get("notifications_enabled", True),
        "reminder_times": user_doc.get("reminder_times", []),
    }


@api_router.put("/settings")
async def update_settings(data: SettingsUpdate, user: dict = Depends(get_current_user)):
    update_data = {}
    if data.language is not None:
        update_data["preferred_language"] = data.language
    if data.theme_mode is not None:
        update_data["theme_mode"] = data.theme_mode
    if data.notifications_enabled is not None:
        update_data["notifications_enabled"] = data.notifications_enabled
    if data.reminder_times is not None:
        update_data["reminder_times"] = data.reminder_times

    if update_data:
        await db.users.update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": update_data}
        )

    return await get_settings(user)


# ============ PUSH TOKEN ENDPOINTS ============

@api_router.post("/notifications/register-token")
async def register_push_token(data: PushTokenRegister, user: dict = Depends(get_current_user)):
    existing_tokens = await db.users.find_one(
        {"_id": ObjectId(user["id"])},
        {"push_tokens": 1}
    )
    tokens = existing_tokens.get("push_tokens", []) if existing_tokens else []

    token_exists = any(t.get("token") == data.token for t in tokens)
    if not token_exists:
        tokens.append({
            "token": data.token,
            "platform": data.platform,
            "device_name": data.device_name,
            "registered_at": datetime.now(timezone.utc),
        })
        await db.users.update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": {"push_tokens": tokens}}
        )

    return {"message": "Token registered"}


# ============ STARTUP / SHUTDOWN ============

@app.on_event("startup")
async def startup():
    logger.info("Starting up Routine Management API...")

    await db.users.create_index("email", unique=True)
    await db.routines.create_index([("user_id", 1)])
    await db.routine_item_templates.create_index([("user_id", 1), ("routine_id", 1)])
    await db.scheduled_item_instances.create_index([("user_id", 1), ("date", 1)])
    await db.scheduled_item_instances.create_index([("user_id", 1), ("template_item_id", 1), ("date", 1), ("instance_index", 1)])
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "preferred_language": "en",
            "theme_mode": "system",
            "notifications_enabled": True,
            "reminder_times": [],
            "push_tokens": [],
            "created_at": datetime.now(timezone.utc),
        })
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated: {admin_email}")

    logger.info("Startup complete.")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
