# 🎯 Focal Point Compass — Complete Project Overview

**Last Updated:** 2026-04-22  
**Status:** ✅ Fully Operational — Production Ready  
**Version:** 1.0.0  
**Environment:** Development / Docker-Compose Production

> **For AI agents:** Read `codebase-snapshot.xml` for the full technical index.
> This file is a human-readable project overview and quick-start guide.

---

## 📋 Table of Contents

1. [Project Summary](#-project-summary)
2. [Architecture Overview](#-architecture-overview)
3. [Technology Stack](#-technology-stack)
4. [Project Structure](#-project-structure)
5. [All Implemented Features](#-all-implemented-features)
6. [API Modules](#-api-modules)
7. [Authentication & Authorization](#-authentication--authorization)
8. [Environment Variables](#-environment-variables)
9. [Development Workflow](#-development-workflow)
10. [Database Management](#-database-management)
11. [Deployment](#-deployment)
12. [Monitoring](#-monitoring)
13. [Testing](#-testing)
14. [Troubleshooting](#-troubleshooting)
15. [Change History](#-change-history)

---

## 🎯 Project Summary

**Focal Point Compass** is a comprehensive, enterprise-grade internal CRM platform managing the full business lifecycle:  
clients → leads → deals → projects → tasks → invoices → HR → analytics — all in one place.

### Current Status (April 2026)
| Area | Status | Notes |
|---|---|---|
| Backend API | ✅ Complete | 40+ endpoints, full CRUD on all modules |
| Frontend SPA | ✅ Complete | 35+ pages, role-gated, fully responsive |
| Database | ✅ Complete | 18+ Prisma models, 13 migrations applied |
| Authentication | ✅ Complete | JWT access+refresh, Google OAuth, email verify |
| Real-time | ✅ Complete | Socket.IO for live notifications |
| Email | ✅ Complete | Gmail SMTP via App Password (nodemailer) |
| File Upload | ✅ Complete | Multer → storage service (local/cloud) |
| Audit Logs | ✅ Complete | Every mutation logged to AuditLog table |
| Automation | ✅ Complete | Rule builder + automation engine + logs |
| CI/CD |    |  Not    | GitHub Actions — CI on PR, CD on merge to main |
| Monitoring | ✅ Complete | Prometheus + Grafana + Loki + Alertmanager |
| Comments | ✅ Complete | Per-entity comments (Tasks, Projects, etc.) |
| Attachments | ✅ Complete | Per-entity file attachments |

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│              FRONTEND  (React 18 + Vite)                   │
│  Port: 5173 (dev) / 80 via Nginx (prod)                    │
│  • 35+ Route Pages (role-gated via RouteAccessGuard)       │
│  • 5 React Contexts (Auth, Theme, Workspace, Realtime,     │
│    Notification)                                           │
│  • shadcn/ui + Tailwind CSS                                │
│  • Socket.IO client for real-time updates                  │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTP/REST + Socket.IO
┌──────────────────────────▼─────────────────────────────────┐
│              BACKEND  (Express.js + TypeScript)             │
│  Port: 3000                                                 │
│  • JWT Auth Middleware  → All protected routes             │
│  • Zod Validation       → All request bodies/queries       │
│  • asyncHandler()       → All controllers (no try/catch)   │
│  • Rate Limiting        → 100 req/15min global             │
│  • Prometheus Metrics   → /metrics endpoint                │
│  • Socket.IO Server     → Real-time event emitter          │
│  • Nodemailer           → Gmail SMTP (App Password)        │
│  • Multer               → File uploads                     │
│  • AuditLog             → Every mutation tracked           │
└──────────────────────────┬─────────────────────────────────┘
                           │ Prisma ORM
┌──────────────────────────▼─────────────────────────────────┐
│              DATABASE  (PostgreSQL 15)                      │
│  Local dev: SQLite (backend/prisma/dev.db)                  │
│  Production: PostgreSQL via DATABASE_URL                    │
│  • 18+ Prisma models                                       │
│  • 13 migrations applied (latest: 2026-04-21)              │
│  • Indexed for performance                                  │
└────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│          MONITORING  (Docker sidecar services)              │
│  • Prometheus :9090   → metrics scraping                   │
│  • Grafana    :3001   → dashboards                         │
│  • Loki       :3100   → log aggregation                    │
│  • Promtail           → log shipping                       │
│  • Alertmanager :9093 → alert routing                      │
└────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Backend
| Category | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 5 |
| Language | TypeScript 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL 15 / SQLite (dev) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod schemas |
| Real-time | Socket.IO |
| Email | Nodemailer (Gmail SMTP) |
| File Upload | Multer |
| Metrics | prom-client (Prometheus) |
| Logging | Winston + Morgan |
| Rate Limiting | express-rate-limit |
| Security | Helmet, CORS |
| Testing | Jest + Supertest + ts-jest |

### Frontend
| Category | Technology |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript 5 |
| Styling | Tailwind CSS + shadcn/ui (Radix UI) |
| Routing | React Router v6 |
| State | React Context API (5 contexts) |
| Data Fetching | Custom api-client (Axios-based) |
| Real-time | Socket.IO client |
| Testing | Vitest + React Testing Library + Playwright |
| Build | Vite (SSR + SPA mode) |
| Served By | Nginx (Docker prod) |

### Infrastructure
| Category | Technology |
|---|---|
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana + Loki + Alertmanager |
| Reverse Proxy | Nginx |

---

## 📁 Project Structure

```
CRM/                              ← Monorepo root
├── backend/
│   ├── src/
│   │   ├── config/               # env.ts, prisma.ts, types.ts
│   │   ├── controllers/          # 15 controllers (thin HTTP handlers)
│   │   ├── services/             # 25+ services (all business logic)
│   │   ├── routes/               # 25+ route files
│   │   ├── middleware/           # auth, error, validate, rate-limit, metrics
│   │   ├── validators/           # Zod schemas for every endpoint
│   │   ├── utils/                # jwt, password, audit, cache, mailer, logger...
│   │   ├── types/                # express.d.ts (req.user type extension)
│   │   ├── data/                 # crm-static.ts (lookup data)
│   │   ├── __tests__/            # Jest unit + integration tests
│   │   ├── app.ts                # Express app setup, all routes registered
│   │   ├── server.ts             # Entry point (HTTP listen)
│   │   └── socket.ts             # Socket.IO server setup
│   ├── prisma/
│   │   ├── schema.prisma         # 18+ models (source of truth)
│   │   └── migrations/           # 13 migration folders
│   ├── scripts/                  # seed.ts, seed-real-data.ts, smoke tests
│   ├── doc/                      # API_CONTRACT.md, dev guides
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/           # AppLayout, MasterSidebar, Navbar, Guards
│   │   │   ├── shared/           # StatCard, StatusBadge, SkeletonLoader, etc.
│   │   │   ├── crm/              # QuickCreateDialog, TaskDetailModal, etc.
│   │   │   ├── dashboard/        # DashboardCharts, PersonalizedFocus
│   │   │   ├── automation/       # RuleBuilder, RuleLogs
│   │   │   ├── skeletons/        # Loading skeleton components
│   │   │   └── ui/               # 70+ shadcn/ui components
│   │   ├── pages/                # 35+ route page components
│   │   ├── contexts/             # AuthContext, ThemeContext, RealtimeContext...
│   │   ├── hooks/                # use-crm-data, use-comments, use-attachments...
│   │   ├── lib/                  # api-client, design-tokens, utils, logger...
│   │   ├── services/             # crm.ts, auth.ts — typed API call functions
│   │   ├── types/                # crm.ts, automation.ts — all TS interfaces
│   │   ├── data/                 # mock-crm.ts (legacy, mostly unused)
│   │   ├── App.tsx               # Root router + all route definitions
│   │   └── main.tsx              # App bootstrap, all providers wrapped
│   ├── public/
│   ├── .env.example
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
│
├── monitoring/
│   ├── grafana/                  # Dashboards + datasource provisioning
│   ├── prometheus.yml
│   ├── loki-config.yml
│   ├── promtail-config.yml
│   ├── alertmanager.yml
│   └── alert-rules.yml
│
├── scripts/
│   ├── deploy.sh                 # Full production deployment
│   ├── api-test.sh               # API smoke test
│   └── update-snapshot.js        # Auto-updates codebase-snapshot.xml
│
├── codebase-snapshot.xml         # ← AI CONTEXT FILE (read this first!)
├── context.md                    # Comprehensive technical context
├── PROJECT_OVERVIEW.md           # This file
├── docker-compose.yml            # All services
├── start.sh                      # Dev startup script
└── prod.sh                       # Production startup
```

---

## ✨ All Implemented Features

### 🏠 Dashboard
- KPI stat cards (revenue, clients, leads, tasks, deals)
- Revenue trend charts (6-month)
- Pipeline breakdown chart
- Operating cadence radar chart (dynamic from DB)
- Recent activity feed
- Personalized daily focus panel
- Team collaborators list
- 28-day activity heatmap

### 👥 Client Management
- Full CRUD with pagination, search, filters
- Health score tracking (0–100)
- Client tiers: Enterprise / Growth / Strategic
- Client segments: Expansion / Renewal / New Business
- Notes, comments, and attachments per client

### 🎯 Sales Pipeline
- Leads: Kanban + table view, stage tracking, conversion
- Deals: Stage-based pipeline, probability, close date
- Contacts: Per-client contact management
- GTM Flow: Go-to-market pipeline visualization
- GTM Ops: Operational GTM management view

### 📁 Project & Task Management
- Projects: Full CRUD, budget tracking, team assignment, client link
- Tasks: Kanban board (drag-drop), priority, due dates, tags, assignees
- Task/Project detail modals: comments + attachments
- Quick-create dialog for any entity type
- Global ⌘K command palette

### 💰 Finance
- Invoices: Create, track status (draft/sent/paid/overdue), line items
- Reports: Revenue analytics, filterable by date range
- Billing: Admin billing management page
- Payroll: Generate and track employee payroll records

### 👷 HR Module
- Team Members: Employee profiles, department, designation, salary
- Teams: Create and manage teams with assigned managers
- Attendance: Check-in/out tracking, status (present/absent/late/halfday)
- Hiring: Job postings management (open/closed)
- Candidates: Application pipeline tracking with skills, resume link
- Create Team Member: Dedicated new-hire onboarding form

### 🤖 Automation
- Rule Builder: Visual trigger → condition → action rule creation
- Automation Engine: Runs rules on schedule / on events
- Automation Logs: History of rule executions
- Automation Alerts: Failed/triggered rule alerts
- Scheduled Automations: Time-based automation viewer
- GTM Automation: Sales lifecycle automation

### 💬 Communication
- Internal messaging system
- Calendar: Events, meetings, scheduling
- Meeting scheduler dialog
- Notes: Personal + entity-linked notes
- Activity feed: Global activity log per user/entity
- Comments: Inline comments on any Task, Project, etc.
- Attachments: File attachment on any entity

### 🔔 Real-time
- Socket.IO server → client push notifications
- Notification center (bell icon) with unread count
- Live event dispatch: `task:updated`, `lead:updated`, `deal:updated`, `notification`

### 🔐 Security & Auth
- JWT access token (24h) + refresh token (30d)
- Google OAuth (sign-in with Google)
- Email verification on signup
- Password reset flow (email-based)
- bcrypt password hashing (cost 10)
- Role-based access: admin / manager / employee / client
- Route-level guards (frontend + backend)
- Helmet security headers
- Rate limiting (100 req/15min)
- Full audit trail on all mutations

### 📊 Analytics & Monitoring
- Analytics page with executive-level charts
- Enhanced reports page with custom date ranges
- Prometheus metrics on all API endpoints
- Grafana dashboard pre-configured
- Loki log aggregation with Promtail
- Alertmanager for automated alert routing

### ⚙️ System
- Settings: Admin system configuration
- Integrations: Third-party integration management
- Roles & Permissions: RBAC management
- Audit Log: Full history of admin-visible mutations
- User Preferences: Per-user theme + notification + dashboard config
- CSV Import: Bulk data import

---

## 🔌 API Modules

| Module | Base Route | Auth Required | Admin/Manager Only |
|---|---|---|---|
| Auth | `/api/auth` | Some | No |
| Clients | `/api/clients` | Yes | Write ops |
| Leads | `/api/leads` | Yes | Write ops |
| Deals | `/api/deals` | Yes | Write ops |
| Contacts | `/api/contacts` | Yes | Write ops |
| Tasks | `/api/tasks` | Yes | No |
| Projects | `/api/projects` | Yes | Write ops |
| Invoices | `/api/invoices` | Yes | Yes |
| Notes | `/api/notes` | Yes | No |
| Comments | `/api/comments` | Yes | No |
| Attachments | `/api/attachments` | Yes | No |
| Team Members | `/api/team-members` | Yes | Yes |
| Teams | `/api/teams` | Yes | Admin |
| Attendance | `/api/attendance` | Yes | Manager+ |
| Payroll | `/api/payroll` | Yes | Admin |
| Hiring | `/api/hiring` | Yes | Manager+ |
| Candidates | `/api/candidates` | Yes | Manager+ |
| Calendar | `/api/calendar` | Yes | No |
| Meeting | `/api/meeting` | Yes | No |
| Communication | `/api/communication` | Yes | No |
| Automation | `/api/automation` | Yes | Admin |
| Dashboard | `/api/dashboard` | Yes | No |
| Reports | `/api/reports` | Yes | Manager+ |
| Activity | `/api/activity` | Yes | No |
| Search | `/api/search` | Yes | No |
| Preferences | `/api/preferences` | Yes | No |
| System | `/api/system` | Yes | Admin |
| Upload | `/api/upload` | Yes | No |
| CSV Import | `/api/csv-import` | Yes | Manager+ |

---

## 🔐 Authentication & Authorization

### Token System
- **Access Token:** 24h expiry, sent in `Authorization: Bearer {token}` header
- **Refresh Token:** 30d expiry, stored in DB, rotated on each use
- **Google OAuth:** `/api/google-auth` + `/api/google-auth/callback` (PKCE flow)
- **Email Verification:** Token sent via SMTP, verified at `/auth/verify-email`
- **Password Reset:** Token emailed, consumed at `/auth/reset-password`

### RBAC Summary
| Role | Typical Access |
|---|---|
| `admin` | Full system access, delete records, system settings, audit log |
| `manager` | Create/update clients, projects, tasks, team, payroll |
| `employee` | View/update own tasks, view clients/projects, own attendance |
| `client` | View own data only (invoices, projects assigned to them) |

---

## 🔧 Environment Variables

### Backend (`backend/.env`)
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/focal_point_compass

# JWT — generate with: openssl rand -base64 48
JWT_SECRET=<min-32-char-secret>
JWT_REFRESH_SECRET=<min-32-char-secret>

# Email (Gmail SMTP — requires App Password, NOT login password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   # 16-char Gmail App Password
FROM_EMAIL=noreply@yourcrm.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Storage (optional)
STORAGE_TYPE=local
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=   # optional
VITE_APP_ENV=development
```

> **Gmail SMTP Note:** Enable 2FA on Gmail, then generate a 16-char App Password at  
> myaccount.google.com → Security → 2-Step Verification → App Passwords.  
> Use this as `SMTP_PASS`. Do NOT use your Gmail login password.

---

## 🚀 Development Workflow

### Start Development Servers

```bash
# Option 1 — Script (starts both)
./start.sh

# Option 2 — Manual
# Terminal 1 — Backend
cd backend && npm run dev
# Runs at: http://localhost:3000

# Terminal 2 — Frontend
cd frontend && npm run dev
# Runs at: http://localhost:5173
```

### First-Time Setup

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Set up environment files
cd ../backend && cp .env.example .env   # Edit with your values
cd ../frontend && cp .env.example .env  # Edit with your values

# 3. Generate JWT secrets
openssl rand -base64 48   # Use for JWT_SECRET
openssl rand -base64 48   # Use for JWT_REFRESH_SECRET

# 4. Run database migrations
cd ../backend
npx prisma migrate dev

# 5. Seed sample data
npm run seed
# or: npx ts-node scripts/seed-real-data.ts

# 6. Start!
npm run dev
```

### Key Ports
| Service | Port | URL |
|---|---|---|
| Backend API | 3000 | http://localhost:3000 |
| Frontend Dev | 5173 | http://localhost:5173 |
| Prisma Studio | 5555 | http://localhost:5555 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3001 | http://localhost:3001 |

### Default Login Credentials (seeded)
- **Admin:** admin@crmpro.com / password123
- **Manager:** manager@crmpro.com / password123
- **Employee:** employee1@crmpro.com / password123

---

## 💾 Database Management

```bash
cd backend

# Apply pending migrations
npx prisma migrate dev

# Create a new migration
npx prisma migrate dev --name add_your_feature

# Open GUI
npx prisma studio

# Reset + reseed (WARNING: deletes all data)
npx prisma migrate reset

# Seed data
npm run seed
# OR for realistic data:
npx ts-node scripts/seed-real-data.ts

# Sync schema without migration (dev only)
npx prisma db push

# Pull schema from existing DB
npx prisma db pull

# Regenerate Prisma client
npx prisma generate
```

### Current Models (18 total)
`User` | `Client` | `Lead` | `Deal` | `Contact` | `Task` | `Project` | `Invoice` | `Team` | `TeamMember` | `Attendance` | `Payroll` | `Candidate` | `HiringJob` | `Note` | `Comment` | `Attachment` | `CalendarEvent` | `AutomationRule` | `AuditLog` | `Preferences`

### Migration History
| Date | Migration | Change |
|---|---|---|
| 2026-03-30 | initial_schema | Core models: User, Client, Lead, Deal, Task, Project, Invoice |
| 2026-04-02 | add_audit_log | AuditLog table |
| 2026-04-05 | add_teams | Teams + TeamMembers |
| 2026-04-06 | add_calendar_payroll | CalendarEvent + Payroll |
| 2026-04-06 | add_task_project_id | Task.projectId FK |
| 2026-04-06 | add_user_signature_url | User.signatureUrl |
| 2026-04-07 | add_job_candidate_columns | Candidate extra fields |
| 2026-04-08 | add_candidate_skill_phone | skills(Json), phone |
| 2026-04-09 | add_comments | Comment table |
| 2026-04-09 | add_attachments | Attachment table |
| 2026-04-21 | add_created_by_to_resources | createdBy on Deal, Project, Invoice, Candidate |

---

## 🐳 Deployment

### Docker Compose (Production)

```bash
# Start all services
./prod.sh
# or:
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all
docker-compose down

# Full deploy with rebuild
./scripts/deploy.sh
```

### Services in docker-compose.yml
- `backend` → Node.js API on :3000
- `frontend` → Nginx-served React app on :80
- `postgres` → PostgreSQL :5432
- `prometheus` → Metrics :9090
- `grafana` → Dashboards :3001
- `loki` → Logs :3100
- `alertmanager` → Alerts :9093

### CI/CD (GitHub Actions)
- **CI pipeline** → Runs on PR: lint, typecheck, unit tests, build
- **CD pipeline** → Runs on merge to `main`: SSH to EC2, pull, build, migrate, restart

---

## 📊 Monitoring

```bash
# Prometheus metrics
http://localhost:9090

# Grafana dashboards (admin/admin default)
http://localhost:3001

# Pre-built CRM dashboard
monitoring/grafana/dashboards/crm-monitoring.json

# Raw metrics endpoint (backend)
http://localhost:3000/metrics
```

---

## 🧪 Testing

```bash
# Backend — all tests
cd backend && npm test

# Backend — watch mode
npm run test:watch

# Backend — specific file
npx jest src/__tests__/clients.service.test.ts

# Frontend — all tests
cd frontend && npm run test

# Frontend — coverage
npm run test:coverage

# E2E tests (Playwright)
cd frontend && npm run test:e2e

# API smoke test
./scripts/api-test.sh
```

### Test Files
**Backend:** `src/__tests__/` — auth, clients, invoices, projects, tasks, notes, team-members, error-middleware, query-validation, gtm-automation  
**Frontend:** `src/pages/__tests__/` — ClientsPage, TeamsPage; `src/components/shared/__tests__/` — StatCard; `src/services/__tests__/` — crm

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Port conflict
lsof -ti:3000 | xargs kill -9

# Prisma client outdated
cd backend && npx prisma generate && npm run dev

# DB connection error
npx prisma db pull   # Validate connection
```

### Frontend won't start
```bash
# Port conflict
lsof -ti:5173 | xargs kill -9

# Dependency issues
cd frontend && rm -rf node_modules && npm install && npm run dev
```

### Email not sending
```bash
# SMTP_PASS must be 16-char App Password (NOT Gmail login password)
# Gmail → Security → 2-Step Verification → App Passwords → Generate

# Test SMTP from backend
cd backend
node -e "
const n=require('nodemailer');
const t=n.createTransport({host:'smtp.gmail.com',port:587,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
t.verify((e,s)=>console.log(e||'SMTP OK'));
"
```

### Database issues
```bash
cd backend
npx prisma migrate status        # Check pending migrations
npx prisma migrate dev           # Apply pending
npx prisma migrate reset         # ⚠️ WIPES DATA — reset + reseed
```

### Snapshot not updating
```bash
# Install git hook for automatic updates
node scripts/update-snapshot.js --install-hook

# Manual update
node scripts/update-snapshot.js
```

---

## 📚 Documentation Reference

| File | Purpose |
|---|---|
| `codebase-snapshot.xml` | **AI context file** — full architecture, API index, dependency graph |
| `context.md` | Deep technical documentation for developers |
| `PROJECT_OVERVIEW.md` | This file — quick-start + feature reference |
| `backend/doc/API_CONTRACT.md` | Full API spec with TypeScript request/response types |
| `backend/doc/BACKEND_DEVELOPMENT_GUIDE.md` | Backend dev patterns, conventions |
| `backend/doc/BACKEND_QUICK_REFERENCE.md` | Cheat sheet for backend work |
| `frontend/PROJECT_CONTEXT.md` | Frontend architecture context |

---

## 📈 Change History

| Date | Change |
|---|---|
| 2026-04-22 | Updated codebase-snapshot.xml, context.md, PROJECT_OVERVIEW.md with latest state |
| 2026-04-21 | Added `createdBy` to Deal, Project, Invoice, Candidate |
| 2026-04-17 | Gmail SMTP configured via App Password |
| 2026-04-10 | CI/CD GitHub Actions pipeline added |
| 2026-04-09 | Comments + Attachments tables + APIs; TeamsPage JSX fixed |
| 2026-04-05 | Dashboard Operating Cadence widget migrated to live DB data |
| 2026-04-04 | TaskCard ReferenceError fixed; unified edit mode completed |
| 2026-03-31 | Full migration from localStorage/mock to PostgreSQL backend |
| 2026-03-30 | Initial schema + core API |

---

**Built with ❤️ — Focal Point Compass CRM**  
*For AI agents: Always read `codebase-snapshot.xml` before making changes.*  
*Last Updated: 2026-04-22*
