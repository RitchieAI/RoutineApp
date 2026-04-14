# Routinely - Routine Management App PRD

## Overview
A cross-platform mobile app (iOS/Android) built with Expo React Native for managing daily recurring routines. Helps users build consistency through streak tracking and task completion.

## Tech Stack
- **Frontend**: Expo SDK 54, React Native, expo-router (file-based routing)
- **Backend**: FastAPI (Python), Motor (async MongoDB driver)
- **Database**: MongoDB
- **Auth**: JWT-based (email/password) with bcrypt password hashing

## Core Features (V1)
1. **Authentication**: Register, Login, Logout, Forgot Password
2. **Routines CRUD**: Create, view, edit, delete routines with custom icons and colors
3. **Routine Item Templates**: Tasks within routines with priority, time, repeat count
4. **Today View (Primary)**: Daily instances generated from templates, grouped by routine with checkbox completion
5. **Streak System**: Auto-calculated streaks per routine (current + best)
6. **Settings**: Theme (light/dark/system), Language (EN/DE), Notifications toggle
7. **Localization**: Full German & English support

## Data Model
- `users` - Auth + preferences
- `routines` - User routines with recurrence config + streak data
- `routine_item_templates` - Task templates (NOT completion state)
- `scheduled_item_instances` - Daily generated instances with completion state

## Key Architecture Decisions
- Templates vs Instances separation (completion stored on instances, never templates)
- Idempotent instance generation (checks for existing before creating)
- Bearer token auth (not cookies) for mobile compatibility
- Optimistic UI updates for checkbox toggling

## Screens
- Auth: Login, Register, Forgot Password
- Main Tabs: Today (primary), Routines, Settings
- Detail: Routine Detail, Create/Edit Routine, Create/Edit Item

## Future Features (V2+)
- ~~Emergent-managed Google Social Login~~ ✅ Implemented
- Expo Push Notifications with reminders
- Analytics/habit insights
- Recurrence editor improvements
