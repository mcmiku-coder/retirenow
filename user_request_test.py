#!/usr/bin/env python3
"""
Specific Backend API Tests as requested by user
Testing exact endpoints and data from the review request
"""

import requests
import json
import sys

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
print(f"Testing backend at: {BASE_URL}")

def test_user_specific_requests():
    """Test the exact requests from the user's review"""
    
    print("\n" + "="*60)
    print("TESTING USER-REQUESTED ENDPOINTS")
    print("="*60)
    
    # 1. Health Check
    print("\n1. Testing GET /api/health")
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        health_ok = response.status_code == 200
    except Exception as e:
        print(f"   ERROR: {e}")
        health_ok = False
    
    # 2. User Registration (Note: endpoint is /api/auth/register, not /api/register)
    print("\n2. Testing POST /api/auth/register (actual endpoint)")
    print("   Note: User requested /api/register but actual endpoint is /api/auth/register")
    try:
        payload = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: Email={data.get('email')}, Token received={bool(data.get('token'))}")
            token = data.get('token')
            reg_ok = True
        elif response.status_code == 400:
            print(f"   Response: {response.json()} (User already exists)")
            reg_ok = True
            token = None
        else:
            print(f"   Response: {response.text}")
            reg_ok = False
            token = None
    except Exception as e:
        print(f"   ERROR: {e}")
        reg_ok = False
        token = None
    
    # 3. User Login (Note: endpoint is /api/auth/login, not /api/login)
    print("\n3. Testing POST /api/auth/login (actual endpoint)")
    print("   Note: User requested /api/login but actual endpoint is /api/auth/login")
    try:
        payload = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: Email={data.get('email')}, Token received={bool(data.get('token'))}")
            token = data.get('token')
            login_ok = True
        else:
            print(f"   Response: {response.text}")
            login_ok = False
    except Exception as e:
        print(f"   ERROR: {e}")
        login_ok = False
    
    # 4. Life Expectancy API with exact user data
    print("\n4. Testing POST /api/life-expectancy")
    if token:
        try:
            payload = {
                "birth_date": "1980-06-15",
                "gender": "male"
            }
            # Note: User mentioned country: "Switzerland" but API doesn't use country parameter
            print("   Note: User mentioned country 'Switzerland' but API uses birth year from CSV data")
            
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.post(f"{BASE_URL}/api/life-expectancy", json=payload, headers=headers, timeout=10)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Response:")
                print(f"     Life expectancy years: {data.get('life_expectancy_years')}")
                print(f"     Retirement legal date: {data.get('retirement_legal_date')}")
                print(f"     Theoretical death date: {data.get('theoretical_death_date')}")
                life_exp_ok = True
            else:
                print(f"   Response: {response.text}")
                life_exp_ok = False
        except Exception as e:
            print(f"   ERROR: {e}")
            life_exp_ok = False
    else:
        print("   SKIPPED: No authentication token available")
        life_exp_ok = False
    
    # Summary
    print("\n" + "="*60)
    print("USER REQUEST SUMMARY")
    print("="*60)
    
    results = [
        ("Health Check (/api/health)", health_ok),
        ("User Registration (/api/auth/register)", reg_ok),
        ("User Login (/api/auth/login)", login_ok),
        ("Life Expectancy API (/api/life-expectancy)", life_exp_ok)
    ]
    
    for test_name, success in results:
        status = "✅ WORKING" if success else "❌ FAILED"
        print(f"{status} {test_name}")
    
    all_working = all(success for _, success in results)
    
    if all_working:
        print("\n🎉 ALL REQUESTED ENDPOINTS ARE WORKING!")
    else:
        print("\n⚠️  Some endpoints have issues - see details above")
    
    print("\nIMPORTANT NOTES:")
    print("- Authentication endpoints are at /api/auth/* not /api/*")
    print("- Life expectancy API doesn't use 'country' parameter - uses birth year from CSV data")
    print("- All endpoints require '/api' prefix as configured in the backend")
    
    return all_working

if __name__ == "__main__":
    success = test_user_specific_requests()
    sys.exit(0 if success else 1)