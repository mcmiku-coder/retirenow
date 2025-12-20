#!/usr/bin/env python3
"""
Backend API Testing for "quit?" Retirement Planning App
Tests authentication, life expectancy calculation, and health endpoints
"""

import requests
import json
import sys
from datetime import datetime
import os

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BASE_URL = get_backend_url()
if not BASE_URL:
    print("ERROR: Could not get REACT_APP_BACKEND_URL from frontend/.env")
    sys.exit(1)

print(f"Testing backend at: {BASE_URL}")

# Test data
TEST_EMAIL = "retirement.tester@example.com"
TEST_PASSWORD = "SecureRetirement2025!"

class BackendTester:
    def __init__(self):
        self.token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details
        })
    
    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = requests.get(f"{BASE_URL}/api/health", timeout=10)
            if response.status_code == 200:
                self.log_result("Health Check", True, "Health endpoint responding")
                return True
            else:
                self.log_result("Health Check", False, f"Unexpected status code: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_result("Health Check", False, f"Request failed: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        try:
            payload = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            response = requests.post(
                f"{BASE_URL}/api/auth/register",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'email' in data:
                    self.token = data['token']
                    self.log_result("User Registration", True, "Registration successful", f"Email: {data['email']}")
                    return True
                else:
                    self.log_result("User Registration", False, "Missing token or email in response", str(data))
                    return False
            elif response.status_code == 400:
                # User might already exist, try to continue with login
                self.log_result("User Registration", True, "User already exists (expected)", response.text)
                return True
            else:
                self.log_result("User Registration", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result("User Registration", False, f"Request failed: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test user login endpoint"""
        try:
            payload = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'email' in data:
                    self.token = data['token']
                    self.log_result("User Login", True, "Login successful", f"Email: {data['email']}")
                    return True
                else:
                    self.log_result("User Login", False, "Missing token or email in response", str(data))
                    return False
            else:
                self.log_result("User Login", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result("User Login", False, f"Request failed: {str(e)}")
            return False
    
    def test_life_expectancy_api(self):
        """Test life expectancy calculation endpoint"""
        if not self.token:
            self.log_result("Life Expectancy API", False, "No authentication token available")
            return False
            
        try:
            payload = {
                "birth_date": "1980-06-15",
                "gender": "male"
            }
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/life-expectancy",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['life_expectancy_years', 'retirement_legal_date', 'theoretical_death_date']
                
                if all(field in data for field in required_fields):
                    # Validate data types and values
                    if isinstance(data['life_expectancy_years'], (int, float)) and data['life_expectancy_years'] > 0:
                        self.log_result("Life Expectancy API", True, "Life expectancy calculation successful", 
                                      f"Years remaining: {data['life_expectancy_years']:.1f}, Death date: {data['theoretical_death_date']}")
                        return True
                    else:
                        self.log_result("Life Expectancy API", False, "Invalid life expectancy value", str(data))
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Life Expectancy API", False, f"Missing required fields: {missing}", str(data))
                    return False
            else:
                self.log_result("Life Expectancy API", False, f"Status code: {response.status_code}", response.text)
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result("Life Expectancy API", False, f"Request failed: {str(e)}")
            return False
    
    def test_invalid_authentication(self):
        """Test API with invalid token"""
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": "Bearer invalid_token_12345"
            }
            
            payload = {
                "birth_date": "1980-06-15",
                "gender": "male"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/life-expectancy",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result("Invalid Authentication", True, "Correctly rejected invalid token")
                return True
            else:
                self.log_result("Invalid Authentication", False, f"Expected 401, got {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result("Invalid Authentication", False, f"Request failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("BACKEND API TESTING - 'quit?' Retirement Planning App")
        print("=" * 60)
        
        # Test health check first
        health_ok = self.test_health_check()
        
        # Test authentication flow
        reg_ok = self.test_user_registration()
        login_ok = self.test_user_login()
        
        # Test protected endpoints
        life_exp_ok = self.test_life_expectancy_api()
        
        # Test security
        auth_security_ok = self.test_invalid_authentication()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        
        if passed_tests == total_tests:
            print("\n🎉 ALL TESTS PASSED! Backend API is working correctly.")
            return True
        else:
            print(f"\n⚠️  {total_tests - passed_tests} test(s) failed. See details above.")
            
            # Show failed tests
            failed_tests = [r for r in self.test_results if not r['success']]
            if failed_tests:
                print("\nFAILED TESTS:")
                for test in failed_tests:
                    print(f"  - {test['test']}: {test['message']}")
            
            return False

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)