# CareFlow-HMS — Hospital Management System

CareFlow-HMS is a next-generation Hospital Management System built with a modular, decoupled full-stack architecture and a modern **Glassmorphism** clinical design identity.

---

## 🏛 Architecture Overview

- **Frontend**: React (Create React App), React Router DOM v7, Axios, Lucide React, Glassmorphic Design Tokens (Teal / Cyan / Medical Slate).
- **Backend**: Python 3.14, Django 6.1, Django REST Framework, Simple JWT Authentication, drf-spectacular (OpenAPI 3 / Swagger), django-cors-headers.
- **Database**: PostgreSQL (Target dedicated database: `careflow_hms_db` on port 5432) — completely isolated from legacy databases.

---

## 📂 Project Directory Structure

```text
CareFlow-HMS/
├── backend/
│   ├── config/                     # Django project configuration
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py             # Environment-aware settings (DRF, JWT, CORS, Postgres)
│   │   ├── urls.py                 # API routes, Swagger UI, ReDoc, health check
│   │   └── wsgi.py
│   ├── venv/                       # Dedicated Python virtual environment
│   ├── manage.py                   # Django management entry point
│   ├── requirements.txt            # Locked backend dependencies
│   ├── .env                        # Local development environment configuration
│   ├── .env.example                # Placeholder template for backend env vars
│   └── .gitignore
├── frontend/
│   ├── public/
│   │   ├── favicon.svg             # Vital-sign ECG browser favicon
│   │   └── index.html              # App entry with Plus Jakarta Sans & Inter typography
│   ├── src/
│   │   ├── assets/
│   │   │   └── logo.svg            # Reusable SVG Vital-Sign ECG brand asset
│   │   ├── components/
│   │   │   └── common/
│   │   │       ├── Logo.js         # Scalable CareFlow brand mark component
│   │   │       ├── Navbar.js       # Frosted glass navigation with live status
│   │   │       ├── Footer.js       # Glassmorphic footer
│   │   │       ├── GlassCard.js    # Reusable frosted glass panel component
│   │   │       ├── StatusBadge.js  # Semantic clinical status badges
│   │   │       └── LoadingSpinner.js # Vital pulse medical loading indicator
│   │   ├── pages/
│   │   │   ├── HomePage.js         # Setup overview & live API connection ping
│   │   │   └── NotFoundPage.js     # Glassmorphic 404 state
│   │   ├── services/
│   │   │   ├── api.js              # Axios client with JWT interceptors
│   │   │   └── authService.js      # JWT token management helper
│   │   ├── styles/
│   │   │   ├── variables.css       # Glassmorphism design tokens (Teal, Cyan, Blurs)
│   │   │   ├── glassmorphism.css   # Glass cards, buttons, badges, pulse animations
│   │   │   └── index.css           # Global reset & clinical ambient background mesh
│   │   ├── utils/
│   │   │   └── constants.js        # Route paths & system constants
│   │   ├── App.js                  # Routing & layout shell
│   │   ├── App.css
│   │   └── index.js
│   ├── package.json
│   ├── package-lock.json
│   ├── .env                        # Frontend environment variables (REACT_APP_)
│   ├── .env.example                # Frontend template
│   └── .gitignore
├── .gitignore                      # Root Git ignore rules
└── README.md                       # Master setup documentation
```

---

## ⚡ Quick Start Guide

### 1. Starting the Frontend (React)

Open a terminal in the project root:

```bash
cd frontend
npm start
```

The application will start at **http://localhost:3000** with hot reload.

### 2. Starting the Backend (Django REST Framework)

Open a second terminal in the project root:

```powershell
cd backend
.\venv\Scripts\activate
python manage.py runserver
```

