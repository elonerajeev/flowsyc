# Backend Quick Reference
## Focal Point Compass - Cheat Sheet

---

## 🚀 Quick Start Commands

```bash
# 1. Enable backend mode in frontend
echo "VITE_USE_REMOTE_API=true" >> .env

# 2. Start backend server
cd backend
npm run dev  # Should run on http://localhost:3000

# 3. Start frontend
cd frontend
npm run dev  # Should run on http://localhost:8080

# 4. Test connection
curl http://localhost:3000/health
```

---

## 📋 Required Endpoints (40 total)

### Authentication (4 endpoints) - CRITICAL
```
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
```

### Clients (4 endpoints) - HIGH PRIORITY
```
GET    /api/clients
POST   /api/clients
PATCH  /api/clients/:id
DELETE /api/clients/:id
```

### Tasks (4 endpoints) - HIGH PRIORITY
```
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

### Projects (4 endpoints) - MEDIUM PRIORITY
```
GET    /api/projects
POST   /api/projects
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

### Team Members (4 endpoints) - HIGH PRIORITY
```
GET    /api/team-members
POST   /api/team-members
PATCH  /api/team-members/:id
DELETE /api/team-members/:id
```

### Invoices (4 endpoints) - MEDIUM PRIORITY
```
GET    /api/invoices
POST   /api/invoices
PATCH  /api/invoices/:id
DELETE /api/invoices/:id
```

### Dashboard (1 endpoint) - HIGH PRIORITY
```
GET    /api/dashboard
```

### Additional (15 endpoints) - LOW PRIORITY
```
GET    /api/conversations
GET    /api/messages
GET    /api/reports
GET    /api/attendance
GET    /api/leads
GET    /api/deals
GET    /api/companies
GET    /api/sales-metrics
GET    /api/command-actions
GET    /api/theme-previews
```

---

## 🔐 JWT Token Format

**Access Token Payload:**
```json
{
  "sub": "usr_abc123",
  "email": "user@example.com",
  "role": "employee",
  "iat": 1711523422,
  "exp": 1711609822
}
```

**Generate Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🗄️ Database Tables (Minimum)

```sql
users
clients
projects
tasks
team_members
invoices
```

**All tables must have:**
- `id` (primary key)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `deleted_at` (timestamp, nullable) - for soft deletes

---

## 🔒 Security Checklist

- [ ] Hash passwords with bcrypt (cost 10)
- [ ] Use parameterized queries (prevent SQL injection)
- [ ] Validate all input
- [ ] Add rate limiting
- [ ] Configure CORS properly
- [ ] Use strong JWT secrets (64+ chars)
- [ ] Never expose stack traces in production
- [ ] Add Authorization header to all protected routes
- [ ] Implement soft deletes (don't hard delete)
- [ ] Log all errors and requests

---

## 📊 Standard Response Formats

**Success:**
```json
{
  "data": { /* resource */ },
  "message": "Success"
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input"
  }
}
```

**Pagination:**
```json
{
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 328,
    "totalPages": 7
  }
}
```

---

## 🎯 HTTP Status Codes

| Code | Use Case |
|------|----------|
| 200 | Successful GET, PATCH, DELETE |
| 201 | Successful POST (created) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 409 | Conflict (duplicate resource) |
| 500 | Internal server error |

---

## 🔑 Environment Variables

```bash
# Required
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_ACCESS_SECRET=64_char_random_string
JWT_REFRESH_SECRET=different_64_char_random_string
FRONTEND_URL=http://localhost:8080

# Optional
REDIS_URL=redis://localhost:6379
AWS_S3_BUCKET=your-bucket
```

---

## 🧪 Testing Commands

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Load testing
artillery run artillery-config.yml
```

---

## 🚨 Common Mistakes to Avoid

1. ❌ Storing plain text passwords
2. ❌ Not validating input
3. ❌ SQL injection vulnerabilities
4. ❌ Weak JWT secrets
5. ❌ No rate limiting
6. ❌ Exposing stack traces
7. ❌ Wrong CORS configuration
8. ❌ No pagination
9. ❌ Hard deletes
10. ❌ Committing secrets to git

---

## 📞 Frontend Integration Points

**Frontend checks this env var:**
```bash
VITE_USE_REMOTE_API=true  # Set to true to use your backend
```

**Frontend API client:**
- Location: `src/lib/api-client.ts`
- Automatically adds JWT token to headers
- Falls back to localStorage if API fails

**Frontend service layer:**
- Location: `src/services/crm.ts`
- All API calls go through here
- 15 mutation methods ready to connect

---

## ⏱️ Development Timeline

**Week 1:** Auth + Database setup
**Week 2:** Core CRUD endpoints
**Week 3:** Dashboard + Advanced features
**Week 4:** Testing + Deployment

**Total:** 3-4 weeks

---

## 🎓 Priority Order

1. **CRITICAL (Week 1):**
   - POST /auth/signup
   - POST /auth/login
   - GET /auth/me
   - Database setup

2. **HIGH (Week 2):**
   - GET/POST/PATCH/DELETE /clients
   - GET/POST/PATCH/DELETE /tasks
   - GET/POST/PATCH/DELETE /team-members

3. **MEDIUM (Week 3):**
   - GET /dashboard
   - GET/POST/PATCH/DELETE /projects
   - GET/POST/PATCH/DELETE /invoices

4. **LOW (Week 4):**
   - Additional endpoints
   - File upload
   - Real-time features

---

## 📚 Key Files to Reference

**Frontend TypeScript Types (Your API Contract):**
- `src/types/crm.ts` - All data types
- `src/services/auth.ts` - Auth request/response formats
- `src/services/crm.ts` - CRM request/response formats

**Frontend API Client:**
- `src/lib/api-client.ts` - How frontend calls your API
- `src/lib/env.ts` - Environment configuration

---

## 🔗 Useful Links

- Full Guide: `BACKEND_DEVELOPMENT_GUIDE.md`
- Frontend Repo: Current directory
- Database Schema: See full guide Section 5
- API Endpoints: See full guide Section 3

---

## 💡 Pro Tips

1. Start with auth endpoints first
2. Test each endpoint with Postman/Insomnia before connecting frontend
3. Use database migrations (Prisma, Knex, etc.)
4. Add indexes to frequently queried columns
5. Cache dashboard data (5 min TTL)
6. Use connection pooling for database
7. Enable compression middleware
8. Set up logging from day 1
9. Write tests as you go
10. Deploy early, deploy often

---

**Need more details?** See `BACKEND_DEVELOPMENT_GUIDE.md` (complete 100+ page guide)

**Ready to start?** Run the Quick Start commands above! 🚀
