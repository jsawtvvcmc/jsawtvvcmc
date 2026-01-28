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
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
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
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except InvalidTokenError:
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
    
    # Create default medicines for surgery
    existing_medicines_count = await db.medicines.count_documents({})
    if existing_medicines_count == 0:
        default_medicines = [
            {"name": "Anti-Rabies Vaccine", "unit": "Ml", "packing": "Vial", "packing_size": 10},
            {"name": "Xylazine", "unit": "Ml", "packing": "Vial", "packing_size": 30},
            {"name": "Melonex", "unit": "Ml", "packing": "Bottle", "packing_size": 100},
            {"name": "Atropine", "unit": "Ml", "packing": "Vial", "packing_size": 30},
            {"name": "Diazepam", "unit": "Ml", "packing": "Vial", "packing_size": 10},
            {"name": "Prednisolone", "unit": "Ml", "packing": "Vial", "packing_size": 10},
            {"name": "Ketamine", "unit": "Ml", "packing": "Vial", "packing_size": 5},
            {"name": "Tribivet", "unit": "Ml", "packing": "Bottle", "packing_size": 100},
            {"name": "Intacef Tazo", "unit": "Mg", "packing": "Vial", "packing_size": 4500},
            {"name": "Adrenaline", "unit": "Ml", "packing": "Vial", "packing_size": 10},
            {"name": "Alu Spray", "unit": "Ml", "packing": "Bottle", "packing_size": 100},
            {"name": "Ethamsylate", "unit": "Ml", "packing": "Vial", "packing_size": 30},
            {"name": "Tincture", "unit": "Ml", "packing": "Bottle", "packing_size": 400},
            {"name": "Avil", "unit": "Ml", "packing": "Bottle", "packing_size": 100},
            {"name": "Vicryl 1", "unit": "Pcs", "packing": "Pack", "packing_size": 12},
            {"name": "Catgut", "unit": "Pcs", "packing": "Pack", "packing_size": 12},
            {"name": "Vicryl 2", "unit": "Pcs", "packing": "Pack", "packing_size": 12},
            {"name": "Metronidazole", "unit": "Ml", "packing": "Bottle", "packing_size": 100},
        ]
        
        for med in default_medicines:
            medicine_doc = {
                "id": str(uuid.uuid4()),
                "name": med["name"],
                "generic_name": None,
                "unit": med["unit"],
                "packing": med["packing"],
                "packing_size": med["packing_size"],
                "current_stock": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.medicines.insert_one(medicine_doc)
        
        logger.info(f"Created {len(default_medicines)} default medicines for surgery")

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

@api_router.post("/cases/{case_id}/initial-observation")
async def add_initial_observation(
    case_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add initial observation to a case"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Check if kennel is available
    kennel = await db.kennels.find_one({"kennel_number": data["kennel_number"]}, {"_id": 0})
    if not kennel or kennel["is_occupied"]:
        raise HTTPException(status_code=400, detail="Kennel not available")
    
    # Update case
    observation = {
        "kennel_number": data["kennel_number"],
        "gender": data["gender"],
        "approximate_age": data["approximate_age"],
        "color_markings": data["color_markings"],
        "body_condition": data["body_condition"],
        "temperament": data["temperament"],
        "visible_injuries": data["visible_injuries"],
        "injury_description": data.get("injury_description"),
        "photo_base64": data["photo_base64"],
        "remarks": data.get("remarks"),
        "catcher_id": current_user["id"],
        "observation_date": datetime.now(timezone.utc).isoformat()
    }
    
    await db.cases.update_one(
        {"id": case_id},
        {
            "$set": {
                "initial_observation": observation,
                "status": CaseStatus.IN_KENNEL.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update kennel
    await db.kennels.update_one(
        {"kennel_number": data["kennel_number"]},
        {
            "$set": {
                "is_occupied": True,
                "current_case_id": case_id,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Initial observation added successfully"}

@api_router.post("/cases/{case_id}/surgery")
async def add_surgery_record(
    case_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add surgery record to a case"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    surgery = {
        "surgery_date": data.get("surgery_date", datetime.now(timezone.utc).isoformat()),
        "pre_surgery_status": data["pre_surgery_status"],
        "cancellation_reason": data.get("cancellation_reason"),
        "surgery_type": data.get("surgery_type"),
        "anesthesia_used": data.get("anesthesia_used", []),
        "surgery_start_time": data.get("surgery_start_time"),
        "surgery_end_time": data.get("surgery_end_time"),
        "complications": data.get("complications", False),
        "complication_description": data.get("complication_description"),
        "post_surgery_status": data.get("post_surgery_status"),
        "veterinary_signature": data["veterinary_signature"],
        "remarks": data.get("remarks"),
        "veterinary_id": current_user["id"]
    }
    
    # Determine new status
    if data["pre_surgery_status"] == "Cancel Surgery":
        new_status = CaseStatus.SURGERY_CANCELLED.value
        # Free kennel if cancelled
        if case.get("initial_observation"):
            kennel_number = case["initial_observation"]["kennel_number"]
            await db.kennels.update_one(
                {"kennel_number": kennel_number},
                {
                    "$set": {
                        "is_occupied": False,
                        "current_case_id": None,
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
    else:
        new_status = CaseStatus.SURGERY_COMPLETED.value
        # Deduct medicine stock for anesthesia
        for medicine_id in data.get("anesthesia_used", []):
            await db.medicines.update_one(
                {"id": medicine_id},
                {"$inc": {"current_stock": -1}}
            )
    
    await db.cases.update_one(
        {"id": case_id},
        {
            "$set": {
                "surgery": surgery,
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Surgery record added successfully", "status": new_status}

@api_router.post("/cases/{case_id}/treatment")
async def add_daily_treatment(
    case_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add daily treatment record"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    treatment = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "date": data.get("date", datetime.now(timezone.utc).isoformat()),
        "day_post_surgery": data["day_post_surgery"],
        "antibiotic_id": data.get("antibiotic_id"),
        "antibiotic_dosage": data.get("antibiotic_dosage"),
        "painkiller_id": data.get("painkiller_id"),
        "painkiller_dosage": data.get("painkiller_dosage"),
        "additional_medicine_id": data.get("additional_medicine_id"),
        "additional_medicine_dosage": data.get("additional_medicine_dosage"),
        "wound_condition": data["wound_condition"],
        "remarks": data.get("remarks"),
        "admin_id": current_user["id"]
    }
    
    # Deduct medicine stock
    medicines_to_deduct = [
        (data.get("antibiotic_id"), data.get("antibiotic_dosage")),
        (data.get("painkiller_id"), data.get("painkiller_dosage")),
        (data.get("additional_medicine_id"), data.get("additional_medicine_dosage"))
    ]
    
    for med_id, dosage in medicines_to_deduct:
        if med_id and dosage:
            await db.medicines.update_one(
                {"id": med_id},
                {"$inc": {"current_stock": -float(dosage)}}
            )
    
    # Add treatment to case
    await db.cases.update_one(
        {"id": case_id},
        {
            "$push": {"daily_treatments": treatment},
            "$set": {
                "status": CaseStatus.UNDER_TREATMENT.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Treatment record added successfully"}

@api_router.post("/daily-feeding")
async def create_daily_feeding(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create daily feeding record"""
    feeding = {
        "id": str(uuid.uuid4()),
        "date": data.get("date", datetime.now(timezone.utc).isoformat()),
        "meal_time": data["meal_time"],
        "kennel_numbers": data["kennel_numbers"],
        "food_items": data["food_items"],
        "total_quantity": data["total_quantity"],
        "photo_base64": data["photo_base64"],
        "animals_not_fed": data.get("animals_not_fed", []),
        "remarks": data.get("remarks"),
        "caretaker_id": current_user["id"]
    }
    
    # Deduct food stock
    for food_id, quantity in data["food_items"].items():
        await db.food_items.update_one(
            {"id": food_id},
            {"$inc": {"current_stock": -float(quantity)}}
        )
    
    await db.daily_feeding.insert_one(feeding)
    
    # Update cases with feeding reference
    for kennel_num in data["kennel_numbers"]:
        kennel = await db.kennels.find_one({"kennel_number": kennel_num}, {"_id": 0})
        if kennel and kennel.get("current_case_id"):
            await db.cases.update_one(
                {"id": kennel["current_case_id"]},
                {"$push": {"daily_feedings": feeding["id"]}}
            )
    
    return {"message": "Feeding record created successfully", "feeding_id": feeding["id"]}

@api_router.post("/cases/{case_id}/release")
async def add_release_record(
    case_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add release record"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    release = {
        "date_time": data.get("date_time", datetime.now(timezone.utc).isoformat()),
        "location_lat": data["location_lat"],
        "location_lng": data["location_lng"],
        "address": data["address"],
        "photo_base64": data["photo_base64"],
        "released_by": current_user["id"],
        "remarks": data.get("remarks")
    }
    
    await db.cases.update_one(
        {"id": case_id},
        {
            "$set": {
                "release": release,
                "status": CaseStatus.RELEASED.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Free kennel
    if case.get("initial_observation"):
        kennel_number = case["initial_observation"]["kennel_number"]
        await db.kennels.update_one(
            {"kennel_number": kennel_number},
            {
                "$set": {
                    "is_occupied": False,
                    "current_case_id": None,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
        )
    
    return {"message": "Release record added successfully"}

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