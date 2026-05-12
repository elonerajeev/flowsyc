# Flowsyc CRM — AI Agent Context

> Enterprise CRM platform. React 18 frontend (Vite) + Express 5 backend (TypeScript) + PostgreSQL (Prisma ORM) + Socket.IO realtime.

## Quick Reference

| | Frontend | Backend |
|---|---|---|
| **Directory** | `frontend/` | `backend/` |
| **Runtime** | Node 20+, Vite 8 | Node 20+, Express 5 |
| **Port** | `8080` (dev) | `3000` |
| **Dev Command** | `cd frontend && npm run dev` | `cd backend && npm run dev` |
| **Type System** | TypeScript strict | TypeScript strict |
| **Package Type** | ESM (`"type": "module"`) | CommonJS (`"type": "commonjs"`) |

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React/Vite) → Vercel         │
│  44 pages, 5 contexts, 9 hooks,         │
│  3 services, 51 shadcn/ui components    │
└────────────┬────────────────────────────┘
             │ HTTP (REST) + WebSocket
┌────────────▼────────────────────────────┐
│  Backend (Express 5) → EC2              │
│  31 routes, 17 controllers,             │
│  38 services, 16 Zod validators         │
└────────────┬────────────────────────────┘
             │ Prisma ORM
┌────────────▼────────────────────────────┐
│  PostgreSQL → 28+ models, 14 migrations │
└─────────────────────────────────────────┘
```

**Infrastructure**: Docker Compose includes Prometheus (9090), Grafana (3000), Loki (3100), Alertmanager (9093).

---

## Frontend (`frontend/`)

### Key Dependencies
- `react` 18, `react-router-dom` 6, `@tanstack/react-query` 5
- `framer-motion` 12, `recharts` 2, `socket.io-client` 4
- `@radix-ui/*` (all primitives), `lucide-react`, `sonner`
- `zod` 3, `react-hook-form` 7, `date-fns` 3
- `tailwindcss` 3 + `tailwindcss-animate`, `shadcn/ui` pattern
- Testing: `vitest`, `@testing-library/react`, `@playwright/test`

### Directory Structure
```
frontend/src/
├── App.tsx              # React Router with 44 routes + RouteAccessGuard wrappers
├── main.tsx             # Entry: StrictMode, monitoring init, Analytics
├── contexts/            # 5 React Context providers
│   ├── AuthContext.tsx      # JWT session, login/signup/logout/switchRole
│   ├── RealtimeContext.tsx  # Socket.IO, presence, project/task rooms
│   ├── ThemeContext.tsx     # Dark/light mode, 4 role workspaces
│   ├── WorkspaceContext.tsx # Global UI: command palette, quick create, privacy, breadcrumbs
│   └── NotificationContext.tsx  # In-app notifications, batching, preferences
├── services/            # 3 API wrapper modules
│   ├── auth.ts              # login/signup/me/logout/switchRole/verify-email/refresh
│   ├── crm.ts               # 30+ CRUD methods for all entities + attachments/comments
│   └── inbox.ts             # IMAP account management + email sync
├── types/               # TypeScript interfaces
│   ├── crm.ts               # 50+ interfaces (Client, Lead, Deal, Task, Project, etc.)
│   └── automation.ts        # Rule, Alert, Log types
├── hooks/               # 9 custom hooks
│   ├── use-crm-data.ts        # Centralized React Query keys (crmKeys) + 30+ query hooks
│   ├── use-attachments.ts     # Infinite query + create/delete mutations
│   ├── use-comments.ts        # Infinite query + create/update/delete mutations
│   ├── use-export.ts          # CSV export with progress indicator
│   ├── use-list-preferences.ts # localStorage ordering/pinning
│   ├── use-mobile.tsx         # Responsive breakpoint (768px)
│   ├── use-monitoring.ts      # Performance + error tracking init
│   ├── use-refresh.ts         # Refresh wrapper with loading toasts
│   └── use-toast.ts           # Sonner-compatible toast system
├── lib/                 # 12 utility modules
│   ├── api-client.ts        # HTTP client: auth headers, retry, error events
│   ├── utils.ts             # cn() (clsx + tailwind-merge)
│   ├── env.ts               # Environment validation + warnings
│   ├── error-tracker.ts     # Singleton error capture + analytics
│   ├── logger.ts            # Dev-only error reporting
│   ├── performance.ts       # PerformanceMonitor (Web Vitals, render timing)
│   ├── preferences.ts       # localStorage JSON/string helpers
│   ├── design-tokens.ts     # Shared RADIUS, SPACING, TEXT classes
│   ├── micro-interactions.ts # Haptic feedback (vibration API)
│   ├── search.ts            # Fuzzy search scoring
│   ├── team-roster.ts       # useSyncExternalStore + localStorage team state
│   └── refresh-messages.ts  # Context-specific loading messages
├── pages/               # 44 page components (see Routing section)
├── components/
│   ├── layout/            # 8 files: AppLayout, MasterSidebar, Sidebar, Navbar, MobileBottomNav, NotificationCenter, RouteAccessGuard, sidebarConfig
│   ├── ui/                # 51 shadcn/ui components (button, dialog, table, form, etc.)
│   ├── shared/            # 16 files: ErrorBoundary, Breadcrumbs, StatusBadge, PrivacyValue, SkeletonLoader, StatCard, etc.
│   ├── crm/               # 7 files: CommandPalette, QuickCreateDialog, ProjectDetailModal, TaskDetailModal, CalendarEventDialog, LeadEmailDialog, ScheduleMeetingDialog
│   ├── dashboard/         # DashboardCharts, PersonalizedFocus
│   ├── automation/        # RuleBuilder, RuleLogs
│   └── skeletons/         # Loading skeleton index
├── data/                # Mock data files
└── assets/              # Static assets
```

### Routing (44 routes in `App.tsx`)
All non-auth routes wrapped in `<AppLayout>` and `<RouteAccessGuard>`.

| Prefix | Pages | Roles |
|---|---|---|
| `/login`, `/signup`, `/verify-email`, `/auth/google/callback` | Auth pages | Public |
| `/overview` | Dashboard, Activity, Messages, Inbox | All roles |
| `/people/teams`, `/people/members`, `/people/attendance` | Team management | Admin, Manager |
| `/workspace/tasks`, `/workspace/projects`, `/workspace/calendar`, `/workspace/notes` | Workspace | Admin, Manager, Employee |
| `/automation/gtm`, `/automation/flow` | GTM | Admin, Manager, Employee |
| `/sales/leads`, `/sales/pipelines`, `/sales/clients`, `/sales/contacts` | Sales | Admin, Manager, Employee |
| `/finance`, `/finance/reports` | Finance | Admin, Manager, Client |
| `/hr/hiring`, `/hr/candidates`, `/hr/employees`, `/hr/payroll` | HR | Admin, Manager (+ Employee for payroll) |
| `/insights/analytics` | Analytics | Admin, Manager |
| `/automation/rules`, `/automation/alerts`, `/automation/scheduled`, `/automation/logs` | Automation | Admin, Manager |
| `/system/settings`, `/system/access`, `/system/integrations`, `/system/audit`, `/system/billing` | System | Varies by page |
| `/restricted`, `*` | Fallback pages | All |

### Sidebar Configuration (`components/layout/sidebarConfig.ts`)
9 sections, each with items gated by role array:
1. **overview** — Dashboard, Activity, Messages, Email Inbox
2. **people** — Team, Members, Attendance
3. **workspace** — Tasks, Projects, Calendar, Notes
4. **sales** — GTM Dashboard, How It Works, Leads, Pipeline, Clients, Contacts
5. **finance** — Finance, Reports
6. **hr** — Hiring, Candidates, Employees, Payroll
7. **insights** — Analytics
8. **automation** — Rules, Alerts, Scheduled, Activity Logs
9. **system** — Settings, Access & Permissions, Integrations, Audit Logs, Billing

Role labels: `"admin" | "manager" | "employee" | "client"`

### State Management

**React Query**: All data fetching uses `@tanstack/react-query`. Query keys are centralized in `use-crm-data.ts` via `crmKeys` object:
```typescript
crmKeys.clients()        // ['crm', 'clients']
crmKeys.client(id)       // ['crm', 'client', id]
crmKeys.tasks()          // ['crm', 'tasks']
crmKeys.attachments(taskId, projectId)
crmKeys.comments(taskId, projectId)
// ... 30+ key generators
```

**Context Providers** (nested in `App.tsx`):
1. `ThemeProvider` → `AuthProvider` → `RealtimeProvider` → `WorkspaceProvider` → `NotificationProvider` → `QueryClientProvider`

**Dual-Mode Data**: `VITE_USE_REMOTE_API=false` → localStorage mock; `true` → backend API with fallback to mock on failure.

### API Client (`lib/api-client.ts`)
- `requestJson<T>(endpoint, init?)` — core fetch wrapper
- Auto-injects `Authorization: Bearer <token>` from localStorage
- Dispatches `crm:network-error` CustomEvent on failure (listened by `NetworkErrorBridge`)
- Single retry on network failure
- `isRemoteApiEnabled()` toggles mock vs live

### UI Conventions
- **Design tokens** (`lib/design-tokens.ts`): `RADIUS` (sm/md/lg/xl/pill), `SPACING` (card/cardCompact/inset/button/buttonCompact/field), `TEXT` (eyebrow/meta/body/bodyRelaxed/title)
- **Utility**: `cn()` from `lib/utils.ts` for className merging
- **shadcn/ui**: 51 components in `components/ui/`, all using `cn()` and Radix primitives
- **Animations**: Framer Motion page transitions in `AppLayout` (spring: stiffness 260, damping 28, mass 0.85)
- **Toasts**: `sonner` for all notifications; `use-refresh.ts` and `use-export.ts` use styled toasts with colored left borders
- **Privacy mode**: `WorkspaceContext.privacyMode` toggles `<PrivacyValue>` blur wrapper on sensitive data

### Layout System
- **MasterSidebar**: Fixed 72px left icon rail with section buttons + user profile hover card
- **Sidebar**: Resizable (92–360px, default 240px) detail panel showing section nav items; persisted width in localStorage
- **Navbar**: Sticky top bar with Breadcrumbs, search input (opens CommandPalette), Quick Create button, theme toggle, privacy toggle, notification bell, profile dropdown with role switching
- **MobileBottomNav**: 7-column bottom nav for mobile (Home, Workspace, Sales, Finance, System, Search, Create)
- CSS variable `--sidebar-offset` controls main content marginLeft

---

## Backend (`backend/`)

### Key Dependencies
- `express` 5, `@prisma/client` 6, `zod` 4
- `jsonwebtoken` 9, `bcryptjs` 2, `cookie-parser` 1
- `socket.io` 4, `nodemailer` 8, `googleapis` 171
- `imapflow` 1, `mailparser` 3 (email sync)
- `helmet` 8, `cors` 2, `express-rate-limit` 8
- `winston` 3, `morgan` 1, `prom-client` 15
- `multer` 2, `cloudinary` 1, `pdfkit` 0
- `node-cron` 4, `compression` 1
- Testing: `jest` 30, `supertest` 7, `ts-jest` 29

### Directory Structure
```
backend/
├── src/
│   ├── app.ts             # Express app setup: middleware, routes, error handler
│   ├── server.ts          # HTTP + Socket.IO server, Prometheus metrics, Redis pub/sub
│   ├── index.ts           # Entry point (dotenv + server import)
│   ├── config/            # App configuration
│   ├── types/             # TypeScript type definitions
│   ├── data/              # Static data/constants
│   ├── middleware/        # 5 middleware
│   │   ├── auth.ts            # JWT verification + RBAC
│   │   ├── error-handler.ts   # Centralized error handling
│   │   ├── response-formatter.ts  # Standard response formatting
│   │   ├── security.ts        # CSP, Helmet, rate limiting
│   │   └── validation.ts      # Zod request validation
│   ├── utils/             # 17 utilities
│   │   ├── async-handler.ts, cache-manager.ts, email-templates.ts,
│   │   ├── imap-flow.d.ts, logger.ts, mock-data-generator.ts,
│   │   ├── monitoring.ts, performance.ts, rate-limiter.ts,
│   │   ├── response-formatter.ts, schedulers.ts, security.ts,
│   │   ├── social.ts, time.ts, validators.ts, web-vitals.ts
│   │   └── redis.ts           # Redis client wrapper
│   ├── routes/            # 31 route files
│   │   ├── auth.routes.ts, clients.routes.ts, contacts.routes.ts,
│   │   ├── leads.routes.ts, deals.routes.ts, tasks.routes.ts,
│   │   ├── projects.routes.ts, team-members.routes.ts, invoices.routes.ts,
│   │   ├── payroll.routes.ts, attendance.routes.ts, hiring.routes.ts,
│   │   ├── candidates.routes.ts, notes.routes.ts, inbox.routes.ts,
│   │   ├── messages.routes.ts, conversations.routes.ts,
│   │   ├── automation-rules.routes.ts, automation-logs.routes.ts,
│   │   ├── automation-alerts.routes.ts, automation-scheduled.routes.ts,
│   │   ├── analytics.routes.ts, reports.routes.ts,
│   │   ├── gtm-ops.routes.ts, gtm-flow.routes.ts,
│   │   ├── settings.routes.ts, roles.routes.ts,
│   │   ├── audit-logs.routes.ts, integrations.routes.ts,
│   │   ├── billing.routes.ts, dashboard.routes.ts,
│   │   └── index.routes.ts
│   ├── controllers/       # 17 controllers
│   │   ├── auth, automation, clients, contacts, dashboard,
│   │   ├── deals, leads, messages, notes, projects,
│   │   ├── reports, sales, tasks, team, templates, inbox
│   ├── services/          # 38 services
│   │   ├── automation-engine.ts  # Cron-driven workflow engine
│   │   ├── inbox.service.ts      # Email account management
│   │   ├── imap.service.ts       # IMAP sync + mailparser
│   │   ├── cache.service.ts, notification.service.ts,
│   │   ├── monitoring.service.ts, redis.service.ts,
│   │   ├── social-media.service.ts, email-templates.service.ts,
│   │   └── CRUD services for every entity
│   └── validators/        # 16 Zod schemas
│       ├── leads, clients, contacts, deals, tasks, projects,
│       ├── team-members, notes, invoices, automation, inbox, settings
├── prisma/
│   ├── schema.prisma      # 28+ models, relations, indexes
│   └── migrations/        # 14 migration files
├── scripts/               # 14 utility scripts
│   ├── seed.ts, seed-real-data.ts, seed-sample-data.ts,
│   ├── bootstrap-clients.ts, bootstrap-rest.ts,
│   ├── auth-smoke.ts, clients-smoke.ts, crud-smoke.ts, team-member-smoke.ts,
│   ├── create-test-users.ts, sync-lead-lifecycle.ts,
│   ├── diagnose-and-fix-automation.ts, seed-audit-logs.sql
└── doc/                   # 4 documentation files
    ├── BACKEND_README.md, BACKEND_DEVELOPMENT_GUIDE.md (2058 lines),
    ├── API_CONTRACT.md (806 lines), BACKEND_QUICK_REFERENCE.md (343 lines)
```

### Database (Prisma)
**28+ models** in `prisma/schema.prisma`:
User, Client, Contact, Lead, Deal, Task, Project, TeamMember, Invoice, Payroll, Attendance, Candidate, Note, AutomationRule, AutomationLog, AutomationScheduled, Notification, AuditLog, Attachment, Comment, Integration, EmailAccount, EmailMessage, GTMTemplate, PipelineStage, and more.

**14 migrations** tracked in `prisma/migrations/`.

### Authentication Flow
1. **JWT tokens** stored in httpOnly cookies (backend) + localStorage fallback (frontend)
2. Token payload: `{ sub: userId, email, role, iat, exp }`
3. Access token: 24h expiry; Refresh token: 30d expiry
4. Google OAuth supported via `/api/auth/google/callback`
5. Role switching via `POST /auth/switch-role` with server-side validation

### Middleware Chain (in `app.ts`)
1. CORS → 2. Helmet → 3. Compression → 4. Morgan (logging) → 5. Cookie parser → 6. JSON body parser → 7. Rate limiter → 8. Security headers → 9. Routes → 10. Error handler

### API Response Format
```typescript
// Success
{ success: true, data: <payload>, message?: string }

// Error
{ success: false, error: { code: string, message: string, details?: unknown } }
```

---

## Environment Variables

### Backend (`.env`)
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/flowsyc
JWT_ACCESS_SECRET=<64-char hex>
JWT_REFRESH_SECRET=<64-char hex>
COOKIE_SECRET=<32-char hex>
FRONTEND_URL=http://localhost:8080
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail>
SMTP_PASS=<app-password>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/auth/google/calendar-callback
VALKEY_URL=redis://localhost:6379
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=ws://localhost:3000
VITE_USE_REMOTE_API=true   # false = mock mode
```

---

## Development Commands

```bash
# Frontend
cd frontend && npm run dev          # Start dev server (port 8080)
cd frontend && npm run build        # Production build
cd frontend && npm run lint         # ESLint
cd frontend && npm run test         # Vitest
cd frontend && npm run test:watch   # Vitest watch mode

# Backend
cd backend && npm run dev           # Start with tsx watch (port 3000)
cd backend && npm run build         # TypeScript compile
cd backend && npm run start         # Run compiled JS
cd backend && npm run lint          # tsc --noEmit
cd backend && npm run test          # Jest
cd backend && npm run seed          # Run seed script

# Database
cd backend && npx prisma migrate dev    # Run migrations
cd backend && npx prisma generate       # Generate Prisma client
cd backend && npx prisma studio         # Open Prisma Studio

# Docker
docker-compose up -d                # Start all services (DB + monitoring)
```

---

## Code Conventions

### TypeScript
- Strict mode enabled in both `tsconfig.json` files
- Frontend: `"jsx": "react-jsx"`, path alias `@/*` → `src/*`
- Backend: CommonJS, `"outDir": "dist"`, `"rootDir": "src"`

### Naming
- Components: PascalCase (`LeadEmailDialog.tsx`)
- Hooks: camelCase with `use-` prefix (`use-crm-data.ts`)
- Services: kebab-case with `.service.ts` suffix (`inbox.service.ts`)
- Routes: kebab-case with `.routes.ts` suffix (`team-members.routes.ts`)
- Utilities: kebab-case (`async-handler.ts`)
- Validators: kebab-case with entity name (`leads.validator.ts`)

### Frontend Patterns
- No raw `fetch` calls — always go through `services/crm.ts` or `services/auth.ts`
- No direct `useQuery` in pages — use hooks from `hooks/use-crm-data.ts`
- Mutations use `useMutation` with `queryClient.invalidateQueries` on success
- All forms use `react-hook-form` + `@hookform/resolvers/zod`
- Dialogs/modals use shadcn/ui `Dialog` or `Sheet` components
- Data tables use shadcn/ui `Table` with sorting/filtering
- Charts use `recharts` (ResponsiveContainer, BarChart, LineChart, PieChart, AreaChart)

### Backend Patterns
- Controllers call services; services contain business logic
- All routes use `asyncHandler` wrapper for error handling
- Zod validators applied via `validation.ts` middleware
- Responses formatted via `response-formatter.ts` middleware
- Prisma transactions used for multi-step operations
- Soft deletes via `deletedAt` field where applicable

---

## Key Integration Points

### Frontend → Backend API Mapping
| Frontend Service Method | Backend Endpoint |
|---|---|
| `authService.login()` | `POST /api/auth/login` |
| `authService.signup()` | `POST /api/auth/signup` |
| `authService.getCurrentUser()` | `GET /api/auth/me` |
| `crmService.getClients()` | `GET /api/clients` |
| `crmService.createClient()` | `POST /api/clients` |
| `crmService.getLeads()` | `GET /api/leads` |
| `crmService.createLead()` | `POST /api/leads` |
| `crmService.getTasks()` | `GET /api/tasks` |
| `crmService.createTask()` | `POST /api/tasks` |
| `crmService.getProjects()` | `GET /api/projects` |
| `crmService.createProject()` | `POST /api/projects` |
| `crmService.getTeamMembers()` | `GET /api/team-members` |
| `crmService.getInvoices()` | `GET /api/invoices` |
| `crmService.getContacts()` | `GET /api/contacts` |
| `crmService.getDeals()` | `GET /api/deals` |
| `crmService.listAttachments()` | `GET /api/attachments` |
| `crmService.listComments()` | `GET /api/comments` |
| `crmService.listActivities()` | `GET /api/activities` |
| `inboxService.getAccounts()` | `GET /api/inbox/accounts` |
| `inboxService.syncEmails()` | `POST /api/inbox/:id/sync` |

### Realtime Events (Socket.IO)
- Client joins rooms: `project:${projectId}`, `task:${taskId}`
- Server broadcasts: `task:updated`, `project:updated`, `notification:new`
- Presence tracking: `user:online`, `user:offline`

---

## Testing

**Frontend**: Vitest + React Testing Library + Playwright (E2E)
- Unit tests in `__tests__/` directories alongside source files
- `vitest.config.ts` configured with jsdom environment

**Backend**: Jest + Supertest
- Smoke test scripts in `scripts/` for manual API verification
- `jest.config.js` with ts-jest preset

---

## Important Notes for AI Agents

1. **Mock mode is default**: If `VITE_USE_REMOTE_API` is not set or is `false`, the frontend uses localStorage mock data. Set to `true` for live backend.
2. **Role gating is frontend-first**: `sidebarConfig.ts` and `RouteAccessGuard` control UI visibility. Backend auth middleware enforces actual access.
3. **No comments in code**: The project convention is minimal/no comments. Do not add comments unless explicitly asked.
4. **Always use existing patterns**: When adding new features, follow the established patterns — services for API calls, hooks for React Query, validators for Zod schemas.
5. **shadcn/ui components are not to be modified directly**: If customization is needed, create new components that compose them.
6. **Query keys must be centralized**: Any new React Query usage must add keys to `crmKeys` in `use-crm-data.ts`.
7. **Soft deletes**: Backend uses `deletedAt` timestamps. Never hard-delete unless explicitly required.
8. **Zod v4 on backend, Zod v3 on frontend**: Be aware of version differences when sharing validation logic.
9. **Vite proxy**: Dev server proxies `/api` and `/socket.io` to `localhost:3000` — no CORS issues in development.
10. **Manual chunks**: Vite build splits bundles by library (charts, motion, icons, query, radix) — be mindful of chunk sizes when adding large dependencies.
