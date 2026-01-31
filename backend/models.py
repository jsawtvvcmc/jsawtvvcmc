"""
Database models for ABC Program Management System
Multi-Project/Multi-Tenant Architecture
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum
import uuid

# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "Super Admin"  # Global admin - can access all projects
    ADMIN = "Admin"              # Project-level admin
    DRIVER = "Driver"
    CATCHER = "Catcher"
    VETERINARY = "Veterinary Doctor"
    CARETAKER = "Caretaker"

class ProjectStatus(str, Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    SUSPENDED = "Suspended"

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

class AnimalAge(str, Enum):
    PUPPY = "Puppy < 6 months"
    YOUNG = "Young 6-24 months"
    ADULT = "Adult 2-8 years"
    SENIOR = "Senior > 8 years"

class BodyCondition(str, Enum):
    EMACIATED = "Emaciated"
    THIN = "Thin"
    NORMAL = "Normal"
    OVERWEIGHT = "Overweight"

class Temperament(str, Enum):
    CALM = "Calm"
    AGGRESSIVE = "Aggressive"
    FEARFUL = "Fearful"

class SurgeryType(str, Enum):
    CASTRATION = "Castration"
    OVARIOHYSTERECTOMY = "Ovariohysterectomy"

class PostSurgeryStatus(str, Enum):
    EXCELLENT = "Excellent"
    GOOD = "Good"
    FAIR = "Fair"
    POOR = "Poor"

class CancellationReason(str, Enum):
    TOO_WEAK = "Too weak"
    ALREADY_STERILIZED = "Already sterilized"
    ADVANCED_PREGNANT = "Advanced pregnant"
    LACTATING = "Lactating"
    OTHER = "Other"

class WoundCondition(str, Enum):
    NORMAL_HEALING = "Normal Healing"
    INFLAMMATION = "Inflammation"
    INFECTION = "Infection"
    OTHER = "Other"

class MedicineUnit(str, Enum):
    ML = "Ml"
    MG = "Mg"
    PCS = "Pcs"

class MedicinePacking(str, Enum):
    BOTTLE = "Bottle"
    VIAL = "Vial"
    PACK = "Pack"

class FoodUnit(str, Enum):
    KG = "Kg"
    LITER = "Liter"
    PIECE = "Piece"

class MealTime(str, Enum):
    MORNING = "Morning"
    EVENING = "Evening"

class CauseOfDeath(str, Enum):
    POST_SURGICAL_COMPLICATIONS = "Post-surgical complications"
    PRE_EXISTING_CONDITION = "Pre-existing condition"
    UNKNOWN = "Unknown"
    OTHER = "Other"

# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    first_name: str
    last_name: str
    mobile: str
    role: UserRole
    project_id: Optional[str] = None  # None for Super Admin (global access)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    mobile: str
    role: UserRole
    project_id: Optional[str] = None

class UserInDB(User):
    password_hash: str

# Project Models (Multi-Tenant)
class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Organization Details
    organization_name: str = "Janice Smith Animal Welfare Trust"
    organization_shortcode: str = "JS"  # 2 letters
    organization_logo_url: Optional[str] = None
    
    # Project Details
    project_name: str  # e.g., "Vasai Virar Municipal Corporation ABC Project"
    project_code: str  # 3 letters, e.g., "VVC"
    project_logo_url: Optional[str] = None
    project_address: Optional[str] = None
    
    # Settings
    max_kennels: int = 300
    status: ProjectStatus = ProjectStatus.ACTIVE
    
    # Google Drive
    drive_folder_id: Optional[str] = None  # Root folder for this project
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectCreate(BaseModel):
    organization_name: str = "Janice Smith Animal Welfare Trust"
    organization_shortcode: str = "JS"
    organization_logo_base64: Optional[str] = None
    project_name: str
    project_code: str  # 3 letters
    project_logo_base64: Optional[str] = None
    project_address: Optional[str] = None
    max_kennels: int = 300
    
    # Admin user for this project
    admin_first_name: str
    admin_last_name: str
    admin_email: EmailStr
    admin_mobile: str
    admin_password: str

# Medicine Models
class Medicine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str  # Required - medicines are project-specific
    name: str
    generic_name: Optional[str] = None
    unit: MedicineUnit
    packing: MedicinePacking
    packing_size: float
    current_stock: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MedicineCreate(BaseModel):
    name: str
    generic_name: Optional[str] = None
    unit: MedicineUnit
    packing: MedicinePacking
    packing_size: float

class MedicineStockAdd(BaseModel):
    medicine_id: str
    quantity: float
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    date: datetime = Field(default_factory=datetime.utcnow)

class MedicineMiscUse(BaseModel):
    medicine_id: str
    quantity: float
    reason: str
    date: datetime = Field(default_factory=datetime.utcnow)

# Food Models
class FoodItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str  # Required - food items are project-specific
    name: str
    unit: FoodUnit
    current_stock: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FoodItemCreate(BaseModel):
    name: str
    unit: FoodUnit

class FoodStockAdd(BaseModel):
    food_id: str
    quantity: float
    supplier: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)

# Kennel Models
class Kennel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str  # Required - kennels are project-specific
    kennel_number: int
    is_occupied: bool = False
    current_case_id: Optional[str] = None
    last_updated: datetime = Field(default_factory=datetime.utcnow)

# Case Models
class CatchingRecord(BaseModel):
    date_time: datetime
    location_lat: float
    location_lng: float
    address: str
    ward_number: Optional[str] = None
    photo_base64: str  # Base64 encoded image
    remarks: Optional[str] = None
    driver_id: str

class InitialObservation(BaseModel):
    kennel_number: int
    gender: Gender
    approximate_age: AnimalAge
    color_markings: str
    body_condition: BodyCondition
    temperament: Temperament
    visible_injuries: bool
    injury_description: Optional[str] = None
    photo_base64: str  # Base64 encoded image
    remarks: Optional[str] = None
    catcher_id: str
    observation_date: datetime = Field(default_factory=datetime.utcnow)

class SurgeryRecord(BaseModel):
    surgery_date: datetime
    pre_surgery_status: str  # "Fit for Surgery" or "Cancel Surgery"
    cancellation_reason: Optional[CancellationReason] = None
    surgery_type: Optional[SurgeryType] = None
    anesthesia_used: Optional[List[str]] = []  # List of medicine IDs
    surgery_start_time: Optional[datetime] = None
    surgery_end_time: Optional[datetime] = None
    complications: bool = False
    complication_description: Optional[str] = None
    post_surgery_status: Optional[PostSurgeryStatus] = None
    veterinary_signature: str
    remarks: Optional[str] = None
    veterinary_id: str

class DailyTreatment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    case_id: str
    date: datetime
    day_post_surgery: int
    antibiotic_id: Optional[str] = None
    antibiotic_dosage: Optional[float] = None
    painkiller_id: Optional[str] = None
    painkiller_dosage: Optional[float] = None
    additional_medicine_id: Optional[str] = None
    additional_medicine_dosage: Optional[float] = None
    wound_condition: WoundCondition
    remarks: Optional[str] = None
    admin_id: str

class DailyFeeding(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: datetime
    meal_time: MealTime
    kennel_numbers: List[int]
    food_items: Dict[str, float]  # {food_id: quantity}
    total_quantity: float
    photo_base64: str
    animals_not_fed: Optional[List[dict]] = []  # [{kennel_number: int, reason: str}]
    remarks: Optional[str] = None
    caretaker_id: str

class DespatchRecord(BaseModel):
    date_time: datetime
    loaded_into_van: bool = True
    remarks: Optional[str] = None
    caretaker_id: str

class ReleaseRecord(BaseModel):
    date_time: datetime
    location_lat: float
    location_lng: float
    address: str
    photo_base64: str
    released_by: str  # Catcher ID
    remarks: Optional[str] = None

class MortalityRecord(BaseModel):
    date_time: datetime
    cause_of_death: CauseOfDeath
    cause_description: Optional[str] = None
    veterinary_certificate_base64: Optional[str] = None
    post_mortem_conducted: bool = False
    post_mortem_report_base64: Optional[str] = None
    detailed_description: str
    reported_by: str  # Admin ID

class Case(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str  # Required - cases are project-specific
    case_number: str
    status: CaseStatus
    
    # Related records
    catching: CatchingRecord
    initial_observation: Optional[InitialObservation] = None
    surgery: Optional[SurgeryRecord] = None
    daily_treatments: List[DailyTreatment] = []
    daily_feedings: List[str] = []  # List of daily feeding IDs
    despatch: Optional[DespatchRecord] = None
    release: Optional[ReleaseRecord] = None
    mortality: Optional[MortalityRecord] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Configuration Model (Now per-project, managed via Project model)
class SystemConfiguration(BaseModel):
    """Legacy configuration - kept for backward compatibility"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = "system_config"
    organization_name: str = "Janices Trust"
    organization_shortcode: str = "JS"
    registered_office: str = ""
    organization_logo_base64: Optional[str] = None
    project_name: str = "ABC Program"
    project_code: str = "TAL"
    municipal_logo_base64: Optional[str] = None
    project_address: str = ""
    max_kennels: int = 300
    google_maps_api_key: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
