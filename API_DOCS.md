# CareFlow-HMS — REST API Documentation

CareFlow Hospital Management System provides a secure, fully documented OpenAPI 3.0 / Swagger REST API powered by Django REST Framework and `drf-spectacular`.

---

## 🌐 Live Interactive API Documentation

When the backend development server is running (`http://127.0.0.1:8000`):

| Documentation Interface | URL | Description |
| :--- | :--- | :--- |
| **Swagger UI (Interactive)** | [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/) | Test and explore endpoints directly in your browser |
| **ReDoc (Modern Reader)** | [http://127.0.0.1:8000/api/redoc/](http://127.0.0.1:8000/api/redoc/) | Clean, searchable, three-panel reference view |
| **OpenAPI 3.0 Schema (YAML)** | [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/) | Raw OpenAPI 3.0 YAML schema |
| **Static Schema File** | [backend/schema.yml](file:///c:/Users/chara/OneDrive/Desktop/CareFlow-HMS/backend/schema.yml) | Exported OpenAPI 3.0 specification file |

---

## 🔑 Authentication & Authorization

All clinical and administrative endpoints require JWT Bearer Authentication.

```http
Authorization: Bearer <your_jwt_access_token>
```

### Authentication Endpoints (`/api/auth/`)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Self-registration for patients (dispatches 6-digit email OTP) | Public |
| `POST` | `/api/auth/verify-otp/` | Verify email OTP & issue JWT access/refresh tokens | Public |
| `POST` | `/api/auth/resend-otp/` | Request a fresh 6-digit OTP code | Public |
| `POST` | `/api/auth/token/` | Login with username/email and password to get JWT | Public |
| `POST` | `/api/auth/token/refresh/` | Obtain fresh access token using refresh token | Public |
| `POST` | `/api/auth/token/verify/` | Verify token validity | Public |
| `GET` | `/api/auth/profile/` | Fetch authenticated user profile and healthcare role | Authenticated |
| `PUT` | `/api/auth/change-password/` | Change account password | Authenticated |
| `POST` | `/api/auth/password-reset/request/` | Request password reset link via registered email | Public |
| `POST` | `/api/auth/password-reset/confirm/` | Confirm password reset with secure UID and token | Public |

---

## 🏥 Clinical & Management Modules

### 1. Patients Module (`/api/patients/`)
- `GET /api/patients/` — List patient records (Admin, Receptionist, Doctor)
- `POST /api/patients/` — Register a patient (Admin, Receptionist). *Automatically emails credentials to patient.*
- `GET /api/patients/{id}/` — Retrieve patient clinical file
- `PUT/PATCH /api/patients/{id}/` — Update patient demographics
- `DELETE /api/patients/{id}/` — Deactivate patient record

### 2. Staff & Doctors Module (`/api/staff/`)
- `GET /api/staff/doctors/` — Doctor directory
- `POST /api/staff/doctors/` — Create doctor account. *Automatically emails login credentials.*
- `GET /api/staff/doctors/{id}/` — Retrieve doctor details & schedule
- `PUT/PATCH /api/staff/doctors/{id}/` — Update doctor profile
- `GET /api/staff/profiles/` — List staff (Lab Staff, Pharmacist, Receptionist)
- `POST /api/staff/profiles/` — Create staff account. *Automatically emails login credentials.*

### 3. Appointments Module (`/api/appointments/`)
- `GET /api/appointments/` — List appointments (filter by date, doctor, status)
- `POST /api/appointments/` — Book a new appointment slot
- `GET /api/appointments/{id}/` — Appointment details
- `PUT/PATCH /api/appointments/{id}/` — Update appointment or clinical notes
- `POST /api/appointments/{id}/cancel/` — Cancel scheduled appointment

### 4. Pharmacy & Tablets Module (`/api/pharmacy/`)
- `GET /api/pharmacy/medicines/` — Search medicine inventory / tablets
- `POST /api/pharmacy/medicines/` — Add new medicine to inventory (Admin, Pharmacist)
- `GET /api/pharmacy/medicines/{id}/` — Retrieve medicine info & stock levels
- `PUT/PATCH /api/pharmacy/medicines/{id}/` — Update stock, price, dosage
- `DELETE /api/pharmacy/medicines/{id}/` — Remove or archive medicine
- `GET /api/pharmacy/prescriptions/` — List prescriptions
- `POST /api/pharmacy/prescriptions/` — Doctor writes clinical prescription
- `POST /api/pharmacy/prescriptions/{id}/dispense/` — Pharmacist dispenses prescription

### 5. Laboratory Module (`/api/laboratory/`)
- `GET /api/laboratory/tests/` — Test catalog (Blood work, X-Ray, MRI, etc.)
- `POST /api/laboratory/orders/` — Doctor orders lab investigation
- `GET /api/laboratory/orders/` — Lab staff order queue
- `POST /api/laboratory/orders/{id}/results/` — Upload results and reference ranges

### 6. Billing & Invoicing Module (`/api/billing/`)
- `GET /api/billing/invoices/` — Invoices directory
- `POST /api/billing/invoices/` — Generate hospital bill
- `POST /api/billing/payments/` — Record cash/card/insurance payment

### 7. System Health Check
- `GET /api/health/` — Live service health, database status, and API version