The API will start at **http://localhost:8000**.

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SECRET_KEY` | Django cryptographic secret key | Configured for dev |
| `DEBUG` | Enable debug mode | `True` |
| `ALLOWED_HOSTS` | Permitted server hosts | `localhost,127.0.0.1` |
| `DB_ENGINE` | Database engine | `django.db.backends.postgresql` |
| `DB_NAME` | Database name | `careflow_hms_db` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | Stored securely in `.env` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `CORS_ALLOWED_ORIGINS`| Allowed origins for frontend | `http://localhost:3000,http://127.0.0.1:3000` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `REACT_APP_API_BASE_URL` | Base URL for backend endpoints | `http://localhost:8000/api` |
| `REACT_APP_NAME` | Application display name | `CareFlow-HMS` |
| `REACT_APP_VERSION` | Application semantic version | `1.0.0` |

---

## 📡 API Endpoints & Documentation

Once the backend server is running:

- **Swagger UI Interactive Docs**: `http://localhost:8000/api/docs/`
- **ReDoc API Documentation**: `http://localhost:8000/api/redoc/`
- **OpenAPI 3 Schema (YAML)**: `http://localhost:8000/api/schema/`
- **System Health Check**: `http://localhost:8000/api/health/` (Includes database live connectivity verification)
- **JWT Token Pair (Login)**: `http://localhost:8000/api/auth/token/`
- **JWT Token Refresh**: `http://localhost:8000/api/auth/token/refresh/`
- **JWT Token Verify**: `http://localhost:8000/api/auth/token/verify/`
- **JWT Token Blacklist (Logout)**: `http://localhost:8000/api/auth/token/blacklist/`
- **Admin Database Backups**: `http://localhost:8000/api/admin/backups/`
- **Frontend Error Logging**: `http://localhost:8000/api/logs/frontend/`
- **Django Administration**: `http://localhost:8000/admin/`

---

## 💾 Database Backup & Recovery System

CareFlow HMS features an enterprise-grade, automated, and audited PostgreSQL database backup and recovery system.

### Key Capabilities
- **PostgreSQL Native Utilities**: Utilizes `pg_dump` and `pg_restore` with custom archive compression format (`-Fc`).
- **Cryptographic & Archive Verification**: Every backup undergoes SHA-256 checksum generation and `pg_restore -l` table-of-contents validation before being marked successful.
- **Audit Ledger**: All backups, file sizes, checksums, statuses (`SUCCESS`, `FAILED`, `RESTORED`), creator, and restorer accounts are permanently logged in `accounts_databasebackuprecord`.
- **Pre-Restore Snapshot Safeguard**: Prior to any database restoration, the system automatically captures an emergency pre-restore snapshot (`pre_restore_safety_*`).
- **Accidental Overwrite Protection**: Restoration requires typing an exact confirmation phrase: `RESTORE-CONFIRM-<filename>`.
- **Automated Retention Management**: Configurable retention policies (`BACKUP_RETENTION_DAYS`, `BACKUP_MAX_COUNT`) automatically prune obsolete archive files while preserving database audit logs.
- **Secure File Storage**: Archives are stored in a dedicated directory outside any public or web-accessible root.

### Management Commands (CLI)

```powershell
# Create a manual database backup
python manage.py backup_db --note "Pre-deployment clinical backup"

# Run automated scheduled backup (prunes expired backups according to retention policy)
python manage.py backup_db --automated

# Restore from a backup with mandatory confirmation safeguard
python manage.py restore_db careflow_backup_20261102_120000.dump --confirm=RESTORE-CONFIRM-careflow_backup_20261102_120000.dump

# Restore to an alternate staging database
python manage.py restore_db careflow_backup_20261102_120000.dump --confirm=RESTORE-CONFIRM-careflow_backup_20261102_120000.dump --target-db careflow_staging_db
```

### Administrator Web Portal (`/admin/backups`)
- Access via the **Database Backup** navigation item in the Administrator sidebar.
- Features real-time backup metrics (total archives, healthy rate, storage consumed).
- One-click "Create Backup Now" modal with optional notes.
- Download archive files directly through authenticated streams.
- Interactive, multi-step Restore Confirmation modal with strict confirmation text entry.

---

## 🔒 Session Management & API Security

