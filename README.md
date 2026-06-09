# TCSuite

**School Management Platform** for The Creative School — a full-stack web application for student administration, fee collection, invoicing, and financial reporting.

TCSuite brings enrollment, class management, monthly billing, receipt tracking, and balance-sheet reporting into a single secure interface for school staff and administrators.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Documentation](#documentation)
- [Development Notes](#development-notes)

---

## Features

### Student Management
- Enroll, view, edit, and manage student profiles
- Search and filter by name, admission number, B-Form, guardian, class, and status
- Class-wise grouped view
- Per-student fee history organized by academic year
- Individual monthly fee overrides and arrear tracking

### Classes & Academic Calendar
- Class definitions with display sort order and active/inactive status
- Sync classes from existing student records
- Academic year management with current-year designation

### Fee Management
- **Fee Structures** — default monthly rates by class
- **Fee Dashboard** — class-level analytics for any billing period
- **Fee Records** — central ledger for payments, adjustments, and status tracking
- **Bulk record generation** — create monthly records for an entire class at once
- **Advance payments** — multi-month prepaid fee processing
- **Receipt lookup** — find records by receipt number (`YYYY-NNNN` format)
- **Miscellaneous charges** — supplementary billing with categorized defaults
- **Balance Sheet** — annual summaries with archived snapshots and PDF export

### Documents & Reports
- Individual student invoices (PDF and printable views)
- Class collection sheets
- Bulk invoice booklets (multi-student PDF)
- Annual balance sheet PDFs

### Dashboard & UX
- KPI overview: total students, collections, outstanding balance, paid count
- Top defaulters list with quick navigation
- Light / dark theme toggle
- Responsive layout with glassmorphism UI

### Security
- JWT-based authentication (Simple JWT)
- Protected API routes — admin access required by default
- CORS configured for local frontend development

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | [Django 5](https://www.djangoproject.com/) |
| **API** | [Django REST Framework](https://www.django-rest-framework.org/) |
| **Authentication** | [Simple JWT](https://django-rest-framework-simplejwt.readthedocs.io/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) |
| **PDF Generation** | [ReportLab](https://www.reportlab.com/) |
| **Frontend** | [React 18](https://react.dev/) |
| **Build Tool** | [Vite 5](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) |
| **HTTP Client** | [Axios](https://axios-http.com/) |
| **Routing** | [React Router 6](https://reactrouter.com/) |
| **Notifications** | [React Hot Toast](https://react-hot-toast.com/) |
| **Config** | [python-decouple](https://github.com/HBNetwork/python-decouple) |

---

## Project Structure

```
thcs/
├── accounts/                 # Authentication & admin profile endpoints
├── students/                 # Student models, serializers, and API
├── fees/                     # Fee management, PDF generation, balance sheets
├── the_creative_school/      # Django project settings and root URLs
├── frontend/                 # React SPA (Vite + Tailwind)
│   ├── src/
│   │   ├── api/              # Axios API clients
│   │   ├── components/       # Layout, Sidebar, Modal, Badge, etc.
│   │   ├── contexts/         # Auth and theme providers
│   │   ├── hooks/            # Shared React hooks
│   │   └── pages/            # Dashboard, Students, Fees modules
│   └── vite.config.js        # Dev server + API proxy
├── scripts/                  # Utility scripts (e.g. user manual generator)
├── docs/                     # Generated documentation (user manual)
├── manage.py
├── requirements.txt
└── .env.example
```

---

## Prerequisites

- **Python** 3.11+ (3.13 tested)
- **Node.js** 18+ and npm
- **PostgreSQL** database (local or hosted)
- **Git**

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd thcs
```

### 2. Backend setup

```bash
# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (see below)
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux

# Run migrations
python manage.py migrate

# Create a superuser for admin login
python manage.py createsuperuser

# Start the Django development server
python manage.py runserver
```

The API will be available at **http://127.0.0.1:8000/**.

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The React app will be available at **http://localhost:5173/**.

Vite proxies `/api` and `/admin` requests to the Django backend automatically.

### 4. Log in

Use the superuser credentials created with `createsuperuser` to sign in through the frontend login page.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for development, `False` for production |
| `ALLOWED_HOSTS` | Comma-separated hostnames (optional, defaults to `localhost,127.0.0.1`) |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | Database host |
| `DB_PORT` | Database port (default: `5432`) |

> **Note:** The default database configuration uses `sslmode=require`. Adjust `OPTIONS` in `the_creative_school/settings.py` if your local PostgreSQL instance does not require SSL.

---

## API Overview

Base URL: `http://127.0.0.1:8000`

| Endpoint | Description |
|----------|-------------|
| `GET /` | API health check and endpoint index |
| `POST /api/accounts/login/` | Obtain JWT access + refresh tokens |
| `POST /api/accounts/refresh/` | Refresh access token |
| `GET /api/accounts/me/` | Current admin profile |
| `/api/students/` | Student CRUD |
| `/api/fees/classrooms/` | Class management |
| `/api/fees/academic-years/` | Academic year management |
| `/api/fees/structures/` | Fee structure management |
| `/api/fees/records/` | Fee records, payments, PDFs, bulk ops |
| `/api/fees/charge-categories/` | Misc. charge category catalog |
| `/api/fees/misc-charges/` | Student miscellaneous charges |
| `/api/fees/saved-balance-sheets/` | Archived balance sheet snapshots |
| `/admin/` | Django admin panel |

### Notable fee record actions

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/fees/records/lookup-receipt/?receipt=` | Receipt number lookup |
| `POST` | `/api/fees/records/bulk-generate/` | Generate records for a class |
| `POST` | `/api/fees/records/advance-payment/` | Multi-month advance payment |
| `PATCH` | `/api/fees/records/{id}/record-payment/` | Record a payment |
| `GET` | `/api/fees/records/{id}/invoice-pdf/` | Download student invoice PDF |
| `GET` | `/api/fees/records/bulk-invoices-pdf/` | Bulk class invoices PDF |
| `GET` | `/api/fees/records/balance-sheet/` | Annual balance sheet data |
| `GET` | `/api/fees/records/balance-sheet-pdf/` | Balance sheet PDF |
| `GET` | `/api/fees/records/top-defaulters/` | Dashboard defaulter list |

All protected endpoints require a valid JWT in the `Authorization: Bearer <token>` header.

---

## Documentation

An official user manual can be generated as a Word document:

```bash
# Requires python-docx; pywin32 recommended on Windows for TOC page numbers
pip install python-docx pywin32

python scripts/generate_user_manual.py
```

Output: `docs/TCSuite_User_Manual.docx`

---

## Development Notes

### Production build (frontend)

```bash
cd frontend
npm run build
```

Built assets are output to `frontend/dist/`.

### Receipt numbers

Receipt numbers follow the format **`YYYY-NNNN`** (e.g. `2026-0001`). The sequence resets each calendar year and is never reused.

### Fee record statuses

| Status | Meaning |
|--------|---------|
| `unpaid` | No payment received |
| `partial` | Partially paid |
| `paid` | Fully paid |
| `advance` | Prepaid before billing cycle |
| `waived` | Fee exempted |

### Key Django apps

| App | Responsibility |
|-----|----------------|
| `accounts` | JWT login, token refresh, admin profile |
| `students` | Student profile CRUD and search |
| `fees` | All fee-related models, business logic, and PDF exports |

---

## License

Internal use — The Creative School. All rights reserved.
