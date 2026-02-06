# ABC Program Management System (J-APP)
## Product Requirements Document

### Overview
Animal Birth Control (ABC) Program Management System for **Janice Smith Animal Welfare Trust** - a comprehensive multi-project system to manage the entire workflow of animal sterilization programs across multiple cities/projects.

### Organization Details
- **Organization:** Janice Smith Animal Welfare Trust
- **Organization Code:** JS (2 letters)
- **Multi-Project Architecture:** Each city/municipal corporation runs as independent project

---

## Multi-Project Architecture (NEW - Jan 31, 2026)

### Project Structure
- **Super Admin**: Global access to all projects
- **Project-specific users**: Each project has independent users (no sharing)
- **URL Format**: `j-app.in/{project-code}/` (e.g., `j-app.in/vvc/`, `j-app.in/tal/`)
- **Project Code**: 3 letters (e.g., VVC, TAL)

### Project Creation
When Super Admin creates a project:
1. Organization name (default: Janice Smith Animal Welfare Trust)
2. Organization logo (upload)
3. Project name (e.g., "Vasai Virar Municipal Corporation ABC Project")
4. Project logo (upload)
5. Project code (3 letters, e.g., "VVC")
6. Admin user (name, email, password)

### Case Number Format
`JS-{PROJECT}-{MONTH}-{TYPE}{SEQUENCE}`
- Example: `JS-VVC-JAN-C0001` (Catching)
- Example: `JS-VVC-JAN-S0001` (Surgery)

### Google Drive Structure
```
{PROJECT}/Catching/Year/Month/A/{case-number}.jpg
{PROJECT}/Catching/Year/Month/B/{case-number}.jpg

Example:
VVC/Catching/2026/Jan/A/JS-VVC-JAN-C0001.jpg
VVC/Surgery/2026/Jan/A/JS-VVC-JAN-C0001.jpg
```

### Database Collections (per project)
All collections filtered by `project_id`:
- `cases` - Animal cases
- `users` - Project users
- `medicines` - Medicine inventory
- `food_items` - Food inventory
- `kennels` - Kennel status
- `medicine_logs` - Usage tracking

---

### Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Authentication:** JWT

### User Roles (6 roles)
1. Super Admin (Global - access all projects)
2. Admin (Project-level)
3. Driver
4. Catcher
5. Veterinary Doctor
6. Caretaker

---

## What's Been Implemented (as of Jan 31, 2026)

### Core Features ✅
- [x] User authentication (JWT-based login/logout)
- [x] Role-based access control for 6 user roles
- [x] Dashboard with overview statistics
- [x] 300 kennels initialized in database
- [x] **18 Default Medicines initialized** (Jan 28, 2026) - All surgery medicines pre-loaded
- [x] **Google Drive Integration** (Jan 28, 2026) - OAuth-based image storage with folder hierarchy
- [x] **Multi-User Google Drive** (Jan 30, 2026) - Per-user Drive credentials, each user connects their own account

### Multi-Project Architecture ✅ (Jan 31, 2026)
- [x] Project model with all required fields
- [x] User model updated with project_id
- [x] Drive uploader updated for project-based folders
- [x] Month names in folder paths (Jan, Feb, etc.)
- [x] **Phase 1: Database & Model updates** - COMPLETED
- [x] **Phase 2: Backend API refactoring** - COMPLETED (Jan 31, 2026)
  - All API endpoints updated to filter by project_id
  - Super Admin (project_id=None) has global access
  - Regular users can only access their project's data
  - Project CRUD endpoints created (GET, POST, PUT, DELETE /api/projects)
  - Cases, kennels, medicines, food items, daily feeding all project-aware
  - Bulk upload endpoints updated for project context
  - Medicine/food stock logs include project_id
- [ ] **Phase 3: Frontend implementation** - PENDING
  - Project Creation Wizard UI
  - URL routing for projects (e.g., /vvc/dashboard)
  - Project selector for Super Admin

### Forms & Workflows ✅
- [x] **Catching Form** - GPS extraction from photo EXIF data, photo upload with camera option
- [x] **Initial Observations** - Kennel assignment, animal assessment
- [x] **Surgery Form** - Auto-calculated medicine dosages (18 medicines), all fields visible and editable
- [x] **Daily Treatment** - Post-surgery care logging with standard protocol
- [x] **Daily Feeding** - Meal tracking
- [x] **Release Form** - Animal release documentation
- [x] **User Management** - CRUD for users
- [x] **Medicine Management** - Inventory tracking with usage reports
- [x] **Food Stock Management** - Food inventory
- [x] **Bulk Upload** ✅ (Jan 28, 2026) - Import Catching & Surgery records via Excel
- [x] **Records View** ✅ (Jan 31, 2026) - View all records with pagination and date filters

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
- [x] **Multi-Tenancy Backend (Phase 2)** ✅ COMPLETED (Jan 31, 2026)
  - All API endpoints filter by project_id
  - 37/37 backend tests pass

### P1 - High Priority
- [x] ~~**Google Drive Integration**~~ ✅ COMPLETED (Jan 28, 2026)
- [x] ~~**Bulk Upload Module**~~ ✅ COMPLETED (Jan 28, 2026)
- [x] ~~**Auto Medicine Calculation**~~ ✅ COMPLETED (Jan 28, 2026)
- [ ] **Multi-Tenancy Frontend (Phase 3)** - Project Creation Wizard, URL routing
  
### P2 - Medium Priority
- [ ] **Progressive Web App (PWA)** - Make app installable on Android devices
- [ ] **Backend Refactoring** - Split server.py into modular route files
- [ ] **Resume VPS Deployment** - Deploy to 66.116.226.85 with multi-tenant support

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
| /api/drive/connect | GET | Initiate Google Drive OAuth (per-user) |
| /api/drive/status | GET | Check user's Drive connection status |
| /api/drive/disconnect | POST | Disconnect user's Google Drive |
| /api/drive/upload-test | POST | Test upload to user's Drive |
| /api/drive/callback | GET | OAuth callback handler |

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
- ~~**Google Drive Multi-User** - Single token.json not suitable for multiple users~~ ✅ FIXED

---

## Session Updates - Feb 6, 2026

### Completed Features

1. **Editable Dates in Forms** ✅
   - **Daily Feeding**: Added `feeding_date` editable field (defaults to today)
   - **Release Form**: Added `release_date` and `release_time` editable fields
   - **Daily Treatment**: Added `treatment_date` editable field
   - **Initial Observations**: Added `observation_date` and `observation_time` editable fields
   - Backend updated to accept frontend field names (`feeding_date`, `treatment_date`, `date_time`, `observation_date`)

2. **User Management Enhancements** (Previous Session) ✅
   - Project selector for Superadmins on login
   - User assignment to projects
   - Edit/Delete user functionality
   - Manual password entry on user creation

3. **Collapsible Operations Menu** ✅
   - Navigation sidebar groups Catching, Observations, Surgery, Treatment, Feeding, Release, Records under "Operations"

4. **Editable Catching/Surgery Records** (Previous Session) ✅
   - Tables showing recent catchings and surgeries in their respective forms
   - Edit functionality for individual records

### Pending Issues (P2)
- **Photos on Reports**: Images not displaying on Catching Sheet and Case Paper reports
- **GPS EXIF Extraction**: Auto-detection of GPS coordinates from photo metadata not working

### Next Steps
- Deploy to Emergent platform with custom domain `j-app.in`
- Backend refactoring (split server.py into modules)
- PWA conversion for mobile
