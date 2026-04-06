# Backend Development Guide
## Focal Point Compass - Complete Backend Integration Manual

**Version:** 1.0  
**Date:** March 27, 2026  
**Frontend Status:** 85% Backend-Ready  
**Estimated Backend Development Time:** 3-4 weeks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Frontend Architecture Overview](#frontend-architecture-overview)
3. [API Endpoints Required](#api-endpoints-required)
4. [Authentication & Authorization](#authentication--authorization)
5. [Database Schema](#database-schema)
6. [API Request/Response Formats](#api-requestresponse-formats)
7. [Critical Implementation Notes](#critical-implementation-notes)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Checklist](#deployment-checklist)
10. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)

---

## Executive Summary

### Current State
- **Frontend:** Fully functional with mock data and localStorage
- **API Client:** Ready with automatic fallback mechanism
- **Authentication:** JWT-based auth service implemented
- **Mutations:** 15 CRUD operations ready to connect
- **Type Safety:** Complete TypeScript types for all entities

### What Backend Needs to Provide
1. **REST API** with 40+ endpoints (detailed below)
2. **JWT Authentication** (login, signup, session validation, logout)
3. **PostgreSQL/MySQL Database** with 12+ tables
4. **File Upload** support (avatars, receipts, documents)
5. **Real-time Updates** (WebSocket - optional Phase 2)
6. **CORS Configuration** for frontend origin

### Technology Recommendations
- **Framework:** Node.js (Express/Fastify) OR Python (FastAPI/Django) OR Go (Gin/Fiber)
- **Database:** PostgreSQL (recommended) or MySQL
- **ORM:** Prisma (Node.js) / SQLAlchemy (Python) / GORM (Go)
- **Auth:** JWT with bcrypt password hashing
- **File Storage:** AWS S3 / Cloudinary / Local filesystem
- **Cache:** Redis (optional, for sessions/rate limiting)

---

## Frontend Architecture Overview

### How Frontend Calls Backend

```typescript
// 1. Environment Configuration
// .env file controls API behavior
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_REMOTE_API=true  // ← Set to true to enable backend

// 2. API Client (src/lib/api-client.ts)
export async function requestJson<T>(endpoint: string, init?: RequestInit) {
  const token = getStoredAuthToken(); // ← JWT from localStorage
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`, // ← Add this in backend
    },
    ...init,
  });
  
  if (!response.ok) {
    throw new ApiError(message, response.status, endpoint);
  }
  
  return response.json();
}

// 3. Service Layer (src/services/crm.ts)
export const crmService = {
  getClients: () => fetchOrMock("/clients", fallbackData),
  createClient: (data) => persistRemoteOrFallback("/clients", data, {
    method: "POST",
    body: JSON.stringify(data)
  }),
  // ... 40+ more methods
};

// 4. React Query Hooks (src/hooks/use-crm-data.ts)
export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => crmService.getClients(),
  });
}
```

### Dual-Mode Operation

**Frontend works in TWO modes:**

1. **Mock Mode** (`VITE_USE_REMOTE_API=false`)
   - Uses localStorage for all data
   - No backend calls made
   - Perfect for frontend development

2. **API Mode** (`VITE_USE_REMOTE_API=true`)
   - Calls real backend API
   - Falls back to localStorage if API fails
   - Production mode

**Backend Developer:** You only need to worry about API Mode.

---

## API Endpoints Required

### Authentication Endpoints (Priority: CRITICAL)

#### POST /auth/signup
**Purpose:** Create new user account

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "employee"  // admin | manager | employee | client
}
```

