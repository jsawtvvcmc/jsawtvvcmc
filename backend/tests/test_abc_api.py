"""
ABC Program Management System - Backend API Tests
Tests for authentication, cases, and reports functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "manoj@janicestrust.org"
TEST_PASSWORD = "Kashid@25067"


class TestHealthAndConfig:
    """Basic health and configuration tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "ABC Program" in data["message"]
        print(f"API Root: {data}")
    
    def test_config_endpoint(self):
        """Test system configuration endpoint"""
        response = requests.get(f"{BASE_URL}/api/config")
        assert response.status_code == 200
        data = response.json()
        assert "organization_name" in data
        assert "project_name" in data
        print(f"Config: {data}")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "Super User"
        print(f"Login successful: {data['user']['email']}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"Invalid login rejected: {data['detail']}")
    
    def test_login_invalid_password(self):
        """Test login with valid email but wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Wrong password rejected correctly")
    
    def test_get_current_user(self):
        """Test getting current user info with valid token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        assert "first_name" in data
        assert "last_name" in data
        print(f"Current user: {data['first_name']} {data['last_name']}")
    
    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": "Bearer invalid_token_here"
        })
        assert response.status_code == 401
        print("Invalid token rejected correctly")


class TestCasesAPI:
    """Cases API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
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
        return data
    
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
        print(f"Filtered cases count: {len(data)}")


class TestDashboardStatistics:
    """Dashboard statistics tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_dashboard_statistics(self):
        """Test getting dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/statistics/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_cases" in data
        assert "active_cases" in data
        assert "total_surgeries" in data
        assert "occupied_kennels" in data
        assert "available_kennels" in data
        print(f"Dashboard stats: {data}")


class TestKennelsAPI:
    """Kennels API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
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
    
    def test_get_available_kennels(self):
        """Test getting available kennels"""
        response = requests.get(f"{BASE_URL}/api/kennels?status_filter=available", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Available kennels: {len(data)}")


class TestMedicinesAPI:
    """Medicines API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
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


class TestFoodItemsAPI:
    """Food items API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
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


class TestUsersAPI:
    """Users API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_users(self):
        """Test getting users list"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least the default super user
        print(f"Users count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
