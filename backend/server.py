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

# ==================== USER MANAGEMENT ====================

@api_router.post("/users", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(lambda creds: require_roles([UserRole.SUPER_USER, UserRole.ADMIN])(creds))
):
    """Create a new user"""
    from utils import generate_password
    
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate password
    password = generate_password(user_data.first_name, user_data.mobile)
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict["id"] = str(uuid.uuid4())
    user_dict["password_hash"] = hash_password(password)
    user_dict["is_active"] = True
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    logger.info(f"User created: {user_data.email}, Password: {password}")
    
    user_dict.pop("password_hash")
    user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    return User(**user_dict)

@api_router.get("/users", response_model=List[User])
async def get_users(
    current_user: dict = Depends(get_current_user)
):
    """Get all users"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(None)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

# ==================== STATISTICS ====================

@api_router.get("/statistics/dashboard")
async def get_dashboard_statistics(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    total_cases = await db.cases.count_documents({})
    active_cases = await db.cases.count_documents({"status": {"$nin": [
        CaseStatus.RELEASED.value,
        CaseStatus.DECEASED.value,
        CaseStatus.SURGERY_CANCELLED.value
    ]}})
    
    total_surgeries = await db.cases.count_documents({"surgery": {"$exists": True}})
    occupied_kennels = await db.kennels.count_documents({"is_occupied": True})
    total_kennels = await db.kennels.count_documents({})
    
    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "total_surgeries": total_surgeries,
        "occupied_kennels": occupied_kennels,
        "available_kennels": total_kennels - occupied_kennels,
        "total_kennels": total_kennels
    }

# ==================== MEDICINE MANAGEMENT ====================
from models import Medicine, MedicineCreate, MedicineStockAdd

@api_router.post("/medicines", response_model=Medicine)
async def create_medicine(
    medicine_data: MedicineCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new medicine"""
    medicine_dict = medicine_data.model_dump()
    medicine_dict["id"] = str(uuid.uuid4())
    medicine_dict["current_stock"] = 0.0
    medicine_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.medicines.insert_one(medicine_dict)
    medicine_dict['created_at'] = datetime.fromisoformat(medicine_dict['created_at'])
    return Medicine(**medicine_dict)

@api_router.get("/medicines", response_model=List[Medicine])
async def get_medicines(current_user: dict = Depends(get_current_user)):
    """Get all medicines"""
    medicines = await db.medicines.find({}, {"_id": 0}).to_list(None)
    for med in medicines:
        if isinstance(med.get('created_at'), str):
            med['created_at'] = datetime.fromisoformat(med['created_at'])
    return medicines

@api_router.post("/medicines/stock/add")
async def add_medicine_stock(
    stock_data: MedicineStockAdd,
    current_user: dict = Depends(get_current_user)
):
    """Add medicine stock"""
    result = await db.medicines.update_one(
        {"id": stock_data.medicine_id},
        {"$inc": {"current_stock": stock_data.quantity}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    return {"message": "Stock added successfully", "quantity": stock_data.quantity}

# ==================== FOOD MANAGEMENT ====================
from models import FoodItem, FoodItemCreate, FoodStockAdd

@api_router.post("/food-items", response_model=FoodItem)
async def create_food_item(
    food_data: FoodItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new food item"""
    food_dict = food_data.model_dump()
    food_dict["id"] = str(uuid.uuid4())
    food_dict["current_stock"] = 0.0
    food_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.food_items.insert_one(food_dict)
    food_dict['created_at'] = datetime.fromisoformat(food_dict['created_at'])
    return FoodItem(**food_dict)

@api_router.get("/food-items", response_model=List[FoodItem])
async def get_food_items(current_user: dict = Depends(get_current_user)):
    """Get all food items"""
    items = await db.food_items.find({}, {"_id": 0}).to_list(None)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.post("/food-items/stock/add")
async def add_food_stock(
    stock_data: FoodStockAdd,
    current_user: dict = Depends(get_current_user)
):
    """Add food stock"""
    result = await db.food_items.update_one(
        {"id": stock_data.food_id},
        {"$inc": {"current_stock": stock_data.quantity}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Food item not found")
    
    return {"message": "Stock added successfully", "quantity": stock_data.quantity}

# ==================== KENNEL MANAGEMENT ====================

@api_router.get("/kennels")
async def get_kennels(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all kennels or filter by status"""
    query = {}
    if status_filter == "available":
        query["is_occupied"] = False
    elif status_filter == "occupied":
        query["is_occupied"] = True
    
    kennels = await db.kennels.find(query, {"_id": 0}).sort("kennel_number", 1).to_list(None)
    return kennels

@api_router.post("/kennels/initialize")
async def initialize_kennels(current_user: dict = Depends(get_current_user)):
    """Initialize kennels (run once)"""
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    max_kennels = config.get("max_kennels", 300) if config else 300
    
    existing = await db.kennels.count_documents({})
    if existing > 0:
        return {"message": f"{existing} kennels already exist"}
    
    kennels = []
    for i in range(1, max_kennels + 1):
        kennel = {
            "id": str(uuid.uuid4()),
            "kennel_number": i,
            "is_occupied": False,
            "current_case_id": None,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        kennels.append(kennel)
    
    if kennels:
        await db.kennels.insert_many(kennels)
    
    return {"message": f"Initialized {len(kennels)} kennels"}

# ==================== CASE MANAGEMENT ====================

@api_router.post("/cases/catching")
async def create_catching_record(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a catching record"""
    from utils import get_next_case_number
    
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    project_code = config.get("project_code", "JAPP") if config else "JAPP"
    case_number = await get_next_case_number(db, project_code)
    
    case_dict = {
        "id": str(uuid.uuid4()),
        "case_number": case_number,
        "status": CaseStatus.CAUGHT.value,
        "project_code": project_code,
        "catching": {
            "date_time": data.get("date_time", datetime.now(timezone.utc).isoformat()),
            "location_lat": data["location_lat"],
            "location_lng": data["location_lng"],
            "address": data["address"],
            "ward_number": data.get("ward_number"),
            "photo_base64": data["photo_base64"],
            "remarks": data.get("remarks"),
            "driver_id": current_user["id"]
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.cases.insert_one(case_dict)
    logger.info(f"Case created: {case_number}")
    
    return {"case_number": case_number, "case_id": case_dict["id"], "message": "Case created successfully"}

@api_router.get("/cases")
async def get_cases(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all cases"""
    query = {}
    if status:
        query["status"] = status
    
    cases = await db.cases.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return cases

@api_router.get("/cases/{case_id}")
async def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific case"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

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