**Response (201):**
```json
{
  "user": {
    "id": "usr_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "employee",
    "employeeId": "EMP-3187",
    "department": "Delivery",
    "team": "Client Delivery",
    "designation": "Product Specialist",
    "manager": "Team Manager",
    "workingHours": "09:00 - 18:00",
    "officeLocation": "HQ - Floor 2",
    "timeZone": "Asia/Calcutta",
    "baseSalary": 72000,
    "allowances": 12000,
    "deductions": 3200,
    "paymentMode": "bank-transfer",
    "payrollCycle": "Mar 2026",
    "payrollDueDate": "Apr 05, 2026",
    "joinedAt": "2024-05-06",
    "location": "Remote"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation Rules:**
- Email must be unique
- Password minimum 8 characters
- Role must be one of: admin, manager, employee, client
- Hash password with bcrypt (cost factor 10)

**Error Responses:**
- 400: Invalid input (missing fields, weak password)
- 409: Email already exists

---

#### POST /auth/login
**Purpose:** Authenticate user and return JWT tokens

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "user": { /* same as signup */ },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**JWT Payload:**
```json
{
  "sub": "usr_abc123",  // user ID
  "email": "john@example.com",
  "role": "employee",
  "iat": 1711523422,
  "exp": 1711609822  // 24 hours from iat
}
```

**Error Responses:**
- 401: Invalid credentials
- 404: User not found

---

#### GET /auth/me
**Purpose:** Validate session and return current user

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "user": { /* full user object */ },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- 401: Invalid or expired token
- 404: User not found

**Implementation Notes:**
- Verify JWT signature
- Check token expiration
- Return fresh tokens if near expiry (optional)

---

#### POST /auth/logout
**Purpose:** Invalidate user session

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Implementation Notes:**
- Add token to blacklist (Redis recommended)
- Or use short-lived tokens and skip blacklist

---

### Client Management Endpoints (Priority: HIGH)

#### GET /clients
**Purpose:** List all clients with filtering and pagination

**Query Parameters:**
```
?page=1
&limit=50
&status=active|pending|completed
&search=acme
&sort=name|revenue|createdAt
&order=asc|desc
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Acme Corporation",
      "industry": "Technology",
      "manager": "Sarah Johnson",
      "status": "active",
      "revenue": "$45,000",
      "location": "San Francisco, CA",
      "avatar": "AC",
      "tier": "Enterprise",
      "healthScore": 92,
      "nextAction": "Renewal prep call",
      "segment": "Renewal",
      "email": "contact@acme.com",
      "phone": "+1-555-0101",
      "company": "Acme Corporation",
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-03-20T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 128,
    "totalPages": 3
  }
}
```

**Authorization:** Requires valid JWT token

---

#### POST /clients
**Purpose:** Create new client

**Request:**
```json
{
  "name": "New Corp",
  "industry": "Finance",
  "manager": "John Doe",
  "status": "pending",
  "revenue": "$0",
  "location": "New York, NY",
  "tier": "Growth",
  "segment": "New Business",
  "email": "contact@newcorp.com",
  "phone": "+1-555-9999"
}
```

**Response (201):**
```json
{
  "id": 129,
  "name": "New Corp",
  "avatar": "NC",  // Auto-generated from name
  "healthScore": 75,  // Default value
  "nextAction": "Initial contact",  // Default
  "createdAt": "2026-03-27T12:00:00Z",
  "updatedAt": "2026-03-27T12:00:00Z",
  /* ... rest of fields */
}
```

**Validation:**
- Name required, max 100 chars
- Email must be valid format
- Status must be: active | pending | completed

**Authorization:** Requires role: admin | manager

---

#### PATCH /clients/:id
**Purpose:** Update existing client

**Request:**
```json
{
  "status": "active",
  "healthScore": 88,
  "nextAction": "Quarterly review"
}
```

**Response (200):**
```json
{
  "id": 129,
  "updatedAt": "2026-03-27T12:05:00Z",
  /* ... full updated object */
}
```

**Authorization:** Requires role: admin | manager

---

#### DELETE /clients/:id
**Purpose:** Delete client (soft delete recommended)

**Response (200):**
```json
{
  "message": "Client deleted successfully"
}
```

**Authorization:** Requires role: admin

**Implementation Note:** Use soft delete (add `deletedAt` timestamp) instead of hard delete.

---

### Task Management Endpoints (Priority: HIGH)

#### GET /tasks
**Purpose:** Get all tasks organized by column

**Response (200):**
```json
{
  "todo": [
    {
      "id": 1,
      "title": "Update client dashboard",
      "assignee": "Sarah Johnson",
      "avatar": "SJ",
      "priority": "high",
      "dueDate": "2026-03-28",
      "tags": ["Dashboard", "Client"],
      "valueStream": "Growth"
    }
  ],
  "in-progress": [ /* ... */ ],
  "done": [ /* ... */ ]
}
```

#### POST /tasks
**Request:**
```json
{
  "title": "New task",
  "assignee": "John Doe",
  "priority": "medium",
  "dueDate": "2026-04-01",
  "tags": ["Backend"],
  "valueStream": "Product",
  "column": "todo"
}
```

**Response (201):** Full task object with generated ID

#### PATCH /tasks/:id
**Purpose:** Update task (including moving between columns)

**Request:**
```json
{
  "column": "in-progress",
  "priority": "high"
}
```

#### DELETE /tasks/:id
**Response (200):** Success message

---

### Project Management Endpoints (Priority: MEDIUM)

#### GET /projects
**Response:** Array of projects

#### POST /projects
**Request:**
```json
{
  "name": "Website Redesign",
  "description": "Complete overhaul of company website",
  "progress": 0,
  "status": "pending",
  "team": ["SJ", "MC"],
  "dueDate": "2026-06-30",
  "stage": "Discovery",
  "budget": "$50,000"
}
```

#### PATCH /projects/:id
#### DELETE /projects/:id

---

### Team Management Endpoints (Priority: HIGH)

#### GET /team-members
**Response:** Array of team members

#### POST /team-members
**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "role": "Employee",
  "status": "active",
  "department": "Engineering",
  "team": "Backend Team",
  "designation": "Senior Developer",
  "manager": "Tech Lead",
  "workingHours": "09:00 - 18:00",
  "officeLocation": "HQ - Floor 3",
  "timeZone": "Asia/Calcutta",
  "baseSalary": 95000,
  "allowances": 15000,
  "deductions": 4500,
  "paymentMode": "bank-transfer",
  "attendance": "present",
  "checkIn": "09:15",
  "location": "Office"
}
```