### Intelligent JWT Session Lifecycle
- **Automatic Token Refresh**: Axios interceptors detect expired access tokens (`401 Unauthorized`), hold concurrent requests in an in-memory queue (`failedQueue`), fetch a fresh access token via `/api/auth/token/refresh/`, and transparently replay the queued requests.
- **Server-Side Token Revocation**: Logout actively blacklists the refresh token at `/api/auth/token/blacklist/` using SimpleJWT's token blacklist app, terminating the session on both client and server.
- **Race Condition Prevention**: Refresh locking flags (`isRefreshing`) prevent duplicate refresh calls during parallel component data fetches.

### Rate Limiting & Throttling
DRF throttles are enforced across sensitive system endpoints:
- Anonymous Requests: `120 requests / minute`
- Authenticated Users: `300 requests / minute`
- Authentication & Login: `10 requests / minute`
- OTP Generation & Verification: `5 requests / minute`
- Sensitive Admin Operations: `15 requests / minute`

### Security Headers & Production Hardening
- `SECURE_BROWSER_XSS_FILTER = True`
- `SECURE_CONTENT_TYPE_NOSNIFF = True`
- `X_FRAME_OPTIONS = 'DENY'`
- `SECURE_HSTS_SECONDS = 31536000` (in production)
- Strict Cross-Origin Resource Sharing (CORS) whitelisting.

---

## 🛡 Centralized Error Handling & Logging

### React Error Boundary
- Root-level `<ErrorBoundary>` wraps the entire React component tree.
- Catches unhandled runtime rendering exceptions and presents a glassmorphic fallback card.
- User recovery actions: "Try Again", "Reload Page", or "Return to Home".
- Automatically reports unhandled client-side stack traces to the backend via `POST /api/logs/frontend/`.

### Centralized DRF Exception Handler
- Custom handler `careflow_exception_handler` intercepts all API exceptions.
- Formats standard, uniform JSON error structures across all endpoints:
  ```json
  {
    "status": "error",
    "error_code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource could not be found.",
    "errors": { ... }
  }
  ```
- In production (`DEBUG=False`), unhandled 500 errors are masked with generic user-friendly messages while full stack traces are routed to rotating log files.

### Centralized Rotating Logs
Located in `backend/logs/`:
- `careflow.log`: General application and clinical workflow activity.
- `errors.log`: Unhandled server and client-side exceptions.
- `security.log`: Authentication attempts, OTP verifications, and rate throttling violations.
- `backups.log`: Backup executions, restorations, checksum validations, and retention prunings.

---

## ♿ User Experience & Accessibility

- **Reusable Glassmorphic Pagination**: `<Pagination>` component integrated across all 6 roles and 18+ data-intensive list views. Supports Previous/Next, smart ellipsis windowing, and page size selection (`10`, `20`, `50`, `100`).
- **Accessible Modals (`ModalPortal`)**: Fully WCAG 2.1 AA compliant with:
  - Accessible ARIA role (`role="dialog"`), `aria-modal="true"`, and `aria-labelledby`.
  - Focus trapping: Tab and Shift+Tab remain contained within the modal dialog.
  - Automatic focus on the first interactive element upon open.
  - Focus restoration: Automatically restores focus to the triggering element upon close.
  - Keyboard Escape key closes the active modal dialog.
- **Reduced Motion Support**: All animations respect the user's `prefers-reduced-motion: reduce` system preference.
- **Zero Native Browser Dialogs**: No native `alert()`, `confirm()`, or `prompt()` calls; all confirmations use glassmorphic modal dialogs and toasts.

---

## 🧪 Testing & Verification

### Running Backend Test Suite
Run all 108 automated unit and integration tests:

```powershell
cd backend
.\venv\Scripts\activate
python manage.py test accounts appointments billing laboratory patients pharmacy staff --noinput
```

*Results: 108 tests passing (100% success rate).*

### Verifying Frontend Production Build

```powershell
cd frontend
npm run build
```

*Results: Compiled successfully with zero warnings and zero errors.*

---

## 🗄 PostgreSQL Database Isolation & Setup

To ensure complete safety and isolation from any legacy CareFlow installations:
- Dedicated database name: **`careflow_hms_db`**
- Service status: Verified running on Windows (`postgresql-x64-18` on port 5432)
- Database credentials and connection string are managed exclusively via environment variables
- Database creation and initial migrations require explicit user confirmation before execution.
