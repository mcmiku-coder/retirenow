import http.client
import json
import uuid
import time
import sys

def test_registration():
    conn = http.client.HTTPConnection("localhost", 8000)
    
    # generate random email
    email = f"test_{uuid.uuid4()}@example.com"
    password = "TestPassword123!"
    
    print(f"Testing registration with {email}...")
    
    headers = {"Content-type": "application/json"}
    payload = json.dumps({"email": email, "password": password})
    
    try:
        # 1. Health check
        conn.request("GET", "/api/health")
        resp = conn.getresponse()
        print(f"Health check: {resp.status} {resp.reason}")
        if resp.status != 200:
            print("Backend not healthy")
            return False
            
        resp.read() # consume body

        # 2. Register
        conn.request("POST", "/api/auth/register", payload, headers)
        resp = conn.getresponse()
        data = resp.read().decode()
        
        print(f"Register status: {resp.status}")
        print(f"Register response: {data}")
        
        if resp.status != 200:
            print("Registration failed")
            return False
            
        token_data = json.loads(data)
        if "token" not in token_data:
            print("No token in response")
            return False
            
        # 3. Login
        print("Testing login...")
        conn.request("POST", "/api/auth/login", payload, headers)
        resp = conn.getresponse()
        data = resp.read().decode()
        
        print(f"Login status: {resp.status}")
        
        if resp.status != 200:
            print("Login failed")
            return False
            
        print("SUCCESS: Backend registration and login working.")
        return True
        
    except Exception as e:
        print(f"Test failed for unexpected reason: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = False
    for i in range(5):
        try:
            success = test_registration()
            if success:
                break
        except ConnectionRefusedError:
            print("Connection refused, retrying...")
            time.sleep(2)
            
    if not success:
        sys.exit(1)