#### PATCH /team-members/:id
#### DELETE /team-members/:id

---

### Invoice Management Endpoints (Priority: MEDIUM)

#### GET /invoices
#### POST /invoices
**Request:**
```json
{
  "client": "Acme Corporation",
  "amount": "$12,400",
  "date": "2026-03-27",
  "due": "2026-04-27",
  "status": "pending"
}
```

#### PATCH /invoices/:id
#### DELETE /invoices/:id

---

### Dashboard Endpoint (Priority: HIGH)

#### GET /dashboard
**Purpose:** Return aggregated dashboard data

**Response (200):**
```json
{
  "metrics": [
    {
      "label": "Revenue Run Rate",
      "value": "$1.8M",
      "change": "+12.3%",
      "direction": "up",
      "detail": "vs last month"
    }
  ],
  "revenueSeries": [
    { "month": "Jan", "revenue": 12400, "deals": 12, "retention": 93 }
  ],
  "pipelineBreakdown": [
    { "name": "Qualified", "value": 28, "color": "hsl(213 55% 52%)" }
  ],
  "operatingCadence": [
    { "name": "Revenue", "value": 84 }
  ],
  "activityFeed": [
    {
      "id": 1,
      "text": "Client follow-up completed",
      "time": "5 min ago",
      "type": "completed",
      "category": "sales",
      "source": "Accounts"
    }
  ],
  "todayFocus": [
    "Finance accounts leading pipeline",
    "One renewal ready for expansion"
  ],
  "executionReadiness": 88,
  "collaborators": [
    {
      "id": "sj",
      "name": "Sarah Johnson",
      "role": "Revenue",
      "avatar": "SJ",
      "status": "online",
      "lastSeen": "now"
    }
  ]
}
```

**Implementation Notes:**
- This is a complex aggregation endpoint
- Cache results for 5 minutes (Redis recommended)
- Calculate metrics from database in real-time
- Consider background job for heavy calculations

---

### Additional Endpoints (Priority: MEDIUM-LOW)

#### GET /conversations
**Purpose:** Chat/messaging conversations list

#### GET /messages
**Purpose:** Messages for a conversation

#### GET /reports
**Purpose:** Financial reports list

#### GET /attendance
**Purpose:** Attendance records (derived from team-members)

#### GET /leads
**Purpose:** Sales leads (CRM)

#### GET /deals
**Purpose:** Sales deals/opportunities

#### GET /companies
**Purpose:** Company records (CRM)

#### GET /sales-metrics
**Purpose:** Sales performance metrics

---

## Authentication & Authorization

### JWT Token Structure

