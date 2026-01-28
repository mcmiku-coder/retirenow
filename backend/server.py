from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import pandas as pd
import csv
import traceback
import requests
import secrets
from cryptography.fernet import Fernet

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

# Admin Secret Key - Change this in production!
ADMIN_SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY', 'quit-admin-2024-secret')

# Master Key Encryption - For encrypting user master keys in MongoDB
SERVER_ENCRYPTION_KEY = os.environ.get('SERVER_ENCRYPTION_KEY', '')
if not SERVER_ENCRYPTION_KEY:
    logger.warning("SERVER_ENCRYPTION_KEY not set! Master key encryption will fail.")
fernet = Fernet(SERVER_ENCRYPTION_KEY.encode()) if SERVER_ENCRYPTION_KEY else None

@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Global exception handler: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error": str(e)}
        )


# Load life expectancy data
life_expectancy_data = {
    'male': {},
    'female': {}
}

def load_life_expectancy_csv():
    """Load life expectancy CSV files into memory"""
    for gender, filename in [('male', 'men.csv'), ('female', 'women.csv')]:
        filepath = ROOT_DIR / filename
        with open(filepath, 'r') as f:
            reader = csv.reader(f, delimiter=';')
            header = next(reader)  # First row with ages
            ages = [int(age.strip()) for age in header[1:]]  # Skip first empty column
            
            data = {}
            for row in reader:
                birth_year = int(row[0].strip())
                years_left = [float(val.strip()) for val in row[1:]]
                data[birth_year] = dict(zip(ages, years_left))
            
            life_expectancy_data[gender] = data

load_life_expectancy_csv()

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class VerifyRequest(BaseModel):
    token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class TokenResponse(BaseModel):
    token: Optional[str] = None
    email: str
    role: Optional[str] = None  # NEW: User role ("user" or "admin")
    message: Optional[str] = None
    master_key: Optional[str] = None  # Added for master key encryption

class LifeExpectancyRequest(BaseModel):
    birth_date: str  # Format: YYYY-MM-DD
    gender: str  # "male" or "female"

class LifeExpectancyResponse(BaseModel):
    life_expectancy_years: float
    retirement_legal_date: str
    theoretical_death_date: str

# Admin models
class AdminLoginRequest(BaseModel):
    admin_key: str

class AdminPromoteRequest(BaseModel):
    email: EmailStr
    admin_key: str  # Require admin key for security during transition

class AdminUserResponse(BaseModel):
    user_id: str
    email: str
    role: Optional[str] = "user"  # NEW: Show user role
    created_at: Optional[str] = None
    login_count: int = 0
    last_login: Optional[str] = None
    last_page_visited: Optional[str] = None
    deepest_page: Optional[str] = None
    last_ip: Optional[str] = None
    last_device_type: Optional[str] = None
    last_location: Optional[str] = None
    total_pages_viewed: int = 0
    is_verified: bool = False

class AdminStatsResponse(BaseModel):
    total_users: int
    users: List[AdminUserResponse]

# Analytics models
class PageVisitRequest(BaseModel):
    page_path: str
    session_id: Optional[str] = None

# Page navigation order (for determining "deepest" page)
PAGE_DEPTH_ORDER = [
    '/',
    '/information',
    '/personal-info',
    '/retirement-overview',
    '/income',
    '/costs',
    '/assets-savings',
    '/retirement-parameters',
    '/data-review',
    '/capital-setup',
    '/result'
]

def get_page_depth(page_path: str) -> int:
    """Get the depth/order of a page in the navigation flow"""
    try:
        return PAGE_DEPTH_ORDER.index(page_path)
    except ValueError:
        return -1  # Unknown page

