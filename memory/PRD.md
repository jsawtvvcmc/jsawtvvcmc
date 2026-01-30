# ABC Program Management System (J-APP)
## Product Requirements Document

### Overview
Animal Birth Control (ABC) Program Management System for **Janice's Trust** - a comprehensive system to manage the entire workflow of animal sterilization programs.

### Organization Details
- **Organization:** Janice Smith Animal Welfare Trust
- **Project:** Talegaon ABC Project
- **Address:** 352, Vadgaon, Yashwant Nagar, Talegaon Dabhade, Maharashtra 410507, India

### Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Authentication:** JWT

### User Roles (6 roles)
1. Super User
2. Admin
3. Driver
4. Catcher
5. Veterinary Doctor
6. Caretaker

---

## What's Been Implemented (as of Jan 28, 2026)

### Core Features ✅
- [x] User authentication (JWT-based login/logout)
- [x] Role-based access control for 6 user roles
- [x] Dashboard with overview statistics
- [x] 300 kennels initialized in database
- [x] **18 Default Medicines initialized** (Jan 28, 2026) - All surgery medicines pre-loaded
- [x] **Google Drive Integration** (Jan 28, 2026) - OAuth-based image storage with folder hierarchy

### Forms & Workflows ✅
- [x] **Catching Form** - GPS extraction from photo EXIF data, photo upload with camera option
- [x] **Initial Observations** - Kennel assignment, animal assessment
- [x] **Surgery Form** - Auto-calculated medicine dosages (18 medicines), all fields visible and editable
- [x] **Daily Treatment** - Post-surgery care logging
- [x] **Daily Feeding** - Meal tracking
- [x] **Release Form** - Animal release documentation
- [x] **User Management** - CRUD for users
- [x] **Medicine Management** - Inventory tracking
- [x] **Food Stock Management** - Food inventory
- [x] **Bulk Upload** ✅ NEW (Jan 28, 2026) - Import Catching & Surgery records via Excel

### Auto Medicine Calculation ✅ NEW (Jan 28, 2026)
- [x] Medicine protocol with weight-based dosage rules
- [x] Fixed doses for ARV, Tribivet, Avil (1 ml/unit each)
- [x] Weight-based calculation (per 10kg) for Xylazine, Ketamine, etc.
- [x] Female-only medicines (Vicryl 2)
- [x] Auto-deduction from stock on surgery completion

### Reports ✅ (Fixed Jan 28, 2026)
- [x] **1. Catching Sheet** - Daily report of animals caught (printable)
- [x] **2. Case Papers** - Detailed printable report for individual dogs
- [x] **3. Monthly Log** - Summary with CSV/Excel export

### UI/UX ✅
- [x] Janice's Trust branding (logo integrated)
- [x] Green color scheme
- [x] Responsive navigation
- [x] Camera input option on all photo upload forms

---

## Prioritized Backlog

### P0 - Critical
- [x] **Multi-User Google Drive Auth** ✅ COMPLETED (Jan 30, 2026)
  - Fixed: Credentials now stored per-user in `users` collection
  - Each user connects their own Google Drive account
  - OAuth flow properly links to the authenticated user
  - Disconnect functionality added

### P1 - High Priority
- [x] ~~**Google Drive Integration**~~ ✅ COMPLETED (Jan 28, 2026)
- [x] ~~**Bulk Upload Module**~~ ✅ COMPLETED (Jan 28, 2026)
- [x] ~~**Auto Medicine Calculation**~~ ✅ COMPLETED (Jan 28, 2026)
  
### P2 - Medium Priority
- [ ] **Progressive Web App (PWA)** - Make app installable on Android devices
- [ ] **Backend Refactoring** - Split server.py into modular route files

### P3 - Low Priority / Future
- [ ] **Native Android App** - Using Mobile Agent
- [ ] **Mortality Tracking** - Death recording and certificates
- [ ] **Advanced Analytics** - Trends, charts, insights

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/auth/login | POST | User login |
| /api/auth/me | GET | Current user info |
| /api/config | GET | System configuration |
| /api/stats | GET | Dashboard statistics |
| /api/cases | GET/POST | Case management |
| /api/medicines | GET/POST | Medicine inventory |
| /api/food-items | GET/POST | Food inventory |
| /api/users | GET/POST | User management |
| /api/kennels | GET | Kennel status |
| /api/bulk-upload/template/{type} | GET | Download Excel template (catching/surgery) |
| /api/bulk-upload/catching | POST | Bulk upload catching records |
| /api/bulk-upload/surgery | POST | Bulk upload surgery records |
| /api/medicine-protocol | GET | Get medicine dosage rules |
| /api/calculate-medicines | POST | Calculate medicines for weight/gender |

---

## Test Credentials
- **Email:** manoj@janicestrust.org
- **Password:** Kashid@25067

---

## Key Files Reference
- `/app/backend/server.py` - Main backend (all routes)
- `/app/backend/models.py` - Database models
- `/app/frontend/src/components/BulkUpload.js` - Bulk upload module
- `/app/frontend/src/components/Reports.js` - Custom reports
- `/app/frontend/src/components/SurgeryForm.js` - Surgery with auto-calculation
- `/app/frontend/src/components/CatchingForm.js` - GPS extraction from photos

---

## Session Updates - Jan 28-29, 2026

### Completed
1. **Bulk Upload Module** - Upload Excel files for Catching and Surgery records
   - Template download with sample data
   - Validation for required fields
   - Error reporting per row
   
2. **Auto Medicine Calculation** - Automatic medicine stock deduction
   - Weight-based dosage calculation (10-30 kg range)
   - 18 medicines with specific protocols
   - Female-only medicines handled correctly
   - Cancelled surgeries skip deduction

3. **Configuration System** (Jan 29, 2026)
   - Organization settings: Name, Shortcode (JS), Logo, Registered Office
   - Project settings: Name, Code (TAL), Address, Max Kennels (1-300), Municipal Logo
   - Cloud storage: Google Drive connection
   - Case number format: **JS-TAL-JAN-0001** (Org-Project-Month-Serial)

4. **Auto Address Detection** (Jan 29, 2026)
   - Reverse geocoding using OpenStreetMap/Nominatim API
   - Auto-fills address when GPS is extracted from photo EXIF
   - Also works with "Use Current Location" button

5. **Reports with Images** (Jan 29, 2026)
   - Catching Sheet: Shows photos, organization/municipal logos
   - Case Papers: Shows catching & surgery photos, detailed medicine usage, post-op care
   - Monthly Log: CSV export with summary statistics

### Known Issues
- **Google Drive Multi-User** - Single token.json not suitable for multiple users