**Access Token (24 hour expiry):**
```json
{
  "sub": "usr_abc123",
  "email": "john@example.com",
  "role": "employee",
  "iat": 1711523422,
  "exp": 1711609822
}
```

**Refresh Token (30 day expiry):**
```json
{
  "sub": "usr_abc123",
  "type": "refresh",
  "iat": 1711523422,
  "exp": 1714115422
}
```

### Secret Keys

**CRITICAL:** Use strong random secrets

```bash
# Generate secrets (run in terminal)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Store in .env
JWT_ACCESS_SECRET=your_64_char_hex_string_here
JWT_REFRESH_SECRET=different_64_char_hex_string_here
```

### Role-Based Access Control (RBAC)

**Roles Hierarchy:**
```
admin > manager > employee > client
```

**Permission Matrix:**

| Endpoint | Admin | Manager | Employee | Client |
|----------|-------|---------|----------|--------|
| GET /clients | ✅ | ✅ | ✅ | ❌ |
| POST /clients | ✅ | ✅ | ❌ | ❌ |
| PATCH /clients | ✅ | ✅ | ❌ | ❌ |
| DELETE /clients | ✅ | ❌ | ❌ | ❌ |
| GET /team-members | ✅ | ✅ | ✅ | ❌ |
| POST /team-members | ✅ | ✅ | ❌ | ❌ |
| DELETE /team-members | ✅ | ❌ | ❌ | ❌ |
| GET /dashboard | ✅ | ✅ | ✅ | ✅ |
| GET /tasks | ✅ | ✅ | ✅ | ❌ |
| POST /tasks | ✅ | ✅ | ✅ | ❌ |

**Implementation Example (Express.js):**

```javascript
// Middleware: requireAuth
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware: requireRole
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Usage
app.post('/clients', requireAuth, requireRole('admin', 'manager'), createClient);
app.delete('/clients/:id', requireAuth, requireRole('admin'), deleteClient);
```

---

## Database Schema

### Recommended Database: PostgreSQL

**Why PostgreSQL?**
- JSON support for flexible fields
- Full-text search capabilities
- Excellent performance
- ACID compliance
- Wide ecosystem support

### Core Tables

#### users
```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'employee', 'client')),
  employee_id VARCHAR(50),
  department VARCHAR(100),
  team VARCHAR(100),
  designation VARCHAR(100),
  manager VARCHAR(100),
  working_hours VARCHAR(50),
  office_location VARCHAR(100),
  time_zone VARCHAR(50),
  base_salary DECIMAL(10, 2),
  allowances DECIMAL(10, 2),
  deductions DECIMAL(10, 2),
  payment_mode VARCHAR(20),
  payroll_cycle VARCHAR(50),
  payroll_due_date VARCHAR(50),
  joined_at DATE,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

#### clients
```sql
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  industry VARCHAR(100),
  manager VARCHAR(100),
  status VARCHAR(20) CHECK (status IN ('active', 'pending', 'completed')),
  revenue VARCHAR(50),
  location VARCHAR(200),
  avatar VARCHAR(10),
  tier VARCHAR(20) CHECK (tier IN ('Enterprise', 'Growth', 'Strategic')),
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  next_action TEXT,
  segment VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at);
```

#### projects
```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status VARCHAR(20) CHECK (status IN ('active', 'pending', 'completed', 'in-progress')),
  team JSONB,  -- Array of team member initials
  due_date DATE,
  stage VARCHAR(50),
  budget VARCHAR(50),
  tasks_done INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_due_date ON projects(due_date);
