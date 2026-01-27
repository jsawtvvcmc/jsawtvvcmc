"""
API Routes for ABC Program Management System
"""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from typing import List, Optional
from datetime import datetime
import uuid
import base64

from models import (
    User, UserCreate, Medicine, MedicineCreate, MedicineStockAdd, MedicineMiscUse,
    FoodItem, FoodItemCreate, FoodStockAdd, Kennel, Case, CaseStatus,
    DailyTreatment, DailyFeeding, UserRole
)
from utils import get_next_case_number, generate_password

# Import these from server.py
from server import db, get_current_user, require_roles, hash_password, logger

router = APIRouter()

# ==================== USER MANAGEMENT ====================

@router.post("/users", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.ADMIN]))
):
    """Create a new user"""
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if mobile already exists
    existing_mobile = await db.users.find_one({"mobile": user_data.mobile}, {"_id": 0})
    if existing_mobile:
        raise HTTPException(status_code=400, detail="Mobile number already registered")
    
    # Generate password
    password = generate_password(user_data.first_name, user_data.mobile)
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict["id"] = str(uuid.uuid4())
    user_dict["password_hash"] = hash_password(password)
    user_dict["is_active"] = True
    user_dict["created_at"] = datetime.utcnow().isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Log password for now (in production, send via email)
    logger.info(f"User created: {user_data.email}, Password: {password}")
    
    user_dict.pop("password_hash")
    return User(**user_dict)

