# FlowSync — Comprehensive Technical Context

**Last Updated:** 2026-04-22  
**Project Status:** ✅ Production Ready — 100% Complete  
**Version:** 1.0.0  
**Architecture:** Full-Stack TypeScript Monorepo

> **For AI agents:** This document is the deep technical reference.  
> Start with `codebase-snapshot.xml` for the compact architecture map.  
> `PROJECT_OVERVIEW.md` has the quick-start and feature checklist.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack (Exact Versions)](#2-technology-stack-exact-versions)
3. [System Architecture](#3-system-architecture)
4. [Backend Deep-Dive](#4-backend-deep-dive)
5. [Frontend Deep-Dive](#5-frontend-deep-dive)
6. [Database Schema](#6-database-schema)
7. [API Reference Patterns](#7-api-reference-patterns)
8. [Authentication & Security](#8-authentication--security)
9. [Real-time (Socket.IO)](#9-real-time-socketio)
10. [Email System](#10-email-system)
11. [File Upload System](#11-file-upload-system)
12. [Automation Engine](#12-automation-engine)
13. [Monitoring Stack](#13-monitoring-stack)
14. [CI/CD Pipeline](#14-cicd-pipeline)
15. [Environment Configuration](#15-environment-configuration)
16. [Code Patterns & Conventions](#16-code-patterns--conventions)
17. [Testing Strategy](#17-testing-strategy)
18. [Development Workflow](#18-development-workflow)
19. [Deployment & Infrastructure](#19-deployment--infrastructure)
20. [Troubleshooting Reference](#20-troubleshooting-reference)
21. [Change History & Known Issues](#21-change-history--known-issues)

---

## 1. Executive Summary

**FlowSync** is an enterprise-grade CRM platform covering the complete business lifecycle:

- **Sales:** Leads → Deals → Clients → Contacts → GTM pipeline
- **Work:** Projects → Tasks → Calendar → Notes → Meetings → Activity feed
- **Finance:** Invoices → Payroll → Reports → Analytics → Billing
- **HR:** Team Members → Teams → Attendance → Hiring → Candidates
- **Automation:** Rules engine + event triggers + scheduled jobs + logs
- **Communication:** Internal messaging + real-time notifications (Socket.IO)
- **System:** Settings + Integrations + RBAC + Audit Log + Preferences

### Architecture Character
- **Monorepo:** `backend/` (Express API) + `frontend/` (React SPA) + `monitoring/` + `scripts/`
- **Fully backend-driven:** Zero mock/localStorage data. All state from PostgreSQL via REST API.
- **Real-time:** Socket.IO pushes live events to all connected clients.
- **Role-gated:** Every route (frontend + backend) is guarded by RBAC.
- **Audit-trailed:** Every mutation writes an AuditLog record.
- **Dockerized:** Full docker-compose stack for local and production.

---

## 2. Technology Stack (Exact Versions)

### Backend
```
Node.js              18+
TypeScript           5.9.2
Express.js           5.1.0
Prisma               6.19.2         ORM + migrations
PostgreSQL           15+            Production DB
SQLite               (dev.db)       Local/dev DB via Prisma
jsonwebtoken         9.0.2          JWT access + refresh tokens
bcryptjs             2.4.3          Password hashing
nodemailer           8.0.4          Email sending (Gmail SMTP)
socket.io            (server)       Real-time WebSocket events
multer               2.1.1          Multipart file uploads
zod                  3.x            Request body/query validation
helmet               8.1.0          Security HTTP headers
express-rate-limit   8.3.1          Rate limiting
prom-client          15.1.3         Prometheus metrics
winston              3.19.0         Structured logging
morgan               1.10.1         HTTP request logging
jest                 30.0.5         Unit + integration tests
supertest            7.1.4          API endpoint testing
ts-jest                             TypeScript test runner
tsx / ts-node                       TypeScript execution (scripts)
```

### Frontend
```
React                18.3.1
TypeScript           5.8.3
Vite                 8.0.3          Build tool + dev server
Tailwind CSS         3.4.17         Utility-first styling
shadcn/ui            2.1.4          Component library (Radix UI primitives)
React Router         6.30.1         Client-side routing
socket.io-client                    Real-time event subscription
Framer Motion        12.38.0        Animation library
Recharts             2.15.4         Chart library
Lucide React         0.462.0        Icon set
React Hook Form      7.61.1         Form state management
Zod (frontend)       3.25.76        Frontend form validation
React Day Picker     8.10.1         Date picker
Vitest               3.2.4          Frontend unit tests
React Testing Library               Component testing
Playwright           1.57.0         End-to-end tests
ESLint               9.32.0         Linting
```

---

## 3. System Architecture

### Request Lifecycle (Backend)
```
HTTP Request
  ↓
express-rate-limit middleware          (100 req/15min global)
  ↓
helmet + cors middleware               (security headers)
  ↓
morgan middleware                      (HTTP request log)
  ↓
metrics.middleware                     (Prometheus counter increment)
  ↓
Route matching (app.ts)
  ↓
auth.middleware                        (JWT verify → req.user = {id, email, role})
  ↓
validate.middleware(zodSchema)         (Zod parse → 400 if invalid)
  ↓
Controller function (asyncHandler)     (thin HTTP layer — no try/catch needed)
  ↓
Service function                       (business logic, Prisma calls, RBAC check)
  ↓
Prisma ORM                             (type-safe DB query)
  ↓
PostgreSQL / SQLite
  ↓
audit.ts logAuditEvent()              (on mutations only)
  ↓
Response JSON
  ↓
error.middleware (global catch)        (formats any thrown errors)
```

### Frontend Render Lifecycle
```
main.tsx
  → AuthContext (reads JWT from localStorage, validates /auth/me)
  → ThemeContext (reads theme from localStorage)
  → WorkspaceContext
  → RealtimeContext (opens Socket.IO connection if authenticated)
  → NotificationContext
  → App.tsx (React Router routes)
      → RouteAccessGuard (checks req role vs allowedRoles prop)
          → AppLayout (MasterSidebar + Navbar + outlet)
              → Page component
                  → api-client.ts (auto-attaches Bearer token)
                  → services/crm.ts or services/auth.ts
                  → Backend REST API
                  → State updated → re-render
```

---

## 4. Backend Deep-Dive

### Entry Points
| File | Role |
|---|---|
| `backend/src/server.ts` | HTTP server start — `app.listen(PORT)` |
| `backend/src/app.ts` | Express app config — all middleware + route registration |
| `backend/src/socket.ts` | Socket.IO server — event handlers, auth via JWT |

### Middleware Stack (in order, `app.ts`)
```typescript
app.use(helmet())                         // Security headers
app.use(cors({ origin: FRONTEND_URL }))   // CORS
app.use(express.json())                   // JSON body parser
app.use(morgan('combined'))               // HTTP logs
app.use(metricsMiddleware)                // Prometheus
app.use(rateLimitMiddleware)              // 100 req/15min
// ... routes registered here
app.use(errorMiddleware)                  // Global error handler (LAST)
```

### Controller Pattern
```typescript
// Controllers are thin — only HTTP concerns
// Never use try/catch — asyncHandler does it
export const createClient = asyncHandler(async (req, res) => {
  const data = createClientSchema.parse(req.body);   // Zod validation
  const client = await clientsService.create(data, req.user);
  res.status(201).json(client);
});
```

### Service Pattern
```typescript
// Services own ALL business logic
// They call Prisma, check RBAC, write audits, use cache
export async function create(data, user) {
  if (!canAccess(user.role, 'clients', 'create')) {
    throw new ForbiddenError('Insufficient permissions');
  }
  const client = await prisma.client.create({ data: { ...data } });
  await logAuditEvent('client.create', user.id, 'Client', client.id, data);
  return client;
}
```

### Utility Functions Reference
| Utility | File | Usage |
|---|---|---|
| `asyncHandler(fn)` | `utils/async-handler.ts` | Wraps every controller fn |
| `logAuditEvent(action, userId, entity, entityId, meta)` | `utils/audit.ts` | Call in all service mutations |
| `canAccess(role, resource, action)` | `utils/access-control.ts` | RBAC check in services |
| `generateAccessToken(user)` | `utils/jwt.ts` | 24h JWT |
| `generateRefreshToken(user)` | `utils/jwt.ts` | 30d JWT |
| `hashPassword(plain)` | `utils/password.ts` | bcrypt hash |
| `comparePassword(plain, hash)` | `utils/password.ts` | bcrypt compare |
| `sendMail(to, subject, html)` | `utils/mailer.ts` | Nodemailer send |
| `cache.get/set(key, fn, ttl)` | `utils/cache.ts` | In-memory TTL cache |
| `logger.info/warn/error(msg)` | `utils/logger.ts` | Structured logging |

### Route Registration (`app.ts`)
All routes are mounted at `/api/*`:
```typescript
app.use('/api/auth',           authRouter);
app.use('/api/clients',        authMiddleware, clientsRouter);
app.use('/api/leads',          authMiddleware, leadsRouter);
// ... (25+ routers total, see codebase-snapshot.xml for full list)
```

---

## 5. Frontend Deep-Dive

### Context Hierarchy (wrap order in `main.tsx`)
```tsx
<AuthContext>          // User auth state, login/logout, token management
  <ThemeContext>       // Dark/light mode, persisted to localStorage
    <WorkspaceContext> // Org/workspace settings
      <RealtimeContext> // Socket.IO connection (only when authenticated)
        <NotificationContext> // In-app notification queue
          <App />      // Router + all pages
```

### AuthContext — Key API
```typescript
const { user, login, logout, isAuthenticated, isLoading } = useAuth();
// user: { id, name, email, role, employeeId, department, ... }
// login(email, password) → calls /api/auth/login → stores tokens
// logout() → calls /api/auth/logout → clears tokens
// isAuthenticated: boolean
// isLoading: true during initial /auth/me check
```

### api-client.ts — How API Calls Work
```typescript
// frontend/src/lib/api-client.ts
// All calls go through this — never use raw fetch/axios in components

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,   // from frontend/.env
});

// Request interceptor — attaches JWT
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — auto-refresh on 401
apiClient.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      // Attempt token refresh
      // On success: retry original request
      // On failure: logout user
    }
    return Promise.reject(err);
  }
);
```

### Adding a New Page (Checklist)
1. Create `frontend/src/pages/YourPage.tsx`
2. Add route in `frontend/src/App.tsx`:
   ```tsx
   <Route path="/your-path" element={
     <RouteAccessGuard allowedRoles={['admin', 'manager']}>
       <YourPage />
     </RouteAccessGuard>
   } />
   ```
3. Add sidebar entry in `frontend/src/components/layout/sidebarConfig.ts` (if needed)
4. Add API calls in `frontend/src/services/crm.ts`
5. Add TypeScript types in `frontend/src/types/crm.ts`

### Key shadcn/ui Components Used
```
Dialog, Sheet          → Modals and side panels
Table                  → All list/data tables
Form + Input           → All forms (with React Hook Form)
Button, Badge          → Actions and status indicators
Select, Popover        → Dropdowns and filters
Tabs                   → Page sub-navigation
Card                   → Dashboard widgets and data cards
Skeleton               → Loading states
Toast (Sonner)         → Success/error notifications
Command                → ⌘K command palette (CommandPalette.tsx)
Calendar               → Date picking
Chart (Recharts)       → Dashboard charts
```

---

## 6. Database Schema

### Entity Relationships
```
User
  ├── TeamMember (1:M) — links users to Teams
  ├── AuditLog (1:M)
  ├── Preferences (1:1)
  ├── Attendance (1:M)
  └── Payroll (1:M)

Client
  ├── Lead (1:M)
  ├── Deal (1:M)
  ├── Contact (1:M)
  ├── Project (1:M)
  └── Invoice (1:M)

Project
  ├── Task (1:M)        — tasks belong to projects (optional FK)
  ├── Comment (1:M)     — entityType = 'project'
  └── Attachment (1:M)  — entityType = 'project'

Task
  ├── Comment (1:M)     — entityType = 'task'
  └── Attachment (1:M)  — entityType = 'task'

Team
  └── TeamMember (1:M)

Note               — polymorphic: entityType + entityId
Comment            — polymorphic: entityType + entityId
Attachment         — polymorphic: entityType + entityId
AutomationRule     — standalone (trigger/conditions/actions as Json)
AuditLog           — append-only log (action + userId + entityType + entityId + meta)
CalendarEvent      — standalone (attendees as Json)
HiringJob          — standalone
Candidate          — standalone (skills as Json)
```

### Model Field Notes
- **`createdBy`** — Added 2026-04-21 to `Deal`, `Project`, `Invoice`, `Candidate`. Stores `userId` string.
- **Polymorphic pattern** — `Note`, `Comment`, `Attachment` use `entityType` (string) + `entityId` (Int) to attach to any entity.
- **Json fields** — `AutomationRule.conditions`, `AutomationRule.actions`, `Candidate.skills`, `CalendarEvent.attendees`, `Invoice.items`, `Preferences.notifications`, `Preferences.dashboardLayout`
- **Soft deletes** — NOT implemented at model level; deletions are hard-deletes. Audit log tracks deleted records.
- **Migrations** — Always use `npx prisma migrate dev --name description`. Never edit `schema.prisma` without migrating.

---

## 7. API Reference Patterns

### Standard Response Shape
```typescript
// List endpoints
{ data: T[], pagination: { page, limit, total, totalPages } }

// Single item
T  (or { data: T } in some endpoints)

// Mutation success
T  (the updated/created record) or { message: string }

// Error
{ error: string, details?: object }  (from error.middleware)
```

### Common Query Params (list endpoints)
```
page     number   default 1
limit    number   default 50, max 100
search   string   searches name/email/title fields
sort     string   field to sort by
order    'asc'|'desc'  sort direction (default: desc)
status   string   filter by status field
```

### HTTP Status Codes Used
| Code | Meaning |
|---|---|
| 200 | OK — GET, PATCH, DELETE success |
| 201 | Created — POST success |
| 400 | Bad Request — validation error (Zod) |
| 401 | Unauthorized — missing/invalid JWT |
| 403 | Forbidden — insufficient role |
| 404 | Not Found — entity doesn't exist |
| 409 | Conflict — duplicate (e.g., email already exists) |
| 429 | Too Many Requests — rate limit hit |
| 500 | Internal Server Error — unhandled exception |

### Adding a New API Endpoint (Checklist)
1. Add Zod schema to `backend/src/validators/{module}.schema.ts`
2. Add method to `backend/src/services/{module}.service.ts` (business logic)
3. Add handler to `backend/src/controllers/{module}.controller.ts` (wrap in `asyncHandler`)
4. Add route in `backend/src/routes/{module}.routes.ts`
5. Register router in `backend/src/app.ts` (if new module)
6. Update `codebase-snapshot.xml` api-index section

---

## 8. Authentication & Security

### JWT Flow
```
Signup/Login
  → auth.service.create/login()
  → generateAccessToken(user)   → JWT signed with JWT_SECRET, exp: 24h
  → generateRefreshToken(user)  → JWT signed with JWT_REFRESH_SECRET, exp: 30d
  → Both tokens returned in response body
  → Frontend stores in localStorage

API Request
  → api-client.ts attaches: Authorization: Bearer {accessToken}
  → auth.middleware.ts verifies token → populates req.user
  
Token Refresh
  → Frontend interceptor catches 401
  → POST /api/auth/refresh with refreshToken
  → New accessToken returned (refresh token rotated)

Logout
  → POST /api/auth/logout
  → Refresh token invalidated in DB
  → Frontend clears localStorage
```

### Google OAuth Flow
```
Frontend: Click "Sign in with Google"
  → /api/google-auth → redirect to Google
  → Google callback → /api/google-auth/callback
  → google-auth.service.ts: find or create User (googleId field)
  → Generate JWT pair → redirect to frontend with tokens
  → Frontend GoogleCallbackPage.tsx parses tokens from URL
```

### Email Verification Flow
```
Signup → auth.service creates User with isVerified=false + verificationToken
  → sendMail() sends token link to user email
  → User clicks link → POST /api/auth/verify-email { token }
  → auth.service validates token → isVerified=true
```

### Password Reset Flow
```
POST /api/auth/forgot-password { email }
  → Creates resetToken + resetTokenExpiry on User
  → sendMail() with reset link

POST /api/auth/reset-password { token, newPassword }
  → Validates token + expiry
  → hashPassword(newPassword) → updates User
  → Clears resetToken
```

### Security Headers (Helmet)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` (configured)
- `Strict-Transport-Security` (HTTPS only)

### Rate Limits
- **Global:** 100 requests per 15 minutes per IP
- **Auth endpoints** (login/signup/forgot-password): stricter limits in `rate-limit.middleware.ts`

---

## 9. Real-time (Socket.IO)

### Server Setup (`backend/src/socket.ts`)
```typescript
// Socket auth — verifies JWT on handshake
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const user = verifyToken(token);   // throws if invalid
  socket.data.user = user;
  next();
});

// Connection handler
io.on('connection', (socket) => {
  socket.join(`user:${socket.data.user.id}`);  // Personal room
  // Event handlers registered here
});

// Emitting events from services:
io.to(`user:${userId}`).emit('notification', { ... });
io.emit('task:updated', { taskId, changes });   // Broadcast to all
```

### Client Setup (`frontend/src/contexts/RealtimeContext.tsx`)
```typescript
const socket = io(VITE_SOCKET_URL, {
  auth: { token: accessToken }
});

socket.on('notification', (data) => {
  // → NotificationContext.dispatch({ type: 'ADD', payload: data })
});

socket.on('task:updated', (data) => {
  // → Trigger re-fetch of tasks list
});
```

### Events Reference
| Event | Direction | Payload |
|---|---|---|
| `notification` | Server → Client | `{ id, type, message, entityId, entityType }` |
| `task:updated` | Server → All | `{ taskId, changes }` |
| `lead:updated` | Server → All | `{ leadId, changes }` |
| `deal:updated` | Server → All | `{ dealId, changes }` |
| `connect` | System | — |
| `disconnect` | System | — |

---

## 10. Email System

### Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx    # 16-char Gmail App Password
FROM_EMAIL=noreply@yourcrm.com
```

> ⚠️ **Critical:** `SMTP_PASS` must be a **Gmail App Password** (16 chars, no spaces in actual value).  
> NOT your Gmail login password.  
> Setup: Gmail → Security → 2-Step Verification → App Passwords → Select "Mail" → Generate.

### Email Templates (`backend/src/utils/email-templates.ts`)
| Template | Trigger |
|---|---|
| Welcome email | User signup |
| Email verification | Signup (with token link) |
| Password reset | Forgot password request |
| Salary processed | Payroll generation |
| Task assigned | Task assignee change |
| Invoice sent | Invoice status → 'sent' |

### Sending Email
```typescript
// From any service:
import { sendMail } from '../utils/mailer';

await sendMail(
  'recipient@example.com',
  'Subject here',
  '<h1>HTML body here</h1>'
);
```

---

## 11. File Upload System

### How It Works
```
POST /api/upload  (multipart/form-data)
  → multer middleware (backend/src/routes/upload.routes.ts)
  → storage.service.ts
      → if STORAGE_TYPE=local: saves to /uploads/ directory
      → if STORAGE_TYPE=s3: uploads to S3 bucket
  → returns { url, filename, size, mimeType }

POST /api/attachments  (multipart/form-data)
  → attachments.routes.ts
  → attachments.service.ts
  → Calls upload internally + creates Attachment record in DB
  → Linked to entity via entityType + entityId
```

### Attachment Retrieval
```
GET /api/attachments?entityType=task&entityId=123
  → Returns all Attachment records for that entity
  → Each has { id, filename, url, size, mimeType, uploadedBy, createdAt }
```

---

## 12. Automation Engine

### Architecture
```
AutomationRule (DB)
  ├── trigger: 'lead.created' | 'deal.closed' | 'scheduled' | ...
  ├── conditions: Json  [{ field, operator, value }, ...]
  └── actions: Json     [{ type, params }, ...]

automation-engine.ts
  → loadActiveRules() from DB
  → evaluateConditions(entity, conditions)
  → executeActions(actions)
      → 'send_email': sendMail(...)
      → 'update_field': prisma.model.update(...)
      → 'create_task': tasksService.create(...)
      → 'notify': socket.emit(...)

automation.service.ts
  → CRUD for AutomationRule
  → trigger(ruleId): manual trigger
  → getLogs(): paginated execution history

gtm-automation.service.ts + gtm-lifecycle.service.ts
  → Go-to-market specific automation logic
  → Lead lifecycle stage transitions
  → Pipeline velocity tracking
```

### Frontend Pages
- `AutomationRulesPage.tsx` → List + create/edit/delete rules via `RuleBuilder.tsx`
- `AutomationLogsPage.tsx` → Execution history with status
- `AutomationAlertsPage.tsx` → Failed/warning alerts
- `AutomationScheduledPage.tsx` → Scheduled rule viewer

---

## 13. Monitoring Stack

### Services (docker-compose.yml)
| Service | Port | Purpose |
|---|---|---|
| Prometheus | 9090 | Scrapes `/metrics` from backend |
| Grafana | 3001 | Visualizes Prometheus + Loki data |
| Loki | 3100 | Log aggregation backend |
| Promtail | — | Ships backend logs to Loki |
| Alertmanager | 9093 | Routes alerts to email/Slack |

### Metrics Collected (`backend/src/utils/metrics.ts`)
- HTTP request count (by method, route, status code)
- HTTP request duration histogram
- Active WebSocket connections
- DB query duration (via Prisma middleware)
- Custom business metrics (new leads, deals closed, etc.)

### Grafana Setup
- Dashboard pre-provisioned: `monitoring/grafana/dashboards/crm-monitoring.json`
- Datasources pre-provisioned: `monitoring/grafana/provisioning/datasources/datasources.yml`
- Default login: `admin` / `admin` (change on first login)

### Alert Rules (`monitoring/alert-rules.yml`)
- High error rate (5xx > 5%)
- High latency (p95 > 2s)
- Backend down
- DB connection failures

---

## 14. CI/CD Pipeline

### GitHub Actions Workflows
```
.github/workflows/
  ├── ci.yml    → Runs on every PR
  └── cd.yml    → Runs on merge to main
```

### CI Pipeline (ci.yml)
```yaml
on: [pull_request]
jobs:
  test:
    - npm install (backend + frontend)
    - npx prisma generate
    - npm run lint (backend + frontend)
    - npx tsc --noEmit (typecheck)
    - npm test (backend Jest)
    - npm run test (frontend Vitest)
    - npm run build (frontend Vite build)
```

### CD Pipeline (cd.yml)
```yaml
on: push to main
jobs:
  deploy:
    - SSH to EC2 server
    - git pull origin main
    - npm install (backend + frontend)
    - npx prisma migrate deploy   # Production-safe migration
    - npm run build (backend)
    - npm run build (frontend)
    - pm2 restart backend (or docker-compose up -d)
    - Health check /api/health
```

---

## 15. Environment Configuration

### Backend `backend/.env` (full reference)
```env
# Application
NODE_ENV=development          # development | production
PORT=3000
FRONTEND_URL=http://localhost:5173   # CORS allowed origin

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/focal_point_compass
# For local dev (SQLite):
# DATABASE_URL=file:./prisma/dev.db

# JWT — generate: openssl rand -base64 48
JWT_SECRET=<min-32-char-secret>
JWT_REFRESH_SECRET=<min-32-char-different-secret>

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=xxxxxxxxxxxxxxxx    # 16-char App Password (no spaces)
FROM_EMAIL=noreply@yourcrm.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/google-auth/callback

# Storage
STORAGE_TYPE=local            # local | s3
# If s3:
# AWS_BUCKET=your-bucket
# AWS_REGION=ap-south-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
```

### Frontend `frontend/.env` (full reference)
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=         # optional, for Google Sign-In button
VITE_APP_ENV=development       # development | production
```

### Common Wrong Values (fixed)
| ❌ Wrong | ✅ Correct |
|---|---|
| `VITE_API_BASE_URL` | `VITE_API_URL` |
| `VITE_USE_REMOTE_API` | Not used — remove |
| `VITE_ENABLE_ANALYTICS` | Not used — remove |
| `JWT_ACCESS_SECRET` | `JWT_SECRET` |
| Frontend port `8080` | Frontend port `5173` (Vite default) |
| `SMTP_PASS=gmailpassword` | `SMTP_PASS=16charAppPassword` |

---

## 16. Code Patterns & Conventions

### File Naming
```
Backend:
  {module}.controller.ts     → HTTP handlers
  {module}.service.ts        → Business logic
  {module}.routes.ts         → Express router
  {module}.schema.ts         → Zod validators
  {module}.service.test.ts   → Jest tests

Frontend:
  PascalCase.tsx             → Pages and components (ClientsPage.tsx)
  use-camel-case.ts          → Custom hooks (use-crm-data.ts)
  camel-case.ts              → Libraries and utilities (api-client.ts)
  camelCase.ts               → Config files (sidebarConfig.ts)
```

### TypeScript Conventions
```typescript
// Backend — always type req.user (via express.d.ts):
declare global {
  namespace Express {
    interface Request {
      user: { id: string; email: string; role: string };
    }
  }
}

// Frontend — all entity types in frontend/src/types/crm.ts
// Always import types from there, never define inline

// Zod schema then TypeScript type:
const createClientSchema = z.object({ name: z.string(), ... });
type CreateClientInput = z.infer<typeof createClientSchema>;
```

### Error Throwing Pattern (Backend)
```typescript
// In services — throw custom errors, asyncHandler catches them
import { createError } from 'http-errors';  // or custom error classes

throw createError(404, 'Client not found');
throw createError(403, 'Insufficient permissions');
throw createError(409, 'Email already exists');
// error.middleware.ts formats these into { error: message }
```

### RBAC Pattern
```typescript
// Backend — in service function:
import { canAccess } from '../utils/access-control';
if (!canAccess(user.role, 'clients', 'delete')) {
  throw createError(403, 'Only admins can delete clients');
}

// Frontend — route level:
<RouteAccessGuard allowedRoles={['admin']}>
  <SettingsPage />
</RouteAccessGuard>

// Frontend — element level:
<AdminOnly>
  <DeleteButton />
</AdminOnly>
```

### Prisma Query Patterns
```typescript
// Always use include for relations when needed
const client = await prisma.client.findUnique({
  where: { id },
  include: { leads: true, deals: true }
});

// Pagination pattern
const [data, total] = await prisma.$transaction([
  prisma.client.findMany({ skip: (page-1)*limit, take: limit, where }),
  prisma.client.count({ where }),
]);
return { data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } };

// Audit log after every mutation
await logAuditEvent('client.create', user.id, 'Client', client.id, { name: client.name });
```

---

## 17. Testing Strategy

### Backend Tests (Jest + Supertest)
Location: `backend/src/__tests__/`

```bash
cd backend

npm test                                          # All tests
npm run test:watch                               # Watch mode
npx jest src/__tests__/auth.api.test.ts          # Single file
npx jest --coverage                              # Coverage report
```

| Test File | What It Tests |
|---|---|
| `auth.api.test.ts` | Full auth API flow (signup, login, me, refresh, logout) |
| `clients.service.test.ts` | Client CRUD service with mocked Prisma |
| `invoices.service.test.ts` | Invoice service logic |
| `projects.service.test.ts` | Project service logic |
| `tasks.service.test.ts` | Task service and Kanban logic |
| `team-members.service.test.ts` | Team member service |
| `notes.controller.test.ts` | Notes controller with mocked req/res |
| `error.middleware.test.ts` | Error middleware all error types |
| `query-validation.test.ts` | Zod query schema validation |
| `gtm-automation.service.test.ts` | GTM automation logic |

### Frontend Tests (Vitest + React Testing Library)
```bash
cd frontend

npm run test                   # All Vitest tests
npm run test:coverage          # Coverage
npm run test:e2e               # Playwright E2E
npx playwright test --headed  # E2E with browser visible
```

### Test Data Pattern
```typescript
// Mock Prisma in unit tests (backend):
const prismaMock = {
  client: { create: jest.fn(), findMany: jest.fn(), ... }
};
jest.mock('../config/prisma', () => ({ prisma: prismaMock }));

// MockApiResponse (frontend):
vi.mock('../lib/api-client', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: mockClients }) }
}));
```

---

## 18. Development Workflow

### Daily Dev Cycle
```bash
# Start both servers
./start.sh
# Backend → http://localhost:3000
# Frontend → http://localhost:5173
# Prisma Studio → npx prisma studio (http://localhost:5555)

# After schema changes:
cd backend
npx prisma migrate dev --name describe_your_change
npx prisma generate

# After model changes:
# Update frontend/src/types/crm.ts
# Update backend/src/validators/ if needed

# After any feature change:
node scripts/update-snapshot.js   # Update AI context file

# Before committing:
cd backend && npm run lint && npm test
cd ../frontend && npm run lint && npm run test
git add . && git commit -m "feat: your change"
# → git post-commit hook auto-updates codebase-snapshot.xml
```

### Key Commands Reference
```bash
# Backend
npm run dev           # ts-node-dev watch
npm run build         # tsc compile
npm test              # Jest
npm run lint          # ESLint

# Frontend
npm run dev           # Vite dev server (port 5173)
npm run build         # Vite production build
npm run test          # Vitest
npm run lint          # ESLint
npm run test:e2e      # Playwright

# Database
npx prisma migrate dev --name <name>  # New migration
npx prisma migrate deploy             # Apply in production
npx prisma generate                   # Regenerate client
npx prisma studio                     # GUI (port 5555)
npx prisma migrate reset              # ⚠️ Wipes data

# Snapshot auto-updater
node scripts/update-snapshot.js --install-hook  # One-time hook setup
node scripts/update-snapshot.js                  # Manual update
node scripts/update-snapshot.js --dry-run        # Preview changes
```

---

## 19. Deployment & Infrastructure

### Docker Compose Architecture
```yaml
# docker-compose.yml services:
backend:
  build: backend/Dockerfile
  ports: ["3000:3000"]
  environment: [DATABASE_URL, JWT_SECRET, ...]
  depends_on: [postgres]

frontend:
  build: frontend/Dockerfile         # Vite build → Nginx serve
  ports: ["80:80"]
  nginx.conf: proxies /api → backend:3000

postgres:
  image: postgres:15-alpine
  ports: ["5432:5432"]
  volumes: [pgdata:/var/lib/postgresql/data]

prometheus:  ports: ["9090:9090"]
grafana:     ports: ["3001:3000"]
loki:        ports: ["3100:3100"]
alertmanager: ports: ["9093:9093"]
```

### Production Deployment Steps
```bash
# On EC2 / production server:
git pull origin main
cd backend && npm ci && npx prisma migrate deploy && npm run build
cd ../frontend && npm ci && npm run build
docker-compose up -d --build

# Health check
curl http://localhost:3000/api/health
```

### Frontend Dockerfile (key steps)
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build                        # → /app/dist/

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### nginx.conf (key config)
```nginx
location / {
    try_files $uri $uri/ /index.html;   # SPA fallback
}
location /api {
    proxy_pass http://backend:3000;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## 20. Troubleshooting Reference

### Backend Issues

**Port 3000 already in use:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Prisma client out of sync:**
```bash
cd backend && npx prisma generate && npm run dev
```

**Database connection refused:**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432
# Or start via Docker
docker-compose up -d postgres
```

**Migration drift (schema != DB):**
```bash
cd backend
npx prisma migrate status       # Check what's pending
npx prisma migrate dev          # Apply pending migrations
```

**JWT errors ("invalid signature"):**
- JWT_SECRET and JWT_REFRESH_SECRET must match between signage and verification.
- Make sure the .env is loaded and hasn't changed since tokens were issued.

**Email not sending:**
```bash
# Verify SMTP_PASS is an App Password (not Gmail login)
# Gmail → Security → App Passwords

# Quick SMTP test:
cd backend
node -e "
const nodemailer = require('nodemailer');
require('dotenv').config();
nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
}).verify((e, s) => console.log(e ? 'Error: ' + e.message : 'SMTP OK'));
"
```

### Frontend Issues

**Port 5173 in use:**
```bash
lsof -ti:5173 | xargs kill -9
```

**API calls failing (CORS):**
- Ensure `FRONTEND_URL` in backend `.env` matches exact frontend origin including port.
- Check `VITE_API_URL` in frontend `.env` points to correct backend URL.

**Blank page / white screen:**
```bash
# Check browser console for errors
# Common causes:
# 1. AuthContext failing on /auth/me → check backend is running
# 2. Missing env var → check VITE_API_URL is set
# 3. Build issue → check Vite output: npm run build
```

**"useContext must be used within Provider":**
- A component is using a context hook outside its Provider.
- Check `main.tsx` provider wrap order — all contexts must wrap `App`.

**Snapshot not auto-updating:**
```bash
# Install git hook (one-time)
node scripts/update-snapshot.js --install-hook

# Verify hook installed
cat .git/hooks/post-commit
```

---

## 21. Change History & Known Issues

### Recent Changes (reverse chronological)

| Date | Change | Files Affected |
|---|---|---|
| 2026-04-22 | Updated all documentation (snapshot, context, overview) to reflect actual state | `codebase-snapshot.xml`, `context.md`, `PROJECT_OVERVIEW.md` |
| 2026-04-22 | Created `scripts/update-snapshot.js` — auto-update git hook for snapshot | `scripts/update-snapshot.js` |
| 2026-04-21 | Added `createdBy` field to Deal, Project, Invoice, Candidate | `prisma/schema.prisma`, migration SQL |
| 2026-04-17 | Gmail SMTP configured with App Password for email sending | `backend/src/utils/mailer.ts`, `.env` |
| 2026-04-10 | CI/CD GitHub Actions pipeline — CI on PR, CD on merge to main | `.github/workflows/ci.yml`, `cd.yml` |
| 2026-04-09 | Fixed TeamsPage.tsx JSX parsing errors | `frontend/src/pages/TeamsPage.tsx` |
| 2026-04-09 | Added Comments + Attachments tables, APIs, and frontend hooks | `prisma/schema.prisma`, multiple routes/services |
| 2026-04-05 | Dashboard Operating Cadence migrated from mock to live DB aggregation | `Dashboard.tsx`, `dashboard.service.ts` |
| 2026-04-04 | Fixed TaskCard `openQuickCreate` ReferenceError | `TasksPage.tsx`, `TaskDetailModal.tsx` |
| 2026-03-31 | Full migration: removed all localStorage/mock data fallbacks | All pages and services |
| 2026-03-30 | Initial stack setup + core CRUD | All initial files |

### Known Issues / Watch-outs

| Issue | Status | Notes |
|---|---|---|
| Frontend uses `useEffect + useState` (not React Query) | Accepted | React Query was removed. Use hooks in `frontend/src/hooks/` |
| SQLite used in local dev, PostgreSQL in prod | By design | Some JSON features behave slightly differently |
| Socket.IO events don't persist if client is offline | Known gap | No offline queue — missed events are lost |
| Gmail App Password required (not login password) | Known config issue | See Section 10 for setup |
| `scripts/update-snapshot.js` only updates changes-log section | By design | Architecture sections require manual updates |
| `data/mock-crm.ts` (frontend) — legacy file | Mostly unused | May be imported in a few edge-case fallbacks |

---

*This document is the authoritative technical reference for FlowSync CRM.*  
*For AI agents: Always start with `codebase-snapshot.xml` for compact index, use this file for deep-dive details.*  
*Last Updated: 2026-04-22 | Version: 1.0.0*