```

#### tasks
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  assignee VARCHAR(100),
  avatar VARCHAR(10),
  priority VARCHAR(20) CHECK (priority IN ('high', 'medium', 'low')),
  due_date DATE,
  tags JSONB,  -- Array of strings
  value_stream VARCHAR(50),
  column VARCHAR(20) CHECK (column IN ('todo', 'in-progress', 'done')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_tasks_column ON tasks(column);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

#### invoices
```sql
CREATE TABLE invoices (
  id VARCHAR(50) PRIMARY KEY,
  client VARCHAR(200) NOT NULL,
  amount VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  due DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'pending', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_client ON invoices(client);
CREATE INDEX idx_invoices_due ON invoices(due);
```

### Relationships

**Note:** This schema uses a simplified approach without foreign keys for rapid development. For production, consider adding proper foreign key constraints.

**Recommended Improvements:**
- Add `user_id` foreign key to clients, projects, tasks
- Add `client_id` foreign key to invoices
- Add `project_id` foreign key to tasks
- Create junction tables for many-to-many relationships

---

## API Request/Response Formats

### Standard Response Format

**Success Response:**
```json
{
  "data": { /* resource or array */ },
  "message": "Operation successful",
  "timestamp": "2026-03-27T12:00:00Z"
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "timestamp": "2026-03-27T12:00:00Z"
}
```

### HTTP Status Codes

**Use these consistently:**

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., email exists) |
| 422 | Unprocessable Entity | Valid format but business logic error |
| 500 | Internal Server Error | Unexpected server error |

### Pagination Format

**Request:**
```
GET /clients?page=2&limit=50
```

**Response:**
```json
{
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 328,
    "totalPages": 7,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### Filtering Format

**Request:**
```
GET /clients?status=active&tier=Enterprise&search=acme
```

**Backend Implementation:**
- `status`: Exact match
- `tier`: Exact match
- `search`: Case-insensitive partial match on name, email, company

### Sorting Format

**Request:**
```
GET /clients?sort=revenue&order=desc
```

**Supported sort fields:**
- `name`, `email`, `createdAt`, `updatedAt`, `revenue`, `healthScore`

---

## Critical Implementation Notes

### 1. Password Security

**NEVER store plain text passwords!**

```javascript
// ✅ CORRECT - Hash with bcrypt
const bcrypt = require('bcrypt');
const saltRounds = 10;

// On signup/password change
const passwordHash = await bcrypt.hash(plainPassword, saltRounds);
// Store passwordHash in database

// On login
const isValid = await bcrypt.compare(plainPassword, storedHash);
```

### 2. JWT Token Security

**Access Token:**
- Short-lived (24 hours)
- Contains user ID, email, role
- Used for API authentication

**Refresh Token:**
- Long-lived (30 days)
- Used to get new access token
- Store in httpOnly cookie (recommended) or localStorage

**Token Blacklist (Optional but Recommended):**
```javascript
// Use Redis for token blacklist
const redis = require('redis');
const client = redis.createClient();

// On logout
await client.setex(`blacklist:${token}`, 86400, 'true');

// On auth check
const isBlacklisted = await client.get(`blacklist:${token}`);
if (isBlacklisted) {
  return res.status(401).json({ error: 'Token revoked' });
}
```

### 3. CORS Configuration

**CRITICAL:** Configure CORS properly

```javascript
// Express.js example
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:8080',  // Development
    'https://your-frontend-domain.com'  // Production
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 4. Input Validation

**ALWAYS validate input!**

```javascript
// Example with Joi (Node.js)
const Joi = require('joi');

const clientSchema = Joi.object({
  name: Joi.string().max(200).required(),
  email: Joi.string().email().required(),
  status: Joi.string().valid('active', 'pending', 'completed'),
  tier: Joi.string().valid('Enterprise', 'Growth', 'Strategic'),
  healthScore: Joi.number().min(0).max(100)
});

// In route handler
const { error, value } = clientSchema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details });
}
```

### 5. SQL Injection Prevention

**ALWAYS use parameterized queries!**

```javascript
// ❌ WRONG - Vulnerable to SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ CORRECT - Parameterized query
const query = 'SELECT * FROM users WHERE email = $1';
const result = await db.query(query, [email]);
```

### 6. Rate Limiting

**Prevent abuse with rate limiting:**

```javascript
// Express.js with express-rate-limit
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

app.use('/api/auth/login', authLimiter);
```

### 7. Logging

**Log everything important:**

```javascript
// Use a proper logging library (Winston, Pino, etc.)
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log all requests
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?.id
  });
  next();
});

// Log errors
app.use((err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    userId: req.user?.id
  });
  res.status(500).json({ error: 'Internal server error' });
});
```

### 8. Environment Variables

**Never commit secrets to git!**

```bash
# .env file (add to .gitignore)
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/focal_point_compass

# JWT Secrets
JWT_ACCESS_SECRET=your_64_char_random_string_here
JWT_REFRESH_SECRET=different_64_char_random_string_here

# CORS
FRONTEND_URL=http://localhost:8080

# Optional
REDIS_URL=redis://localhost:6379
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### 9. Soft Deletes