@router.get("/users", response_model=List[User])
async def get_users(
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.ADMIN]))
):
    """Get all users"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(None)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

# ==================== MEDICINE MANAGEMENT ====================

@router.post("/medicines", response_model=Medicine)
async def create_medicine(
    medicine_data: MedicineCreate,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.ADMIN]))
):
    """Create a new medicine"""
    medicine_dict = medicine_data.model_dump()
    medicine_dict["id"] = str(uuid.uuid4())
    medicine_dict["current_stock"] = 0.0
    medicine_dict["created_at"] = datetime.utcnow().isoformat()
    
    await db.medicines.insert_one(medicine_dict)
    return Medicine(**medicine_dict)

@router.get("/medicines", response_model=List[Medicine])
async def get_medicines(current_user: dict = Depends(get_current_user)):
    """Get all medicines"""
    medicines = await db.medicines.find({}, {"_id": 0}).to_list(None)
    for med in medicines:
        if isinstance(med.get('created_at'), str):
            med['created_at'] = datetime.fromisoformat(med['created_at'])
    return medicines

@router.post("/medicines/stock/add")
async def add_medicine_stock(
    stock_data: MedicineStockAdd,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.ADMIN]))
):
    """Add medicine stock"""
    # Update medicine stock
    result = await db.medicines.update_one(
        {"id": stock_data.medicine_id},
        {"$inc": {"current_stock": stock_data.quantity}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    # Record the stock addition
    stock_record = stock_data.model_dump()
    stock_record["id"] = str(uuid.uuid4())
    stock_record["added_by"] = current_user["id"]
    stock_record["date"] = stock_record["date"].isoformat() if isinstance(stock_record["date"], datetime) else stock_record["date"]
    if stock_record.get("expiry_date"):
        stock_record["expiry_date"] = stock_record["expiry_date"].isoformat() if isinstance(stock_record["expiry_date"], datetime) else stock_record["expiry_date"]
    
    await db.medicine_stock_history.insert_one(stock_record)
    
    return {"message": "Stock added successfully", "quantity": stock_data.quantity}

@router.post("/medicines/misc-use")
async def record_medicine_misc_use(
    use_data: MedicineMiscUse,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.ADMIN]))
):
    """Record miscellaneous medicine use"""
    # Check and update stock
    medicine = await db.medicines.find_one({"id": use_data.medicine_id}, {"_id": 0})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    if medicine["current_stock"] < use_data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    await db.medicines.update_one(
        {"id": use_data.medicine_id},
        {"$inc": {"current_stock": -use_data.quantity}}
    )
    
    # Record the usage
    use_record = use_data.model_dump()
    use_record["id"] = str(uuid.uuid4())
    use_record["recorded_by"] = current_user["id"]
    use_record["date"] = use_record["date"].isoformat() if isinstance(use_record["date"], datetime) else use_record["date"]
    
    await db.medicine_misc_use.insert_one(use_record)
    
    return {"message": "Usage recorded successfully"}

# ==================== FOOD MANAGEMENT ====================

@router.post("/food-items", response_model=FoodItem)
async def create_food_item(
    food_data: FoodItemCreate,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.ADMIN]))
):
    """Create a new food item"""
    food_dict = food_data.model_dump()
    food_dict["id"] = str(uuid.uuid4())
    food_dict["current_stock"] = 0.0
    food_dict["created_at"] = datetime.utcnow().isoformat()
    
    await db.food_items.insert_one(food_dict)
    return FoodItem(**food_dict)

@router.get("/food-items", response_model=List[FoodItem])
async def get_food_items(current_user: dict = Depends(get_current_user)):
    """Get all food items"""
    items = await db.food_items.find({}, {"_id": 0}).to_list(None)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@router.post("/food-items/stock/add")
async def add_food_stock(
    stock_data: FoodStockAdd,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.ADMIN]))
):
    """Add food stock"""
    result = await db.food_items.update_one(
        {"id": stock_data.food_id},
        {"$inc": {"current_stock": stock_data.quantity}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Food item not found")
    
    # Record the stock addition
    stock_record = stock_data.model_dump()
    stock_record["id"] = str(uuid.uuid4())
    stock_record["added_by"] = current_user["id"]
    stock_record["date"] = stock_record["date"].isoformat() if isinstance(stock_record["date"], datetime) else stock_record["date"]
    
    await db.food_stock_history.insert_one(stock_record)
    
    return {"message": "Stock added successfully", "quantity": stock_data.quantity}

# ==================== KENNEL MANAGEMENT ====================

@router.get("/kennels")
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
    
    kennels = await db.kennels.find(query, {"_id": 0}).to_list(None)
    return kennels

@router.post("/kennels/initialize")
async def initialize_kennels(
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER]))
):
    """Initialize kennels (run once)"""
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    max_kennels = config.get("max_kennels", 300) if config else 300
    
    # Check if already initialized
    existing = await db.kennels.count_documents({})
    if existing > 0:
        return {"message": f"{existing} kennels already exist"}
    
    # Create kennels
    kennels = []
    for i in range(1, max_kennels + 1):
        kennel = {
            "id": str(uuid.uuid4()),
            "kennel_number": i,
            "is_occupied": False,
            "current_case_id": None,
            "last_updated": datetime.utcnow().isoformat()
        }
        kennels.append(kennel)
    
    if kennels:
        await db.kennels.insert_many(kennels)
    
    return {"message": f"Initialized {len(kennels)} kennels"}

# ==================== CASE MANAGEMENT ====================

@router.post("/cases/catching")
async def create_catching_record(
    data: dict,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.DRIVER]))
):
    """Create a catching record (start of a case)"""
    # Get next case number
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    project_code = config.get("project_code", "JAPP") if config else "JAPP"
    case_number = await get_next_case_number(db, project_code)
    
    # Create case
    case_dict = {
        "id": str(uuid.uuid4()),
        "case_number": case_number,
        "status": CaseStatus.CAUGHT.value,
        "project_code": project_code,
        "catching": {
            "date_time": data.get("date_time", datetime.utcnow().isoformat()),
            "location_lat": data["location_lat"],
            "location_lng": data["location_lng"],
            "address": data["address"],
            "ward_number": data.get("ward_number"),
            "photo_base64": data["photo_base64"],
            "remarks": data.get("remarks"),
            "driver_id": current_user["id"]
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    await db.cases.insert_one(case_dict)
    logger.info(f"Case created: {case_number}")
    
    return {"case_number": case_number, "case_id": case_dict["id"], "message": "Case created successfully"}

@router.get("/cases")
async def get_cases(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all cases or filter by status"""
    query = {}
    if status:
        query["status"] = status
    
    cases = await db.cases.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return cases

@router.get("/cases/{case_id}")
async def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific case"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.post("/cases/{case_id}/initial-observation")
async def add_initial_observation(
    case_id: str,
    data: dict,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.CATCHER]))
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
        "observation_date": datetime.utcnow().isoformat()
    }
    
    await db.cases.update_one(
        {"id": case_id},
        {
            "$set": {
                "initial_observation": observation,
                "status": CaseStatus.IN_KENNEL.value,
                "updated_at": datetime.utcnow().isoformat()
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
                "last_updated": datetime.utcnow().isoformat()
            }
        }
    )
    
    return {"message": "Initial observation added successfully"}