# Auth helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_verification_token(email: str) -> str:
    """Create a short-lived token for email verification"""
    payload = {
        'email': email,
        'type': 'verification',
        'exp': datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_password_reset_token(email: str) -> str:
    """Create a short-lived token for password reset"""
    payload = {
        'email': email,
        'type': 'password_reset',
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)  # 1 hour expiry
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_master_key() -> str:
    """Generate a 256-bit master encryption key"""
    return secrets.token_hex(32)  # 32 bytes = 256 bits

def encrypt_master_key(master_key: str) -> str:
    """Encrypt master key with server secret"""
    if not fernet:
        raise Exception("Server encryption not configured")
    return fernet.encrypt(master_key.encode()).decode()

def decrypt_master_key(encrypted_key: str) -> str:
    """Decrypt master key with server secret"""
    if not fernet:
        raise Exception("Server encryption not configured")
    return fernet.decrypt(encrypted_key.encode()).decode()

def create_token(email: str) -> str:
    payload = {
        'email': email,
        'type': 'auth',
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # Ensure it's an auth token
        if payload.get('type') and payload.get('type') != 'auth':
             raise HTTPException(status_code=401, detail="Invalid token type")
        return payload['email']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Helper for IP Geolocation
def get_location_from_ip(ip_address: str) -> str:
    if not ip_address or ip_address == "127.0.0.1":
         return "Localhost"
    try:
        # Using ip-api.com (Free for non-commercial, 45req/min)
        response = requests.get(f"http://ip-api.com/json/{ip_address}?fields=country,city", timeout=3)
        if response.status_code == 200:
            data = response.json()
            return f"{data.get('city', 'Unknown')}, {data.get('country', 'Unknown')}"
    except Exception:
        pass
    return "Unknown"

def send_verification_email(to_email: str, token: str):
    # Brevo API Logic
    # We strip() to remove any accidental whitespace/newlines from the env var
    api_key = os.environ.get('BREVO_API_KEY', '').strip()
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    
    if not api_key:
        logger.warning("Brevo API Key not found, printing to console instead")
        mock_link = f"{frontend_url}/verify?token={token}"
        print(f"\n{'='*50}\nTo: {to_email}\nLink: {mock_link}\n{'='*50}\n")
        return

    try:
        verification_link = f"{frontend_url}/verify?token={token}"
        
        # Brevo API Endpoint
        # V3 endpoint for transactional emails
        url = "https://api.brevo.com/v3/smtp/email"
        
        # Headers
        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        }
        
        # Sender - must be verified in Brevo. Using SMTP_EMAIL as the sender.
        # Fallback to no-reply if empty (though Brevo might reject unverified senders)
        sender_email = os.environ.get('SMTP_EMAIL', 'no-reply@retirenow.com')
        
        payload = {
            "sender": {"name": "Can I Quit App", "email": sender_email},
            "to": [{"email": to_email}],
            "subject": "Verify your Can I Quit? account",
            "htmlContent": f"""
                <h1>Welcome to Can I Quit?</h1>
                <p>Please click the link below to verify your email address:</p>
                <p><a href="{verification_link}">Verify Email</a></p>
                <p>Or copy this link: {verification_link}</p>
                <p>This link expires in 24 hours.</p>
            """
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code in [200, 201, 202]:
            logger.info(f"Verification email sent to {to_email} via Brevo")
            # Force print for visibility in Render logs
            print(f"\n{'='*20} MANUAL VERIFICATION LINK {'='*20}", flush=True)
            print(f"DEBUG_LINK: {verification_link}", flush=True)
            print(f"{'='*60}\n", flush=True)
        else:
            logger.error(f"Brevo API Error: {response.status_code} - {response.text}")
            # Fallback to console print
            print(f"FAILED TO SEND EMAIL VIA BREVO: {response.text}")
            print(f"BACKUP LINK: {verification_link}")

    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        # Don't crash registration if email fails, but log it
        print(f"FAILED TO SEND EMAIL: {e}")
        # Print link as backup
        print(f"BACKUP LINK: {frontend_url}/verify?token={token}")

def send_password_reset_email(to_email: str, token: str):
    """Send password reset email via Brevo"""
    api_key = os.environ.get('BREVO_API_KEY', '').strip()
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    
    if not api_key:
        logger.warning("Brevo API Key not found, printing to console instead")
        mock_link = f"{frontend_url}/reset-password?token={token}"
        print(f"\n{'='*50}\nPassword Reset Link\nTo: {to_email}\nLink: {mock_link}\n{'='*50}\n")
        return

    try:
        reset_link = f"{frontend_url}/reset-password?token={token}"
        
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        }
        
        sender_email = os.environ.get('SMTP_EMAIL', 'no-reply@retirenow.com')
        
        payload = {
            "sender": {"name": "Can I Quit App", "email": sender_email},
            "to": [{"email": to_email}],
            "subject": "Reset your Can I Quit? password",
            "htmlContent": f"""
                <h1>Password Reset Request</h1>
                <p>You requested to reset your password for Can I Quit?</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_link}">Reset Password</a></p>
                <p>Or copy this link: {reset_link}</p>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            """
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code in [200, 201, 202]:
            logger.info(f"Password reset email sent to {to_email} via Brevo")
            print(f"\n{'='*20} MANUAL RESET LINK {'='*20}", flush=True)
            print(f"DEBUG_LINK: {reset_link}", flush=True)
            print(f"{'='*60}\n", flush=True)
        else:
            logger.error(f"Brevo API Error: {response.status_code} - {response.text}")
            print(f"FAILED TO SEND EMAIL VIA BREVO: {response.text}")
            print(f"BACKUP LINK: {reset_link}")

    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        print(f"FAILED TO SEND EMAIL: {e}")
        print(f"BACKUP LINK: {frontend_url}/reset-password?token={token}")

# Routes
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "OK", "message": "Backend is running"}

# Admin Routes
def verify_admin_key(admin_key: str) -> bool:
    """Verify the admin secret key (legacy - for transition only)"""
    return admin_key == ADMIN_SECRET_KEY

async def get_current_user_from_token(token: str):
    """Extract and verify user from JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get('email')
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.access.find_one({"email": email}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Middleware to require admin role"""
    token = credentials.credentials
    user = await get_current_user_from_token(token)
    
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user

@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    """Verify admin credentials and return success status"""
    if not verify_admin_key(request.admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return {"success": True, "message": "Admin access granted"}

@api_router.post("/admin/promote")
async def promote_user_to_admin(request: AdminPromoteRequest):
    """Promote an existing user to admin role (transition endpoint)"""
    # Verify admin key for security
    if not verify_admin_key(request.admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    # Find user
    user = await db.access.find_one({"email": request.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already admin
    if user.get("role") == "admin":
        return {"success": True, "message": "User is already an admin", "email": request.email}
    
    # Promote to admin
    result = await db.access.update_one(
        {"email": request.email},
        {"$set": {"role": "admin"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to promote user")
    
    logger.info(f"User promoted to admin: {request.email}")
    return {
        "success": True, 
        "message": "User promoted to admin successfully",
        "email": request.email,
        "role": "admin"
    }

@api_router.post("/admin/users", response_model=AdminStatsResponse)
async def get_all_users(admin_user: dict = Depends(require_admin)):
    """Get all registered users with analytics (admin only)"""
    try:
        # Get all users from the access collection
        users_cursor = db.access.find({}, {"_id": 0, "password": 0})
        users = await users_cursor.to_list(length=None)
        
        user_list = [
            AdminUserResponse(
                user_id=user.get("user_id", ""),
                email=user.get("email", ""),
                role=user.get("role", "user"),  # Include role
                created_at=user.get("created_at", None),
                login_count=user.get("login_count", 0),
                last_login=user.get("last_login", None),
                last_page_visited=user.get("last_page_visited", None),
                deepest_page=user.get("deepest_page", None),
                last_ip=user.get("last_ip", None),
                last_device_type=user.get("last_device_type", None),
                last_location=user.get("last_location", "Unknown"),
                total_pages_viewed=user.get("total_pages_viewed", 0),
                is_verified=user.get("is_verified", False)
            )
            for user in users
        ]
        
        return AdminStatsResponse(
            total_users=len(user_list),
            users=user_list
        )
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin_user: dict = Depends(require_admin)):
    """Delete a user by ID (admin only)"""
    try:
        # Delete from all collections
        result = await db.access.delete_one({"user_id": user_id})
        await db.login_events.delete_many({"user_id": user_id})
        await db.page_visits.delete_many({"user_id": user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
            
        logger.info(f"Admin {admin_user.get('email')} deleted user {user_id}")
        return {"success": True, "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@api_router.post("/admin/stats")
async def get_admin_stats(admin_user: dict = Depends(require_admin)):
    """Get admin statistics (admin only)"""
    try:
        # Count users
        total_users = await db.access.count_documents({})
        
        return {
            "total_users": total_users,
            "database": os.environ.get('DB_NAME', 'unknown')
        }
    except Exception as e:
        print(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@api_router.post("/admin/users/{user_id}/toggle-admin")
async def toggle_user_admin_role(user_id: str, admin_user: dict = Depends(require_admin)):
    """Toggle admin role for a user (admin only)"""
    try:
        # Find the target user
        target_user = await db.access.find_one({"user_id": user_id}, {"_id": 0})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Toggle role
        current_role = target_user.get("role", "user")
        new_role = "admin" if current_role == "user" else "user"
        
        # Update role
        result = await db.access.update_one(
            {"user_id": user_id},
            {"$set": {"role": new_role}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update role")
        
        logger.info(f"Admin {admin_user.get('email')} changed {target_user.get('email')} role from {current_role} to {new_role}")
        return {
            "success": True,
            "message": f"User role changed to {new_role}",
            "email": target_user.get("email"),
            "role": new_role
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling admin role: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserRegister, request: Request, background_tasks: BackgroundTasks):
    logger.info(f"Registration attempt for email: {user.email}")
    
    # Check if user exists
    existing = await db.access.find_one({"email": user.email}, {"_id": 0})
    if existing:
        logger.warning(f"Registration failed - email already exists: {user.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_pw = hash_password(user.password)
    current_time = datetime.now(timezone.utc).isoformat()
    
    # Resolve Location
    user_location = get_location_from_ip(request.client.host)

    user_doc = {
        "user_id": str(uuid.uuid4()),
        "email": user.email,
        "password": hashed_pw,
        "role": "user",  # NEW: Default role is "user", can be promoted to "admin"
        "created_at": current_time,
        "last_login": current_time,
        "login_count": 0,
        "last_ip": request.client.host,
        "last_location": user_location,
        "last_device_type": "Mobile" if "Mobile" in request.headers.get("User-Agent", "") else "Desktop",
        "total_pages_viewed": 0,
        "is_verified": False,  # New users unverified
        "master_encryption_key": None  # Will be set below
    }
    
    # Generate and encrypt master key
    try:
        master_key = generate_master_key()
        encrypted_master_key = encrypt_master_key(master_key)
        user_doc["master_encryption_key"] = encrypted_master_key
    except Exception as e:
        logger.error(f"Failed to generate master key: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize encryption")
    
    try:
        result = await db.access.insert_one(user_doc)
        logger.info(f"User registered successfully: {user.email}, inserted_id: {result.inserted_id}")
    except Exception as e:
        logger.error(f"Failed to insert user {user.email}: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to create user in database: {str(e)}")
    
    # Generate verification token
    verify_token_str = create_verification_token(user.email)
    
    # Send Email in Background
    # This prevents the UI from hitting a timeout while waiting for SMTP
    background_tasks.add_task(send_verification_email, user.email, verify_token_str)

    return TokenResponse(
        email=user.email, 
        message="Verification email sent (v2)",
        master_key=master_key  # Return master key to client
    )

@api_router.post("/auth/verify")
async def verify_email(request: VerifyRequest):
    """Verify email using token"""
    try:
        payload = jwt.decode(request.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('type') != 'verification':
            raise HTTPException(status_code=400, detail="Invalid token type")
        
        email = payload['email']
        
        # specific update to verify user
        result = await db.access.update_one(
            {"email": email},
            {"$set": {"is_verified": True}}
        )
        
        if result.modified_count == 0:
             # Check if already verified
             user = await db.access.find_one({"email": email})
             if not user:
                 raise HTTPException(status_code=404, detail="User not found")
             if user.get("is_verified"):
                 return {"success": True, "message": "Email already verified"}

        return {"success": True, "message": "Email verified successfully"}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Verification link expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid verification link")

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user: UserLogin, request: Request):
    # Find user
    user_doc = await db.access.find_one({"email": user.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(user.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # CHECK VERIFICATION STATUS
    # Default to True for old users, False for new ones
    is_verified = user_doc.get("is_verified", True)
    if is_verified is False:
        raise HTTPException(status_code=403, detail="Email not verified. Please check your inbox.")
    
    # Update login analytics
    current_time = datetime.now(timezone.utc).isoformat()
    current_location = get_location_from_ip(request.client.host)
    
    await db.access.update_one(
        {"email": user.email},
        {
            "$inc": {"login_count": 1},
            "$set": {
                "last_login": current_time,
                "last_ip": request.client.host,
                "last_location": current_location,
                "last_device_type": "Mobile" if "Mobile" in request.headers.get("User-Agent", "") else "Desktop"
            }
        }
    )
    
    # Log the login event in analytics collection
    await db.login_events.insert_one({
        "user_id": user_doc.get("user_id"),
        "email": user.email,
        "timestamp": current_time
    })
    
    logger.info(f"User logged in: {user.email}")
    
    # Decrypt and return master key
    master_key = None
    if user_doc.get("master_encryption_key"):
        try:
            master_key = decrypt_master_key(user_doc["master_encryption_key"])
        except Exception as e:
            logger.error(f"Failed to decrypt master key for {user.email}: {e}")
            # For backward compatibility with old users without master keys
            pass
    
    token = create_token(user.email)
    return TokenResponse(
        token=token, 
        email=user.email,
        role=user_doc.get("role", "user"),  # Include role in response
        master_key=master_key
    )

@api_router.post("/auth/request-password-reset")
async def request_password_reset(request: PasswordResetRequest, background_tasks: BackgroundTasks):
    """Request a password reset email"""
    # Check if user exists
    user_doc = await db.access.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user_doc:
        logger.warning(f"Password reset requested for non-existent email: {request.email}")
        return {"success": True, "message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token
    reset_token = create_password_reset_token(request.email)
    
    # Send email in background
    background_tasks.add_task(send_password_reset_email, request.email, reset_token)
    
    logger.info(f"Password reset requested for: {request.email}")
    return {"success": True, "message": "If the email exists, a reset link has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(request: PasswordResetConfirm):
    """Reset password using token"""
    try:
        # Verify token
        payload = jwt.decode(request.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('type') != 'password_reset':
            raise HTTPException(status_code=400, detail="Invalid token type")
        
        email = payload['email']
        
        # Hash new password
        new_password_hash = hash_password(request.new_password)
        
        # Update password (master key remains unchanged!)
        result = await db.access.update_one(
            {"email": email},
            {"$set": {"password": new_password_hash}}
        )
        
        if result.modified_count == 0:
            user = await db.access.find_one({"email": email})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Password reset successful for: {email}")
        return {"success": True, "message": "Password reset successfully"}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset link expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid reset link")

@api_router.post("/track-page")

async def track_page_visit(request: PageVisitRequest, email: str = Depends(verify_token)):
    """Track user page visits for analytics"""
    try:
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Get current user data
        user_doc = await db.access.find_one({"email": email}, {"_id": 0})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Calculate page depth
        new_page_depth = get_page_depth(request.page_path)
        current_deepest = user_doc.get("deepest_page", "/")
        current_deepest_depth = get_page_depth(current_deepest)
        
        # Update user's last visited page and deepest page if applicable
        update_data = {
            "last_page_visited": request.page_path,
            "last_page_visit_time": current_time
        }
        
        if new_page_depth > current_deepest_depth:
            update_data["deepest_page"] = request.page_path
        
        await db.access.update_one(
            {"email": email},
            {
                "$set": update_data,
                "$inc": {"total_pages_viewed": 1}
            }
        )
        
        # Log the page visit in analytics collection
        await db.page_visits.insert_one({
            "user_id": user_doc.get("user_id"),
            "email": email,
            "page_path": request.page_path,
            "session_id": request.session_id,
            "timestamp": current_time
        })
        
        return {"success": True, "page": request.page_path}
    except Exception as e:
        logger.error(f"Error tracking page visit: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/life-expectancy", response_model=LifeExpectancyResponse)
async def calculate_life_expectancy(request: LifeExpectancyRequest, email: str = Depends(verify_token)):
    try:
        # Parse birth date
        birth_date = datetime.strptime(request.birth_date, "%Y-%m-%d")
        birth_year = birth_date.year
        
        # Calculate current age
        today = datetime.now()
        current_age = today.year - birth_year
        if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
            current_age -= 1
        
        # Get life expectancy data for current gender
        gender = request.gender.lower()
        if gender not in life_expectancy_data:
            raise HTTPException(status_code=400, detail="Invalid gender")
        
        gender_data = life_expectancy_data[gender]
        
        # Use 2025 data (or the closest future year available)
        current_year = today.year
        available_years = sorted([y for y in gender_data.keys() if y >= current_year])
        
        if not available_years:
            # Fallback to most recent year if no future data
            available_years = sorted(gender_data.keys())
        
        reference_year = available_years[0] if available_years else 2025
        age_data = gender_data.get(reference_year, gender_data[sorted(gender_data.keys())[-1]])
        
        # Get available ages in the data
        available_ages = sorted(age_data.keys())
        
        # Interpolate years remaining based on current age
        if current_age <= available_ages[0]:
            # Younger than minimum age in data
            years_remaining = age_data[available_ages[0]]
        elif current_age >= available_ages[-1]:
            # Older than maximum age in data
            years_remaining = age_data[available_ages[-1]]
        else:
            # Interpolate between two closest ages
            lower_age = max([a for a in available_ages if a <= current_age])
            upper_age = min([a for a in available_ages if a > current_age])
            
            lower_years = age_data[lower_age]
            upper_years = age_data[upper_age]
            
            # Linear interpolation
            age_fraction = (current_age - lower_age) / (upper_age - lower_age)
            years_remaining = lower_years + (upper_years - lower_years) * age_fraction
        
        # Calculate total life expectancy: current age + years remaining
        total_life_expectancy = current_age + years_remaining
        
        # Calculate retirement legal date (birth date + 65 years + 1 month)
        retirement_date = birth_date.replace(year=birth_date.year + 65)
        retirement_date = retirement_date + timedelta(days=30)  # Add 1 month
        
        # Calculate theoretical death date (today + years remaining)
        death_date = today + timedelta(days=int(years_remaining * 365.25))
        
        logger.info(f"Life expectancy calculation: age={current_age}, years_remaining={years_remaining:.1f}, total={total_life_expectancy:.1f}")
        
        return LifeExpectancyResponse(
            life_expectancy_years=years_remaining,
            retirement_legal_date=retirement_date.strftime("%Y-%m-%d"),  # ISO format for consistency
            theoretical_death_date=death_date.strftime("%Y-%m-%d")  # ISO format for consistency
        )
    except Exception as e:
        logger.error(f"Error calculating life expectancy: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# CORS middleware - must be added BEFORE routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://retirenow-frontend.onrender.com",
        os.environ.get("FRONTEND_URL", "") # Allow custom frontend URL from env
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router in the main app
app.include_router(api_router)

@app.on_event("startup")
async def startup_db_client():
    """Test database connection on startup"""
    try:
        # Test the connection
        await client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB database: {os.environ.get('DB_NAME', 'unknown')}")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