**Don't hard delete data!**

```sql
-- Add deleted_at column to all tables
ALTER TABLE clients ADD COLUMN deleted_at TIMESTAMP NULL;

-- On delete, set timestamp instead of removing row
UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1;

-- Filter out deleted records in queries
SELECT * FROM clients WHERE deleted_at IS NULL;
```

### 10. Timestamps

**Always track creation and updates:**

```sql
-- Add to all tables
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- Update trigger (PostgreSQL)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Testing Strategy

### 1. Unit Tests

**Test individual functions:**

```javascript
// Example with Jest
describe('User Service', () => {
  test('should hash password correctly', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });
  
  test('should generate valid JWT token', () => {
    const user = { id: 'usr_123', email: 'test@example.com', role: 'employee' };
    const token = generateAccessToken(user);
    const decoded = verifyAccessToken(token);
    
    expect(decoded.sub).toBe(user.id);
    expect(decoded.email).toBe(user.email);
  });
});
```

### 2. Integration Tests

**Test API endpoints:**

```javascript
// Example with Supertest
const request = require('supertest');
const app = require('./app');

describe('POST /auth/signup', () => {
  test('should create new user', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'securePassword123',
        role: 'employee'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('test@example.com');
    expect(response.body.accessToken).toBeDefined();
  });
  
  test('should reject duplicate email', async () => {
    // Create first user
    await request(app).post('/api/auth/signup').send({
      email: 'duplicate@example.com',
      password: 'password123'
    });
    
    // Try to create duplicate
    const response = await request(app).post('/api/auth/signup').send({
      email: 'duplicate@example.com',
      password: 'password456'
    });
    
    expect(response.status).toBe(409);
  });
});

describe('GET /clients', () => {
  let authToken;
  
  beforeAll(async () => {
    // Login to get token
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'adminPassword'
    });
    authToken = response.body.accessToken;
  });
  
  test('should return clients list', async () => {
    const response = await request(app)
      .get('/api/clients')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  test('should reject without token', async () => {
    const response = await request(app).get('/api/clients');
    expect(response.status).toBe(401);
  });
});
```

### 3. Load Testing

**Test performance with Artillery or k6:**

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"

scenarios:
  - name: "Get clients"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          capture:
            - json: "$.accessToken"
              as: "token"
      - get:
          url: "/api/clients"
          headers:
            Authorization: "Bearer {{ token }}"
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations run successfully
- [ ] JWT secrets are strong random strings (64+ chars)
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Database backups configured
- [ ] SSL/TLS certificates installed
- [ ] Health check endpoint created (`GET /health`)

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@prod-db:5432/focal_point_compass
JWT_ACCESS_SECRET=production_secret_64_chars_minimum
JWT_REFRESH_SECRET=different_production_secret_64_chars
FRONTEND_URL=https://your-production-domain.com
REDIS_URL=redis://prod-redis:6379
```

### Health Check Endpoint

```javascript
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check Redis connection (if using)
    await redis.ping();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Database Migration Strategy

**Use a migration tool (Prisma, Knex, TypeORM, etc.):**

```bash
# Example with Prisma
npx prisma migrate deploy  # Run migrations in production
npx prisma generate        # Generate Prisma client
```

### Monitoring

**Set up monitoring for:**
- API response times
- Error rates
- Database query performance
- Memory usage
- CPU usage
- Request rate

**Recommended tools:**
- New Relic
- Datadog
- Prometheus + Grafana
- AWS CloudWatch

---

## Common Pitfalls to Avoid

### 1. ❌ Not Validating Input
**Problem:** Accepting any data from frontend
**Solution:** Always validate with schema validation library

### 2. ❌ Storing Plain Text Passwords
**Problem:** Database breach exposes all passwords
**Solution:** Always hash with bcrypt (cost factor 10+)

### 3. ❌ Not Using Parameterized Queries
**Problem:** SQL injection vulnerabilities
**Solution:** Always use parameterized queries or ORM

### 4. ❌ Weak JWT Secrets
**Problem:** Tokens can be forged
**Solution:** Use 64+ character random strings

### 5. ❌ No Rate Limiting
**Problem:** API abuse, DDoS attacks
**Solution:** Implement rate limiting on all endpoints

### 6. ❌ Exposing Stack Traces
**Problem:** Leaking implementation details to attackers
**Solution:** Generic error messages in production

```javascript
// ❌ WRONG
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack });
});

