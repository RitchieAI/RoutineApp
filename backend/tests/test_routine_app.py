# Backend API Tests for Routine Management App
# Tests: Auth (register, login, me), Routines CRUD, Items CRUD, Instances (today, toggle), Settings

import pytest
import requests
import os
from datetime import datetime

# Use the public URL from frontend env
BASE_URL = "https://consistency-pulse-4.preview.emergentagent.com"

class TestAuth:
    """Authentication endpoint tests"""

    def test_login_success(self):
        """Test login with admin credentials (email/password auth)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert "refresh_token" in data, "Missing refresh_token"
        assert "user" in data, "Missing user object"
        assert data["user"]["email"] == "admin@example.com"
        assert data["user"]["name"] == "Admin"
        print("✓ Email/password login successful with admin credentials")

    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, "Should return 401 for invalid credentials"
        print("✓ Login correctly rejects invalid credentials")

    def test_register_new_user(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        test_email = f"test_user_{timestamp}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test User"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == test_email.lower()  # Backend normalizes to lowercase
        print(f"✓ User registration successful: {data['user']['email']}")

    def test_register_duplicate_email(self):
        """Test registration with existing email"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "admin@example.com",
            "password": "testpass123",
            "name": "Duplicate"
        })
        assert response.status_code == 400, "Should return 400 for duplicate email"
        print("✓ Registration correctly rejects duplicate email")

    def test_get_me_with_token(self):
        """Test GET /api/auth/me with valid token"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        token = login_res.json()["access_token"]
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"GET /me failed: {response.text}"
        
        data = response.json()
        assert data["email"] == "admin@example.com"
        assert "id" in data
        print("✓ GET /api/auth/me works with valid token")

    def test_get_me_without_token(self):
        """Test GET /api/auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, "Should return 401 without token"
        print("✓ GET /api/auth/me correctly rejects requests without token")


