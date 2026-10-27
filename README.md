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
- **System Health Check**: `http://localhost:8000/api/health/`
- **JWT Token Pair (Login)**: `http://localhost:8000/api/auth/token/`
- **JWT Token Refresh**: `http://localhost:8000/api/auth/token/refresh/`
- **JWT Token Verify**: `http://localhost:8000/api/auth/token/verify/`
- **Django Administration**: `http://localhost:8000/admin/`

---

## 🗄 PostgreSQL Database Isolation & Setup

To ensure complete safety and isolation from any legacy CareFlow installations:
- Dedicated database name: **`careflow_hms_db`**
- Service status: Verified running on Windows (`postgresql-x64-18` on port 5432)
- Database credentials and connection string are managed exclusively via environment variables
- Database creation and initial migrations require explicit user confirmation before execution.