@router.post("/cases/{case_id}/surgery")
async def add_surgery_record(
    case_id: str,
    data: dict,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.VETERINARY]))
):
    """Add surgery record to a case"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    surgery = {
        "surgery_date": data.get("surgery_date", datetime.utcnow().isoformat()),
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
                        "last_updated": datetime.utcnow().isoformat()
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
                "updated_at": datetime.utcnow().isoformat()
            }
        }
    )
    
    return {"message": "Surgery record added successfully", "status": new_status}

@router.post("/cases/{case_id}/daily-treatment")
async def add_daily_treatment(
    case_id: str,
    data: dict,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.ADMIN]))
):
    """Add daily treatment record"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    treatment = {
        "id": str(uuid.uuid4()),
        "case_id": case_id,
        "date": data.get("date", datetime.utcnow().isoformat()),
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
                "updated_at": datetime.utcnow().isoformat()
            }
        }
    )
    
    return {"message": "Treatment record added successfully"}

@router.post("/daily-feeding")
async def create_daily_feeding(
    data: dict,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.CARETAKER]))
):
    """Create daily feeding record"""
    feeding = {
        "id": str(uuid.uuid4()),
        "date": data.get("date", datetime.utcnow().isoformat()),
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

@router.post("/cases/{case_id}/despatch")
async def add_despatch_record(
    case_id: str,
    data: dict,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.CARETAKER]))
):
    """Add despatch record"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    despatch = {
        "date_time": data.get("date_time", datetime.utcnow().isoformat()),
        "loaded_into_van": data.get("loaded_into_van", True),
        "remarks": data.get("remarks"),
        "caretaker_id": current_user["id"]
    }
    
    await db.cases.update_one(
        {"id": case_id},
        {
            "$set": {
                "despatch": despatch,
                "status": CaseStatus.DISPATCHED.value,
                "updated_at": datetime.utcnow().isoformat()
            }
        }
    )
    
    return {"message": "Despatch record added successfully"}

@router.post("/cases/{case_id}/release")
async def add_release_record(
    case_id: str,
    data: dict,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.CATCHER]))
):
    """Add release record"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    release = {
        "date_time": data.get("date_time", datetime.utcnow().isoformat()),
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
                "updated_at": datetime.utcnow().isoformat()
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
                    "last_updated": datetime.utcnow().isoformat()
                }
            }
        )
    
    return {"message": "Release record added successfully"}

@router.post("/cases/{case_id}/mortality")
async def add_mortality_record(
    case_id: str,
    data: dict,
    current_user: dict = Depends(require_roles([UserRole.SUPER_USER, UserRole.ADMIN]))
):
    """Add mortality record"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    mortality = {
        "date_time": data.get("date_time", datetime.utcnow().isoformat()),
        "cause_of_death": data["cause_of_death"],
        "cause_description": data.get("cause_description"),
        "veterinary_certificate_base64": data.get("veterinary_certificate_base64"),
        "post_mortem_conducted": data.get("post_mortem_conducted", False),
        "post_mortem_report_base64": data.get("post_mortem_report_base64"),
        "detailed_description": data["detailed_description"],
        "reported_by": current_user["id"]
    }
    
    await db.cases.update_one(
        {"id": case_id},
        {
            "$set": {
                "mortality": mortality,
                "status": CaseStatus.DECEASED.value,
                "updated_at": datetime.utcnow().isoformat()
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
                    "last_updated": datetime.utcnow().isoformat()
                }
            }
        )
    
    return {"message": "Mortality record added successfully"}

# ==================== STATISTICS & REPORTS ====================

@router.get("/statistics/dashboard")
async def get_dashboard_statistics(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    total_cases = await db.cases.count_documents({})
    active_cases = await db.cases.count_documents({"status": {"$in": [
        CaseStatus.CAUGHT.value,
        CaseStatus.IN_KENNEL.value,
        CaseStatus.SURGERY_COMPLETED.value,
        CaseStatus.UNDER_TREATMENT.value
    ]}})
    
    total_surgeries = await db.cases.count_documents({"surgery": {"$exists": True}})
    occupied_kennels = await db.kennels.count_documents({"is_occupied": True})
    available_kennels = await db.kennels.count_documents({"is_occupied": False})
    
    # Low stock medicines
    low_stock_medicines = await db.medicines.find(
        {"current_stock": {"$lt": 10}},
        {"_id": 0, "name": 1, "current_stock": 1}
    ).to_list(None)
    
    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "total_surgeries": total_surgeries,
        "occupied_kennels": occupied_kennels,
        "available_kennels": available_kennels,
        "low_stock_medicines": low_stock_medicines
    }
