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
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    # Check if user exists
    existing = await db.access.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_pw = hash_password(user.password)
    user_doc = {
        "user_id": str(uuid.uuid4()),
        "email": user.email,
        "password": hashed_pw
    }
    
    await db.access.insert_one(user_doc)
    
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
        
        # Get life expectancy data
        gender = request.gender.lower()
        if gender not in life_expectancy_data:
            raise HTTPException(status_code=400, detail="Invalid gender")
        
        gender_data = life_expectancy_data[gender]
        
        # Find closest birth year in data
        available_years = sorted(gender_data.keys())
        closest_year = min(available_years, key=lambda y: abs(y - birth_year))
        
        # Find closest age in data
        age_data = gender_data[closest_year]
        available_ages = sorted(age_data.keys())
        closest_age = min(available_ages, key=lambda a: abs(a - current_age))
        
        # Get years left to live
        years_left = age_data[closest_age]
        
        # Calculate retirement legal date (birth date + 65 years + 1 month)
        retirement_date = birth_date.replace(year=birth_date.year + 65)
        retirement_date = retirement_date + timedelta(days=30)  # Add 1 month
        
        # Calculate theoretical death date
        death_date = today + timedelta(days=int(years_left * 365.25))
        
        return LifeExpectancyResponse(
            life_expectancy_years=years_left,
            retirement_legal_date=retirement_date.strftime("%b %Y"),
            theoretical_death_date=death_date.strftime("%b %Y")
        )
    except Exception as e:
        logger.error(f"Error calculating life expectancy: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
