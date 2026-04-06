# API Contract Specification
## Focal Point Compass - Complete API Reference

**Base URL:** `http://localhost:3000/api` (development)  
**Authentication:** JWT Bearer Token in `Authorization` header  
**Content-Type:** `application/json`

---

## Authentication Endpoints

### POST /auth/signup

**Request Body:**
```typescript
{
  name: string;          // Required, max 100 chars
  email: string;         // Required, valid email format
  password: string;      // Required, min 8 chars
  role?: "admin" | "manager" | "employee" | "client";  // Optional, default: "employee"
}
```

**Success Response (201):**
```typescript
{
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "manager" | "employee" | "client";
    employeeId: string;
    department: string;
    team: string;
    designation: string;
    manager: string;
    workingHours: string;
    officeLocation: string;
    timeZone: string;
    baseSalary: number;
    allowances: number;
    deductions: number;
    paymentMode: "bank-transfer" | "cash" | "upi";
    payrollCycle: string;
    payrollDueDate: string;
    joinedAt: string;      // ISO 8601 date
    location: string;
  };
  accessToken: string;     // JWT, expires in 24h
  refreshToken: string;    // JWT, expires in 30d
}
```

**Error Responses:**
- `400` - Missing required fields or invalid format
- `409` - Email already exists

---

### POST /auth/login

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Success Response (200):**
```typescript
{
  user: { /* same as signup */ };
  accessToken: string;
  refreshToken: string;
}
```

**Error Responses:**
- `401` - Invalid credentials
- `404` - User not found

---

### GET /auth/me

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Success Response (200):**
```typescript
{
  user: { /* full user object */ };
  accessToken: string;
  refreshToken: string;
}
```

**Error Responses:**
- `401` - Invalid or expired token

---

### POST /auth/logout

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Success Response (200):**
```typescript
{
  message: "Logged out successfully"
}
```

---

## Client Endpoints

### GET /clients

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Query Parameters:**
```typescript
{
  page?: number;         // Default: 1
  limit?: number;        // Default: 50, max: 100
  status?: "active" | "pending" | "completed";
  tier?: "Enterprise" | "Growth" | "Strategic";
  search?: string;       // Search in name, email, company
  sort?: "name" | "revenue" | "createdAt" | "healthScore";
  order?: "asc" | "desc";  // Default: "desc"
}
```

