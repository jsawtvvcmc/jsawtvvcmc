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

### Forms & Workflows ✅
- [x] **Catching Form** - GPS extraction from photo EXIF data, photo upload with camera option
- [x] **Initial Observations** - Kennel assignment, animal assessment
- [x] **Surgery Form** - Auto-calculated medicine dosages (19 medicines), all fields visible and editable
- [x] **Daily Treatment** - Post-surgery care logging
- [x] **Daily Feeding** - Meal tracking
- [x] **Release Form** - Animal release documentation
- [x] **User Management** - CRUD for users
- [x] **Medicine Management** - Inventory tracking
- [x] **Food Stock Management** - Food inventory

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

### P1 - High Priority
- [ ] **Google Drive Integration** - For image storage (currently Base64 in MongoDB)
  - Requires: User to provide Google Drive API Service Account JSON key
  
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
| /api/token | POST | User login |
| /api/users/me | GET | Current user info |
| /api/config | GET | System configuration |
| /api/stats | GET | Dashboard statistics |
| /api/cases | GET/POST | Case management |
| /api/medicines | GET/POST | Medicine inventory |
| /api/food | GET/POST | Food inventory |
| /api/users | GET/POST | User management |
| /api/kennels | GET | Kennel status |

---

## Test Credentials
- **Email:** manoj@janicestrust.org
- **Password:** Kashid@25067

---

## Key Files Reference
- `/app/backend/server.py` - Main backend (all routes)
- `/app/backend/models.py` - Database models
- `/app/frontend/src/components/Reports.js` - Custom reports
- `/app/frontend/src/components/SurgeryForm.js` - Surgery with auto-calculation
- `/app/frontend/src/components/CatchingForm.js` - GPS extraction from photos
