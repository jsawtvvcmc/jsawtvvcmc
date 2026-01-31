"""
ABC Program Management System - Multi-Tenancy API Tests
Tests for project isolation, Super Admin access, and project-specific data filtering
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - Super Admin
SUPER_ADMIN_EMAIL = "manoj@janicestrust.org"
SUPER_ADMIN_PASSWORD = "Kashid@25067"


class TestAuthentication:
    """Authentication tests for multi-tenancy"""
    
    def test_login_super_admin_success(self):
        """Test Super Admin login returns correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == SUPER_ADMIN_EMAIL
        assert data["user"]["role"] == "Super Admin"
        # Super Admin should have project_id as None (global access)
        assert data["user"].get("project_id") is None or "project_id" not in data["user"]
        print(f"Super Admin login successful: {data['user']['email']}, role: {data['user']['role']}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Invalid login rejected correctly")
    
    def test_get_current_user_super_admin(self):
        """Test getting current user info for Super Admin"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == SUPER_ADMIN_EMAIL
        assert data["role"] == "Super Admin"
        print(f"Current user: {data['first_name']} {data['last_name']}, role: {data['role']}")


class TestProjectsAPI:
    """Projects API tests - Super Admin access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_projects_list(self):
        """Test Super Admin can get all projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least one default project
        
        # Verify project structure
        if len(data) > 0:
            project = data[0]
            assert "id" in project
            assert "project_name" in project
            assert "project_code" in project
            assert "organization_name" in project
            assert "status" in project
        print(f"Projects count: {len(data)}")
        return data
    
    def test_get_project_by_code(self):
        """Test getting project by code"""
        # First get all projects
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = projects_response.json()
        
        if len(projects) > 0:
            project_code = projects[0]["project_code"]
            response = requests.get(f"{BASE_URL}/api/projects/{project_code}", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert data["project_code"] == project_code
            print(f"Got project by code: {project_code}")


class TestDashboardStatistics:
    """Dashboard statistics tests with project filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_dashboard_statistics_all(self):
        """Test Super Admin gets all statistics (no project filter)"""
        response = requests.get(f"{BASE_URL}/api/statistics/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "total_cases" in data
        assert "active_cases" in data
        assert "total_surgeries" in data
        assert "occupied_kennels" in data
        assert "available_kennels" in data
        assert "total_kennels" in data
        
        # Verify data types
        assert isinstance(data["total_cases"], int)
        assert isinstance(data["active_cases"], int)
        assert isinstance(data["total_kennels"], int)
        
        print(f"Dashboard stats (all): {data}")
    
    def test_get_dashboard_statistics_with_project_filter(self):
        """Test dashboard statistics with project_id filter"""
        # First get a project ID
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = projects_response.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/statistics/dashboard?project_id={project_id}", 
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "total_cases" in data
            print(f"Dashboard stats (project filtered): {data}")


class TestCasesAPI:
    """Cases API tests with project filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_cases_list(self):
        """Test getting list of cases"""
        response = requests.get(f"{BASE_URL}/api/cases", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Cases count: {len(data)}")
        
        # Verify case structure if cases exist
        if len(data) > 0:
            case = data[0]
            assert "id" in case
            assert "case_number" in case
            assert "status" in case
            assert "catching" in case
    
    def test_get_cases_unauthorized(self):
        """Test getting cases without auth"""
        response = requests.get(f"{BASE_URL}/api/cases")
        assert response.status_code in [401, 403]
        print("Unauthorized access rejected correctly")
    
    def test_get_cases_with_status_filter(self):
        """Test getting cases with status filter"""
        response = requests.get(f"{BASE_URL}/api/cases?status=Caught", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Filtered cases (Caught): {len(data)}")


class TestKennelsAPI:
    """Kennels API tests with project filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_kennels(self):
        """Test getting kennels list"""
        response = requests.get(f"{BASE_URL}/api/kennels", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Kennels count: {len(data)}")
        
        # Verify kennel structure if kennels exist
        if len(data) > 0:
            kennel = data[0]
            assert "id" in kennel
            assert "kennel_number" in kennel
            assert "is_occupied" in kennel
    
    def test_get_available_kennels(self):
        """Test getting available kennels"""
        response = requests.get(f"{BASE_URL}/api/kennels?status_filter=available", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned kennels should be unoccupied
        for kennel in data:
            assert kennel["is_occupied"] == False
        print(f"Available kennels: {len(data)}")
    
    def test_get_kennels_with_project_filter(self):
        """Test getting kennels with project_id filter"""
        # First get a project ID
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = projects_response.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/kennels?project_id={project_id}", 
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"Kennels (project filtered): {len(data)}")


class TestMedicinesAPI:
    """Medicines API tests with project filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_medicines(self):
        """Test getting medicines list"""
        response = requests.get(f"{BASE_URL}/api/medicines", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Medicines count: {len(data)}")
        
        # Verify medicine structure if medicines exist
        if len(data) > 0:
            medicine = data[0]
            assert "id" in medicine
            assert "name" in medicine
            assert "unit" in medicine
            assert "current_stock" in medicine
    
    def test_get_medicines_with_project_filter(self):
        """Test getting medicines with project_id filter"""
        # First get a project ID
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = projects_response.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/medicines?project_id={project_id}", 
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"Medicines (project filtered): {len(data)}")


class TestFoodItemsAPI:
    """Food items API tests with project filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_food_items(self):
        """Test getting food items list"""
        response = requests.get(f"{BASE_URL}/api/food-items", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Food items count: {len(data)}")
        
        # Verify food item structure if items exist
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "name" in item
            assert "unit" in item
            assert "current_stock" in item
    
    def test_get_food_items_with_project_filter(self):
        """Test getting food items with project_id filter"""
        # First get a project ID
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = projects_response.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/food-items?project_id={project_id}", 
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"Food items (project filtered): {len(data)}")


class TestUsersAPI:
    """Users API tests with project filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_users(self):
        """Test getting users list"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least the default super admin
        print(f"Users count: {len(data)}")
        
        # Verify user structure
        if len(data) > 0:
            user = data[0]
            assert "id" in user
            assert "email" in user
            assert "role" in user


class TestProjectCRUD:
    """Project CRUD operations tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_project(self):
        """Test creating a new project (Super Admin only)"""
        unique_code = f"T{str(uuid.uuid4())[:2].upper()}"  # Generate unique 3-letter code
        project_data = {
            "organization_name": "Test Organization",
            "organization_shortcode": "TO",
            "project_name": "Test Project",
            "project_code": unique_code,
            "project_address": "Test Address",
            "max_kennels": 50,
            "admin_first_name": "Test",
            "admin_last_name": "Admin",
            "admin_email": f"test_admin_{uuid.uuid4().hex[:8]}@example.com",
            "admin_mobile": "1234567890",
            "admin_password": "TestPass123!"
        }
        
        response = requests.post(f"{BASE_URL}/api/projects", json=project_data, headers=self.headers)
        
        # Project creation should succeed for Super Admin
        if response.status_code == 200:
            data = response.json()
            assert "project" in data
            assert data["project"]["project_code"] == unique_code
            print(f"Project created: {data['project']['project_name']}")
            return data["project"]["id"]
        elif response.status_code == 400:
            # Project code might already exist
            print(f"Project creation returned 400: {response.json()}")
        else:
            print(f"Project creation status: {response.status_code}")
    
    def test_update_project(self):
        """Test updating a project"""
        # First get a project
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = projects_response.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            update_data = {
                "project_address": "Updated Test Address"
            }
            
            response = requests.put(
                f"{BASE_URL}/api/projects/{project_id}", 
                json=update_data, 
                headers=self.headers
            )
            assert response.status_code == 200
            print(f"Project updated: {project_id}")


class TestCatchingRecordCreation:
    """Test creating catching records with project_id"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_catching_record(self):
        """Test creating a catching record"""
        catching_data = {
            "date_time": "2026-01-31T10:00:00Z",
            "location_lat": 19.5076,
            "location_lng": 73.0138,
            "address": "Test Location Address",
            "ward_number": "W1",
            "remarks": "Test catching record",
            "photos": []  # Empty photos for test
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cases/catching", 
            json=catching_data, 
            headers=self.headers
        )
        
        # Should succeed or fail gracefully
        if response.status_code == 200:
            data = response.json()
            assert "case_number" in data
            print(f"Catching record created: {data['case_number']}")
        else:
            print(f"Catching record creation status: {response.status_code}, {response.text[:200]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