// ✅ CORRECT
app.use((err, req, res, next) => {
  logger.error(err.stack);  // Log internally
  res.status(500).json({ error: 'Internal server error' });  // Generic message
});
```

### 7. ❌ Not Handling CORS Properly
**Problem:** Frontend can't make requests
**Solution:** Configure CORS with specific origins

### 8. ❌ No Pagination
**Problem:** Returning 10,000 records crashes browser
**Solution:** Always paginate list endpoints

### 9. ❌ Hard Deletes
**Problem:** Accidental data loss, no audit trail
**Solution:** Use soft deletes (deleted_at timestamp)

### 10. ❌ No Logging
**Problem:** Can't debug production issues
**Solution:** Log all requests, errors, and important events

### 11. ❌ Committing Secrets to Git
**Problem:** Exposed credentials
**Solution:** Use .env files, add to .gitignore

### 12. ❌ Not Testing Auth
**Problem:** Security vulnerabilities
**Solution:** Write tests for all auth flows

### 13. ❌ Ignoring N+1 Queries
**Problem:** Slow API responses
**Solution:** Use eager loading, optimize queries

```javascript
// ❌ WRONG - N+1 query problem
const clients = await db.query('SELECT * FROM clients');
for (const client of clients) {
  client.invoices = await db.query('SELECT * FROM invoices WHERE client_id = $1', [client.id]);
}

// ✅ CORRECT - Single query with JOIN
const clients = await db.query(`
  SELECT c.*, json_agg(i.*) as invoices
  FROM clients c
  LEFT JOIN invoices i ON i.client_id = c.id
  GROUP BY c.id
`);
```

### 14. ❌ Not Handling Timezones
**Problem:** Date/time inconsistencies
**Solution:** Store all timestamps in UTC, convert in frontend

### 15. ❌ No Database Indexes
**Problem:** Slow queries
**Solution:** Add indexes on frequently queried columns

```sql
-- Add indexes for common queries
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

---

## Quick Start Guide

### Step 1: Setup Project (30 minutes)

```bash
# Create project directory
mkdir focal-point-backend
cd focal-point-backend

# Initialize Node.js project (or Python/Go equivalent)
npm init -y

# Install dependencies
npm install express cors bcrypt jsonwebtoken pg dotenv
npm install --save-dev nodemon jest supertest

# Create folder structure
mkdir -p src/{routes,controllers,models,middleware,utils}
touch src/index.js .env .gitignore
```

### Step 2: Configure Environment (10 minutes)

```bash
# .env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/focal_point_compass
JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
FRONTEND_URL=http://localhost:8080
```

```bash
# .gitignore
node_modules/
.env
*.log
dist/
```

### Step 3: Setup Database (30 minutes)

```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql

# Create database
createdb focal_point_compass

# Run schema creation
psql focal_point_compass < schema.sql
```

### Step 4: Implement Auth (2 hours)

**Priority order:**
1. POST /auth/signup
2. POST /auth/login
3. GET /auth/me
4. POST /auth/logout
5. Auth middleware

### Step 5: Implement Core Endpoints (1 week)

**Day 1-2:** Clients CRUD
**Day 3:** Tasks CRUD
**Day 4:** Projects CRUD
**Day 5:** Team Members CRUD
**Day 6:** Dashboard aggregation
**Day 7:** Testing & bug fixes

### Step 6: Test with Frontend (1 day)

```bash
# In frontend project
# Update .env
VITE_USE_REMOTE_API=true
VITE_API_BASE_URL=http://localhost:3000/api

# Start frontend
npm run dev

# Start backend
npm run dev

# Test all features
```

---

## Sample Code Templates

### Express.js Server Setup

```javascript
// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const { requireAuth } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', requireAuth, clientRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Auth Middleware

```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
```

### Auth Controller

```javascript
// src/controllers/auth.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

