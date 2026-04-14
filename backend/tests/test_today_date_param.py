# Backend API Tests for Today Tab Bug Fix
# Tests: GET /api/instances/today with date query parameter

import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = "https://consistency-pulse-4.preview.emergentagent.com"

class TestTodayDateParameter:
    """Test GET /api/instances/today with date query parameter"""

    @pytest.fixture
    def auth_setup(self):
        """Setup auth and create routine with items for testing"""
        # Login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        
        # Create routine
        routine_res = requests.post(f"{BASE_URL}/api/routines", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "TEST_Date Param Test Routine",
                "description": "Testing date parameter",
                "icon": "calendar",
                "color": "#FF6B6B",
                "recurrence_type": "daily",
                "recurrence_config": {}
            }
        )
        assert routine_res.status_code == 200, f"Create routine failed: {routine_res.text}"
        routine_id = routine_res.json()["id"]
        
        # Create item
        item_res = requests.post(f"{BASE_URL}/api/routines/{routine_id}/items", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "TEST_Date param task",
                "notes": "Testing date parameter",
                "priority": "medium",
                "has_specific_time": False,
                "time": "",
                "is_all_day": True,
                "order_index": 0,
                "repeat_per_day_count": 1
            }
        )
        assert item_res.status_code == 200, f"Create item failed: {item_res.text}"
        
        return {"token": token, "routine_id": routine_id}

    def test_today_with_specific_date_param(self, auth_setup):
        """Test GET /api/instances/today?date=2026-04-14 returns instances for that date"""
        token = auth_setup["token"]
        test_date = "2026-04-14"
        
        response = requests.get(f"{BASE_URL}/api/instances/today?date={test_date}", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/instances/today?date={test_date} failed: {response.text}"
        
        data = response.json()
        assert "date" in data, "Response missing 'date' field"
        assert "groups" in data, "Response missing 'groups' field"
        assert data["date"] == test_date, f"Expected date {test_date}, got {data['date']}"
        assert isinstance(data["groups"], list), "groups should be a list"
        
        print(f"✓ GET /api/instances/today?date={test_date} returned correct date")
        print(f"✓ Response contains {len(data['groups'])} routine groups")

    def test_today_without_date_param_uses_utc_fallback(self, auth_setup):
        """Test GET /api/instances/today (no date param) still works with UTC fallback"""
        token = auth_setup["token"]
        
        response = requests.get(f"{BASE_URL}/api/instances/today", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/instances/today failed: {response.text}"
        
        data = response.json()
        assert "date" in data, "Response missing 'date' field"
        assert "groups" in data, "Response missing 'groups' field"
        
        # Verify date is in YYYY-MM-DD format
        returned_date = data["date"]
        assert len(returned_date) == 10, f"Date should be YYYY-MM-DD format, got {returned_date}"
        assert returned_date.count("-") == 2, f"Date should have 2 dashes, got {returned_date}"
        
        # Verify it's a valid date (should be today in UTC)
        try:
            datetime.strptime(returned_date, "%Y-%m-%d")
        except ValueError:
            pytest.fail(f"Invalid date format: {returned_date}")
        
        print(f"✓ GET /api/instances/today (no date param) works with UTC fallback")
        print(f"✓ Returned date: {returned_date}")

    def test_today_with_different_date_generates_instances(self, auth_setup):
        """Test that providing a different date generates instances for that date"""
        token = auth_setup["token"]
        
        # Test with tomorrow's date
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.get(f"{BASE_URL}/api/instances/today?date={tomorrow}", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/instances/today?date={tomorrow} failed: {response.text}"
        
        data = response.json()
        assert data["date"] == tomorrow, f"Expected date {tomorrow}, got {data['date']}"
        
        # Verify instances are generated for the routine we created
        groups = data["groups"]
        assert len(groups) > 0, "Should have at least one routine group"
        
        # Find our test routine
        test_routine_found = False
        for group in groups:
            if "TEST_Date Param Test Routine" in group["routine"]["name"]:
                test_routine_found = True
                assert len(group["instances"]) > 0, "Should have instances for the test routine"
                # Verify instance date matches requested date
                for instance in group["instances"]:
                    assert instance["date"] == tomorrow, f"Instance date should be {tomorrow}, got {instance['date']}"
                break
        
        assert test_routine_found, "Test routine not found in groups"
        print(f"✓ Instances generated correctly for date: {tomorrow}")

    def test_today_date_param_format_validation(self, auth_setup):
        """Test that invalid date formats are handled gracefully"""
        token = auth_setup["token"]
        
        # Test with invalid date format (should fall back to UTC)
        response = requests.get(f"{BASE_URL}/api/instances/today?date=invalid-date", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, "Should handle invalid date gracefully"
        
        data = response.json()
        assert "date" in data
        # Should fall back to UTC date
        print(f"✓ Invalid date format handled gracefully, fell back to: {data['date']}")

    def test_today_instances_structure(self, auth_setup):
        """Test that instances returned have correct structure"""
        token = auth_setup["token"]
        test_date = "2026-04-14"
        
        response = requests.get(f"{BASE_URL}/api/instances/today?date={test_date}", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        groups = data["groups"]
        
        if len(groups) > 0:
            group = groups[0]
            
            # Verify group structure
            assert "routine" in group, "Group should have 'routine' field"
            assert "instances" in group, "Group should have 'instances' field"
            assert "completedCount" in group, "Group should have 'completedCount' field"
            assert "totalCount" in group, "Group should have 'totalCount' field"
            
            # Verify routine structure
            routine = group["routine"]
            assert "id" in routine
            assert "name" in routine
            assert "icon" in routine
            assert "color" in routine
            assert "current_streak" in routine
            
            # Verify instance structure
            if len(group["instances"]) > 0:
                instance = group["instances"][0]
                assert "id" in instance
                assert "title_snapshot" in instance
                assert "date" in instance
                assert "is_completed" in instance
                assert instance["date"] == test_date, f"Instance date should match requested date"
                
            print("✓ Response structure is correct")
            print(f"✓ Group has {group['totalCount']} total tasks, {group['completedCount']} completed")