class TestGoogleAuth:
    """Google OAuth integration tests"""

    def test_google_callback_endpoint_exists(self):
        """Test POST /api/auth/google-callback endpoint exists"""
        # Test with invalid session_id to verify endpoint exists and error handling
        response = requests.post(f"{BASE_URL}/api/auth/google-callback", json={
            "session_id": "invalid_test_session_id_12345"
        })
        # Should return 401 for invalid session, not 404 (endpoint exists)
        assert response.status_code in [401, 502], f"Expected 401 or 502, got {response.status_code}: {response.text}"
        print("✓ POST /api/auth/google-callback endpoint exists and handles invalid session_id")

    def test_google_callback_missing_session_id(self):
        """Test google-callback with missing session_id"""
        response = requests.post(f"{BASE_URL}/api/auth/google-callback", json={})
        # Should return 422 for validation error (missing required field)
        assert response.status_code == 422, f"Expected 422 for missing session_id, got {response.status_code}"
        print("✓ Google callback correctly validates required session_id field")

    def test_email_password_login_still_works(self):
        """Verify existing email/password login still works after Google OAuth addition"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Email/password login broken: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@example.com"
        print("✓ Email/password login still works correctly (not broken by Google OAuth addition)")


class TestRoutines:
    """Routines CRUD tests"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        return response.json()["access_token"]

    def test_create_routine(self, auth_token):
        """Test POST /api/routines to create a routine"""
        response = requests.post(f"{BASE_URL}/api/routines", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "name": "TEST_Morning Routine",
                "description": "My morning routine",
                "icon": "sun",
                "color": "#FF6B6B",
                "recurrence_type": "daily",
                "recurrence_config": {}
            }
        )
        assert response.status_code == 200, f"Create routine failed: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_Morning Routine"
        assert data["description"] == "My morning routine"
        assert data["icon"] == "sun"
        assert data["color"] == "#FF6B6B"
        assert data["recurrence_type"] == "daily"
        assert data["is_active"] == True
        assert data["current_streak"] == 0
        assert "id" in data
        print(f"✓ Routine created successfully: {data['id']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/routines/{data['id']}", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        assert get_response.json()["name"] == "TEST_Morning Routine"
        print("✓ Routine persisted correctly in database")

    def test_get_routines(self, auth_token):
        """Test GET /api/routines to list routines"""
        response = requests.get(f"{BASE_URL}/api/routines", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get routines failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ GET /api/routines returned {len(data)} routines")

    def test_update_routine(self, auth_token):
        """Test PUT /api/routines/{id} to update a routine"""
        # Create a routine first
        create_res = requests.post(f"{BASE_URL}/api/routines", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "name": "TEST_Update Test",
                "description": "Original",
                "icon": "list",
                "color": "#0047FF",
                "recurrence_type": "daily",
                "recurrence_config": {}
            }
        )
        routine_id = create_res.json()["id"]
        
        # Update it
        update_res = requests.put(f"{BASE_URL}/api/routines/{routine_id}", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"name": "TEST_Updated Name", "description": "Updated description"}
        )
        assert update_res.status_code == 200, f"Update failed: {update_res.text}"
        
        data = update_res.json()
        assert data["name"] == "TEST_Updated Name"
        assert data["description"] == "Updated description"
        print("✓ Routine updated successfully")
        
        # Verify with GET
        get_res = requests.get(f"{BASE_URL}/api/routines/{routine_id}", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_res.json()["name"] == "TEST_Updated Name"
        print("✓ Update persisted correctly")

    def test_delete_routine(self, auth_token):
        """Test DELETE /api/routines/{id}"""
        # Create a routine
        create_res = requests.post(f"{BASE_URL}/api/routines", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "name": "TEST_Delete Test",
                "description": "",
                "icon": "list",
                "color": "#0047FF",
                "recurrence_type": "daily",
                "recurrence_config": {}
            }
        )
        routine_id = create_res.json()["id"]
        
        # Delete it
        delete_res = requests.delete(f"{BASE_URL}/api/routines/{routine_id}", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_res.status_code == 200, f"Delete failed: {delete_res.text}"
        print("✓ Routine deleted successfully")
        
        # Verify it's gone
        get_res = requests.get(f"{BASE_URL}/api/routines/{routine_id}", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_res.status_code == 404, "Should return 404 for deleted routine"
        print("✓ Deleted routine no longer accessible")


class TestItems:
    """Routine item template tests"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        return response.json()["access_token"]

    @pytest.fixture
    def routine_id(self, auth_token):
        """Create a test routine"""
        response = requests.post(f"{BASE_URL}/api/routines", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "name": "TEST_Item Test Routine",
                "description": "",
                "icon": "list",
                "color": "#0047FF",
                "recurrence_type": "daily",
                "recurrence_config": {}
            }
        )
        return response.json()["id"]

    def test_create_item(self, auth_token, routine_id):
        """Test POST /api/routines/{id}/items"""
        response = requests.post(f"{BASE_URL}/api/routines/{routine_id}/items", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Drink water",
                "notes": "8 glasses",
                "priority": "high",
                "has_specific_time": True,
                "time": "08:00",
                "is_all_day": False,
                "order_index": 0,
                "repeat_per_day_count": 3
            }
        )
        assert response.status_code == 200, f"Create item failed: {response.text}"
        
        data = response.json()
        assert data["title"] == "TEST_Drink water"
        assert data["notes"] == "8 glasses"
        assert data["priority"] == "high"
        assert data["time"] == "08:00"
        assert data["repeat_per_day_count"] == 3
        assert "id" in data
        print(f"✓ Item created successfully: {data['id']}")

    def test_get_items(self, auth_token, routine_id):
        """Test GET /api/routines/{id}/items"""
        # Create an item first
        requests.post(f"{BASE_URL}/api/routines/{routine_id}/items", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Test Item",
                "notes": "",
                "priority": "medium",
                "has_specific_time": False,
                "time": "",
                "is_all_day": True,
                "order_index": 0,
                "repeat_per_day_count": 1
            }
        )
        
        # Get items
        response = requests.get(f"{BASE_URL}/api/routines/{routine_id}/items", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get items failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ GET items returned {len(data)} items")


class TestInstances:
    """Instance generation and completion tests"""

    @pytest.fixture
    def auth_setup(self):
        """Setup auth and create routine with items"""
        # Login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        token = login_res.json()["access_token"]
        
        # Create routine
        routine_res = requests.post(f"{BASE_URL}/api/routines", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "TEST_Instance Test Routine",
                "description": "",
                "icon": "list",
                "color": "#0047FF",
                "recurrence_type": "daily",
                "recurrence_config": {}
            }
        )
        routine_id = routine_res.json()["id"]
        
        # Create item
        item_res = requests.post(f"{BASE_URL}/api/routines/{routine_id}/items", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "TEST_Morning task",
                "notes": "",
                "priority": "medium",
                "has_specific_time": False,
                "time": "",
                "is_all_day": True,
                "order_index": 0,
                "repeat_per_day_count": 1
            }
        )
        
        return {"token": token, "routine_id": routine_id}

    def test_get_today_instances(self, auth_setup):
        """Test GET /api/instances/today"""
        token = auth_setup["token"]
        
        response = requests.get(f"{BASE_URL}/api/instances/today", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Get today failed: {response.text}"
        
        data = response.json()
        assert "date" in data
        assert "groups" in data
        assert isinstance(data["groups"], list)
        print(f"✓ GET /api/instances/today returned {len(data['groups'])} routine groups")

    def test_toggle_instance(self, auth_setup):
        """Test PUT /api/instances/{id}/toggle"""
        token = auth_setup["token"]
        
        # Get today's instances
        today_res = requests.get(f"{BASE_URL}/api/instances/today", 
            headers={"Authorization": f"Bearer {token}"}
        )
        groups = today_res.json()["groups"]
        
        if len(groups) > 0 and len(groups[0]["instances"]) > 0:
            instance_id = groups[0]["instances"][0]["id"]
            
            # Toggle to completed
            toggle_res = requests.put(f"{BASE_URL}/api/instances/{instance_id}/toggle", 
                headers={"Authorization": f"Bearer {token}"},
                json={"is_completed": True}
            )
            assert toggle_res.status_code == 200, f"Toggle failed: {toggle_res.text}"
            
            data = toggle_res.json()
            assert data["is_completed"] == True
            assert data["completed_at"] is not None
            print("✓ Instance toggled to completed successfully")
            
            # Toggle back to incomplete
            toggle_back = requests.put(f"{BASE_URL}/api/instances/{instance_id}/toggle", 
                headers={"Authorization": f"Bearer {token}"},
                json={"is_completed": False}
            )
            assert toggle_back.json()["is_completed"] == False
            print("✓ Instance toggled back to incomplete")
        else:
            print("⚠ No instances available to test toggle")


class TestSettings:
    """Settings endpoint tests"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        return response.json()["access_token"]

    def test_get_settings(self, auth_token):
        """Test GET /api/settings"""
        response = requests.get(f"{BASE_URL}/api/settings", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get settings failed: {response.text}"
        
        data = response.json()
        assert "language" in data
        assert "theme_mode" in data
        assert "notifications_enabled" in data
        print("✓ GET /api/settings works")

    def test_update_settings(self, auth_token):
        """Test PUT /api/settings"""
        response = requests.put(f"{BASE_URL}/api/settings", 
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "language": "de",
                "theme_mode": "dark",
                "notifications_enabled": False
            }
        )
        assert response.status_code == 200, f"Update settings failed: {response.text}"
        
        data = response.json()
        assert data["language"] == "de"
        assert data["theme_mode"] == "dark"
        assert data["notifications_enabled"] == False
        print("✓ Settings updated successfully")
        
        # Verify persistence
        get_res = requests.get(f"{BASE_URL}/api/settings", 
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_res.json()["language"] == "de"
        print("✓ Settings persisted correctly")
