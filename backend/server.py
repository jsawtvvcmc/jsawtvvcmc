from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="ABC Program Management System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Enums
class UserRole(str, Enum):
    SUPER_USER = "Super User"
    ADMIN = "Admin"
    DRIVER = "Driver"
    CATCHER = "Catcher"
    VETERINARY = "Veterinary Doctor"
    CARETAKER = "Caretaker"

class CaseStatus(str, Enum):
    CAUGHT = "Caught"
    IN_KENNEL = "In Kennel"
    SURGERY_SCHEDULED = "Surgery Scheduled"
    SURGERY_COMPLETED = "Surgery Completed"
    SURGERY_CANCELLED = "Surgery Cancelled"
    UNDER_TREATMENT = "Under Treatment"
    READY_FOR_RELEASE = "Ready for Release"
    DISPATCHED = "Dispatched"
    RELEASED = "Released"
    DECEASED = "Deceased"

class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_roles(allowed_roles: List[UserRole]):
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in [role.value for role in allowed_roles]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    first_name: str
    last_name: str
    mobile: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    mobile: str
    role: UserRole

class UserInDB(User):
    password_hash: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

# Startup event to create default super user and configuration
@app.on_event("startup")
async def create_default_superuser():
    """Create default super user if not exists"""
    default_email = "manoj@janicestrust.org"
    existing_user = await db.users.find_one({"email": default_email}, {"_id": 0})
    
    if not existing_user:
        default_user = {
            "id": str(uuid.uuid4()),
            "email": default_email,
            "first_name": "Manoj",
            "last_name": "Oswal",
            "mobile": "9890044455",
            "role": UserRole.SUPER_USER.value,
            "password_hash": hash_password("Kashid@25067"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(default_user)
        logger.info(f"Default super user created: {default_email}")
    else:
        logger.info(f"Default super user already exists: {default_email}")
    
    # Create default system configuration
    existing_config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    if not existing_config:
        default_config = {
            "id": "system_config",
            "organization_name": "Janice's Trust",
            "registered_office": "A hilltop haven for animals",
            "project_name": "ABC Program",
            "project_code": "JAPP",
            "project_address": "",
            "max_kennels": 300,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.system_config.insert_one(default_config)
        logger.info("Default system configuration created")

# Authentication Routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Login endpoint"""
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="User account is inactive")
    
    # Create access token
    access_token = create_access_token({"user_id": user["id"], "email": user["email"]})
    
    # Remove password hash before returning
    user.pop("password_hash", None)
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return LoginResponse(access_token=access_token, user=User(**user))

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    if isinstance(current_user['created_at'], str):
        current_user['created_at'] = datetime.fromisoformat(current_user['created_at'])
    return User(**current_user)

@api_router.get("/config")
async def get_system_config():
    """Get system configuration"""
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    if not config:
        return {
            "id": "system_config",
            "organization_name": "Janice's Trust",
            "registered_office": "A hilltop haven for animals",
            "project_name": "ABC Program",
            "project_code": "JAPP",
            "project_address": "",
            "max_kennels": 300
        }
    return config

# Basic route
@api_router.get("/")
async def root():
    return {"message": "ABC Program Management System API", "version": "1.0"}

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