**Success Response (200):**
```typescript
{
  data: Array<{
    id: number;
    name: string;
    industry: string;
    manager: string;
    status: "active" | "pending" | "completed";
    revenue: string;
    location: string;
    avatar: string;
    tier: "Enterprise" | "Growth" | "Strategic";
    healthScore: number;  // 0-100
    nextAction: string;
    segment: "Expansion" | "Renewal" | "New Business";
    email: string;
    phone: string;
    company: string;
    createdAt: string;    // ISO 8601
    updatedAt: string;    // ISO 8601
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Error Responses:**
- `401` - Unauthorized

---

### POST /clients

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Required Roles:** `admin`, `manager`

**Request Body:**
```typescript
{
  name: string;          // Required
  email: string;         // Required
  industry?: string;
  manager?: string;
  status?: "active" | "pending" | "completed";  // Default: "pending"
  revenue?: string;
  location?: string;
  tier?: "Enterprise" | "Growth" | "Strategic";  // Default: "Growth"
  segment?: "Expansion" | "Renewal" | "New Business";
  phone?: string;
  company?: string;
}
```

**Success Response (201):**
```typescript
{
  id: number;
  name: string;
  avatar: string;        // Auto-generated from name
  healthScore: number;   // Default: 75
  nextAction: string;    // Default: "Initial contact"
  createdAt: string;
  updatedAt: string;
  /* ... all other fields */
}
```

**Error Responses:**
- `400` - Invalid input
- `401` - Unauthorized
- `403` - Insufficient permissions

---

### PATCH /clients/:id

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Required Roles:** `admin`, `manager`

**Request Body:** (all fields optional)
```typescript
{
  name?: string;
  email?: string;
  status?: "active" | "pending" | "completed";
  healthScore?: number;
  nextAction?: string;
  /* ... any other client fields */
}
```

**Success Response (200):**
```typescript
{
  /* full updated client object */
  updatedAt: string;  // New timestamp
}
```

**Error Responses:**
- `400` - Invalid input
- `401` - Unauthorized
- `403` - Insufficient permissions
- `404` - Client not found

---

### DELETE /clients/:id

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Required Roles:** `admin`

**Success Response (200):**
```typescript
{
  message: "Client deleted successfully"
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Insufficient permissions
- `404` - Client not found

---

## Task Endpoints

### GET /tasks

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Success Response (200):**
```typescript
{
  todo: Array<{
    id: number;
    title: string;
    assignee: string;
    avatar: string;
    priority: "high" | "medium" | "low";
    dueDate: string;      // YYYY-MM-DD
    tags: string[];
    valueStream: "Growth" | "Product" | "Support";
  }>;
  "in-progress": Array<{ /* same structure */ }>;
  done: Array<{ /* same structure */ }>;
}
```

---

### POST /tasks

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```typescript
{
  title: string;         // Required
  assignee: string;      // Required
  priority: "high" | "medium" | "low";  // Required
  dueDate: string;       // Required, YYYY-MM-DD
  tags?: string[];
  valueStream?: "Growth" | "Product" | "Support";
  column?: "todo" | "in-progress" | "done";  // Default: "todo"
}
```

**Success Response (201):**
```typescript
{
  id: number;
  avatar: string;        // Auto-generated from assignee
  /* ... all fields */
}
```

---

### PATCH /tasks/:id

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:** (all fields optional)
```typescript
{
  title?: string;
  assignee?: string;
  priority?: "high" | "medium" | "low";
  dueDate?: string;
  tags?: string[];
  column?: "todo" | "in-progress" | "done";  // Move between columns
}
```

**Success Response (200):**
```typescript
{
  /* full updated task object */
}
```

---

### DELETE /tasks/:id

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Success Response (200):**
```typescript
{
  message: "Task deleted successfully"
}
```

---

## Project Endpoints

### GET /projects

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Success Response (200):**
```typescript
{
  data: Array<{
    id: number;
    name: string;
    description: string;
    progress: number;     // 0-100
    status: "active" | "pending" | "completed" | "in-progress";
    team: string[];       // Array of initials
    dueDate: string;      // YYYY-MM-DD
    stage: "Discovery" | "Build" | "Review" | "Launch";
    budget: string;
    tasks: {
      done: number;
      total: number;
    };
  }>;
}
```

---

### POST /projects

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Required Roles:** `admin`, `manager`

**Request Body:**
```typescript
{
  name: string;          // Required
  description?: string;
  progress?: number;     // Default: 0
  status?: "active" | "pending" | "completed" | "in-progress";
  team?: string[];
  dueDate?: string;
  stage?: "Discovery" | "Build" | "Review" | "Launch";
  budget?: string;
}
```

**Success Response (201):**
```typescript
{
  id: number;
  tasks: { done: 0, total: 0 };  // Default
  /* ... all fields */
}
```

---

### PATCH /projects/:id
### DELETE /projects/:id

(Same pattern as clients)

---

## Team Member Endpoints

### GET /team-members

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Success Response (200):**
```typescript
{
  data: Array<{
    id: number;
    name: string;
    email: string;
    role: "Admin" | "Manager" | "Employee";
    status: "active" | "pending" | "completed";
    avatar: string;
    department: string;
    team: string;
    designation: string;
    manager: string;
    workingHours: string;
    officeLocation: string;
    timeZone: string;
    baseSalary: number;
    allowances: number;
    deductions: number;
    paymentMode: "bank-transfer" | "cash" | "upi";
    attendance: "present" | "late" | "remote" | "absent";
    checkIn: string;
    location: string;
    workload: number;
  }>;
}
```

---

### POST /team-members

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Required Roles:** `admin`, `manager`

**Request Body:**
```typescript
{
  name: string;          // Required
  email: string;         // Required
  role: "Admin" | "Manager" | "Employee";  // Required
  department: string;
  team: string;
  designation: string;
  baseSalary: number;
  /* ... other fields */
}
```

**Success Response (201):**
```typescript
{
  id: number;
  avatar: string;        // Auto-generated
  status: "active";      // Default
  /* ... all fields */
}
```

---

### PATCH /team-members/:id
### DELETE /team-members/:id

(Same pattern as clients)

---

## Invoice Endpoints

### GET /invoices

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Success Response (200):**
```typescript
{
  data: Array<{
    id: string;
    client: string;
    amount: string;
    date: string;         // YYYY-MM-DD
    due: string;          // YYYY-MM-DD
    status: "active" | "pending" | "completed";
  }>;
}
```

---

### POST /invoices

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Required Roles:** `admin`, `manager`

**Request Body:**
```typescript
{
  client: string;        // Required
  amount: string;        // Required
  date: string;          // Required, YYYY-MM-DD
  due: string;           // Required, YYYY-MM-DD
  status?: "active" | "pending" | "completed";  // Default: "pending"
}
```

**Success Response (201):**
```typescript
{
  id: string;            // Auto-generated
  /* ... all fields */
}
```

---

### PATCH /invoices/:id
### DELETE /invoices/:id

(Same pattern as clients)

---

## Dashboard Endpoint

### GET /dashboard

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Success Response (200):**
```typescript
{
  metrics: Array<{
    label: string;
    value: string;
    change: string;
    direction: "up" | "down";
    detail: string;
  }>;
  revenueSeries: Array<{
    month: string;
    revenue: number;
    deals: number;
    retention: number;
  }>;
  pipelineBreakdown: Array<{
    name: string;
    value: number;
    color: string;        // HSL color
  }>;
  operatingCadence: Array<{
    name: string;
    value: number;        // 0-100
  }>;
  activityFeed: Array<{
    id: number;
    text: string;
    time: string;
    type: "active" | "pending" | "completed" | "in-progress";
    category?: "collaboration" | "sales" | "delivery" | "finance" | "hiring" | "system";
    source?: string;
  }>;
  todayFocus: string[];
  executionReadiness: number;  // 0-100
  collaborators: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string;
    status: "online" | "idle" | "reviewing";
    lastSeen: string;
  }>;
}
```

**Implementation Notes:**
- This is a complex aggregation endpoint
- Recommend caching for 5 minutes
- Calculate from database in real-time

---

## Additional Endpoints (Lower Priority)

### GET /conversations
### GET /messages
### GET /reports
### GET /attendance
### GET /leads
### GET /deals
### GET /companies
### GET /sales-metrics

(See full guide for details)

---

## Error Response Format

**All error responses follow this format:**

```typescript
{
  error: {
    code: string;        // Error code (e.g., "VALIDATION_ERROR")
    message: string;     // Human-readable message
    details?: Array<{    // Optional validation details
      field: string;
      message: string;
    }>;
  };
  timestamp: string;     // ISO 8601
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid input
- `UNAUTHORIZED` - Missing or invalid token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Duplicate resource
- `INTERNAL_ERROR` - Server error

---

## Rate Limiting

**Limits:**
- General endpoints: 100 requests per 15 minutes per IP
- Auth endpoints: 5 requests per 15 minutes per IP

**Rate limit headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1711523422
```

**Rate limit exceeded response (429):**
```typescript
{
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later"
  }
}
```

---

## CORS Configuration

**Allowed Origins:**
- Development: `http://localhost:8080`
- Production: Your production domain

**Allowed Methods:**
- `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`

**Allowed Headers:**
- `Content-Type`, `Authorization`

**Credentials:** `true`

---

## Testing the API

### Using cURL

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get clients (with token)
curl http://localhost:3000/api/clients \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create client
curl -X POST http://localhost:3000/api/clients \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Client","email":"client@example.com"}'
```

### Using Postman

1. Import this API contract as OpenAPI spec
2. Set base URL: `http://localhost:3000/api`
3. Add Authorization header: `Bearer {{token}}`
4. Test all endpoints

---

## Frontend Integration

**Frontend automatically:**
- Adds `Authorization: Bearer {token}` header to all requests
- Handles 401 errors (redirects to login)
- Falls back to localStorage if API fails
- Retries failed requests once

**To enable backend mode:**
```bash
# In frontend .env
VITE_USE_REMOTE_API=true
VITE_API_BASE_URL=http://localhost:3000/api
```

---

**This is your complete API contract. Implement these endpoints exactly as specified for seamless frontend integration.**
