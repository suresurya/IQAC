# AI-Powered IQAC Academic Intelligence & Accreditation Monitoring System

Full MERN project inside one workspace with:
- `frontend` (React + Tailwind + Chart.js)
- `backend` (Node + Express + MongoDB + JWT+LLM)

## Features Implemented

### Core Roles and Login
- Admin (IQAC), HOD, Faculty, Student roles
- JWT authentication
- Role-based route protection

### Academic Monitoring
- Student profile and semester-wise metrics
- CGPA trend, attendance pattern, backlog count
- Risk prediction engine (`LOW`, `MEDIUM`, `HIGH`)

### Department Monitoring
- Department creation and listing
- Department analytics (pass%, avg CGPA, backlog rate, placement rate)
- Placement and achievement data entry

### Faculty Inputs
- Upload marks
- Upload attendance
- Add research/publication records

### Accreditation Intelligence
- Store accreditation evidence for NAAC/NBA/AUDIT
- Filter by criterion/department/year/status
- Readiness score with missing items

### Automated Reports
- Report generation endpoint with PDF/Excel export
- Supported types:
  - Student Progress
  - Department Performance
  - CGPA Distribution
  - Backlog Analysis
  - Placement
  - Faculty Contribution
- Report history log

### Dashboard and Demo Flow
- Faculty Panel for marks and attendance upload
- Admin Dashboard with:
  - institutional analytics
  - department comparison chart
  - risk distribution chart
  - report download buttons
- Student dashboard with CGPA trend and risk badge

## Project Structure

```text
IQAC/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      utils/
  frontend/
    src/
      api/
      components/
      context/
      layouts/
      pages/
      styles/
```

## Setup

### 1) Backend

```bash
cd backend
npm install
```

Create `.env` using `.env.example` as template.

Update `.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/iqac_monitoring
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1d
```

Run backend:

```bash
npm run dev
```

Seed demo data:

```bash
npm run seed
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `.env` using `.env.example` as template.

Frontend runs on `http://localhost:5173`.

## Demo Credentials (after seed)

Password for all:

```text
Admin@123
```

Users:
- Admin: `admin@iqac.edu`
- HOD: `hod.cse@iqac.edu`
- Faculty: `faculty.cse@iqac.edu`
- Student: `ravi@student.iqac.edu`

## Key API Endpoints

- `POST /api/auth/login`
- `POST /api/auth/register` (admin only)
- `GET /api/analytics/overview`
- `GET /api/analytics/department-comparison`
- `GET /api/analytics/risk-students?risk=HIGH`
- `POST /api/faculty/students/:studentId/marks`
- `POST /api/faculty/students/:studentId/attendance`
- `POST /api/reports/generate`
- `GET /api/accreditation/readiness?type=NAAC`

## Notes

- Frontend build is validated.
- Backend requires MongoDB connection configured in `.env`.
- This is a hackathon-ready foundation and can be extended with advanced ML models, notifications, and full audit trails.
