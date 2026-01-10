from fastapi import FastAPI, APIRouter, HTTPException, Depends
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

class TokenResponse(BaseModel):
    token: str
    email: str

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

class AdminUserResponse(BaseModel):
    user_id: str
    email: str
    created_at: Optional[str] = None
    login_count: int = 0
    last_login: Optional[str] = None
    last_page_visited: Optional[str] = None
    deepest_page: Optional[str] = None

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
    '/financial-balance',
    '/scenario',
    '/scenario-result'
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

def create_token(email: str) -> str:
    payload = {
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload['email']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "OK", "message": "Backend is running"}

# Admin Routes
def verify_admin_key(admin_key: str) -> bool:
    """Verify the admin secret key"""
    return admin_key == ADMIN_SECRET_KEY

@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    """Verify admin credentials and return success status"""
    if not verify_admin_key(request.admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return {"success": True, "message": "Admin access granted"}

@api_router.post("/admin/users", response_model=AdminStatsResponse)
async def get_all_users(request: AdminLoginRequest):
    """Get all registered users (admin only)"""
    if not verify_admin_key(request.admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
    try:
        # Get all users from the access collection
        users_cursor = db.access.find({}, {"_id": 0, "password": 0})
        users = await users_cursor.to_list(length=None)
        
        user_list = [
            AdminUserResponse(
                user_id=user.get("user_id", ""),
                email=user.get("email", ""),
                created_at=user.get("created_at", None)
            )
            for user in users
        ]
        
        return AdminStatsResponse(
            total_users=len(user_list),
            users=user_list
        )
    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@api_router.post("/admin/stats")
async def get_admin_stats(request: AdminLoginRequest):
    """Get admin statistics (admin only)"""
    if not verify_admin_key(request.admin_key):
        raise HTTPException(status_code=401, detail="Invalid admin key")
    
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

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    logger.info(f"Registration attempt for email: {user.email}")
    
    # Check if user exists
    existing = await db.access.find_one({"email": user.email}, {"_id": 0})
    if existing:
        logger.warning(f"Registration failed - email already exists: {user.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_pw = hash_password(user.password)
    user_doc = {
        "user_id": str(uuid.uuid4()),
        "email": user.email,
        "password": hashed_pw,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        result = await db.access.insert_one(user_doc)
        logger.info(f"User registered successfully: {user.email}, inserted_id: {result.inserted_id}")
    except Exception as e:
        logger.error(f"Failed to insert user {user.email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")
    
    token = create_token(user.email)
    return TokenResponse(token=token, email=user.email)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    # Find user
    user_doc = await db.access.find_one({"email": user.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(user.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update login analytics
    current_time = datetime.now(timezone.utc).isoformat()
    await db.access.update_one(
        {"email": user.email},
        {
            "$inc": {"login_count": 1},
            "$set": {"last_login": current_time}
        }
    )
    
    # Log the login event in analytics collection
    await db.login_events.insert_one({
        "user_id": user_doc.get("user_id"),
        "email": user.email,
        "timestamp": current_time
    })
    
    logger.info(f"User logged in: {user.email}")
    
    token = create_token(user.email)
    return TokenResponse(token=token, email=user.email)

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

# Include the router in the main app
app.include_router(api_router)

# CORS middleware - must be added after routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://quit-frontend.onrender.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