async function signup(req, res) {
  try {
    const { name, email, password, role = 'employee' } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await db.query(`
      INSERT INTO users (id, name, email, password_hash, role, employee_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      `usr_${Date.now()}`,
      name,
      email,
      passwordHash,
      role,
      `EMP-${Math.floor(1000 + Math.random() * 9000)}`
    ]);
    
    const user = result.rows[0];
    delete user.password_hash;
    
    // Generate tokens
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '24h' }
    );
    
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    // Get user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    delete user.password_hash;
    
    // Generate tokens
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '24h' }
    );
    
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { signup, login };
```

### Clients Controller

```javascript
// src/controllers/clients.js
const db = require('../db');

async function getClients(req, res) {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM clients WHERE deleted_at IS NULL';
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL',
      []
    );
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createClient(req, res) {
  try {
    const { name, email, industry, manager, status = 'pending', tier = 'Growth' } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const result = await db.query(`
      INSERT INTO clients (name, email, industry, manager, status, tier, avatar, health_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      name,
      email,
      industry,
      manager,
      status,
      tier,
      name.slice(0, 2).toUpperCase(),
      75
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getClients, createClient };
```

---

## Frontend Integration Testing

### Test Checklist

Once backend is running, test these flows:

**Authentication:**
- [ ] Signup with new email
- [ ] Login with correct credentials
- [ ] Login with wrong password (should fail)
- [ ] Access protected route without token (should redirect to login)
- [ ] Logout and verify token is cleared

**Clients:**
- [ ] View clients list
- [ ] Create new client via Quick Create dialog
- [ ] Edit client details
- [ ] Delete client
- [ ] Search clients
- [ ] Filter by status

**Tasks:**
- [ ] View tasks board
- [ ] Create new task
- [ ] Drag task between columns
- [ ] Edit task
- [ ] Delete task

**Projects:**
- [ ] View projects list
- [ ] Create new project
- [ ] Update project progress
- [ ] Delete project

**Team:**
- [ ] View team members
- [ ] Add new team member
- [ ] Edit team member
- [ ] Delete team member

**Dashboard:**
- [ ] View dashboard metrics
- [ ] Verify charts load
- [ ] Check activity feed

---

## Performance Optimization Tips

### 1. Database Query Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_clients_status ON clients(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_column ON tasks(column) WHERE deleted_at IS NULL;

-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE SELECT * FROM clients WHERE status = 'active';
```

### 2. Caching with Redis

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getDashboard(req, res) {
  // Check cache first
  const cached = await client.get('dashboard:data');
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  // Calculate dashboard data
  const data = await calculateDashboardData();
  
  // Cache for 5 minutes
  await client.setex('dashboard:data', 300, JSON.stringify(data));
  
  res.json(data);
}
```

### 3. Connection Pooling

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};
```

### 4. Compression

```javascript
const compression = require('compression');
app.use(compression());
```

---

## Support & Resources

### Documentation Links
- **Express.js:** https://expressjs.com/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **JWT:** https://jwt.io/
- **bcrypt:** https://github.com/kelektiv/node.bcrypt.js

### Frontend Code Reference
- API Client: `src/lib/api-client.ts`
- Auth Service: `src/services/auth.ts`
- CRM Service: `src/services/crm.ts`
- Type Definitions: `src/types/crm.ts`

### Questions?
Review the frontend code for exact request/response formats. All TypeScript types are your API contract.

---

## Timeline Estimate

**Week 1: Foundation**
- Day 1-2: Project setup, database schema
- Day 3-4: Authentication endpoints
- Day 5: Testing auth flow

**Week 2: Core Features**
- Day 1-2: Clients CRUD
- Day 3: Tasks CRUD
- Day 4: Projects CRUD
- Day 5: Team Members CRUD

**Week 3: Advanced Features**
- Day 1: Dashboard aggregation
- Day 2: Invoices CRUD
- Day 3: File upload
- Day 4-5: Testing & bug fixes

**Week 4: Polish & Deploy**
- Day 1-2: Performance optimization
- Day 3: Security audit
- Day 4: Deployment setup
- Day 5: Production deployment

---

## Final Checklist

Before going live:

- [ ] All endpoints implemented and tested
- [ ] Authentication working correctly
- [ ] CORS configured for production domain
- [ ] Environment variables set in production
- [ ] Database migrations run
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Error tracking setup (Sentry)
- [ ] Database backups configured
- [ ] Health check endpoint working
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Frontend connected and tested

---

**Good luck with your backend development! 🚀**

**Remember:** Start simple, test often, and iterate. The frontend is ready and waiting for you.
