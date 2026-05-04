<p align="center">
  <img src="docs/Flowsyc-Prime-Workflow-Logo.gif" alt="Flowsyc Logo" width="200"/>
</p>

<h1 align="center">Flowsyc</h1>

<p align="center">
  <strong>Enterprise CRM for Modern Businesses</strong><br/>
  Manage clients, leads, deals, projects, tasks, invoices, HR & analytics — all in one powerful dashboard.
</p>

<p align="center">
  <a href="https://flowsyc-svuj.vercel.app"><img src="https://img.shields.io/badge/Website-flowsyc--svuj.vercel.app-blue?style=for-the-badge&logo=vercel" alt="Website"/></a>
  <a href="https://github.com/elonerajeev/flowsyc"><img src="https://img.shields.io/badge/GitHub-elonerajeev/flowsyc-blue?style=for-the-badge&logo=github" alt="GitHub"/></a>
  <a href="https://github.com/elonerajeev/flowsyc/stargazers"><img src="https://img.shields.io/github/stars/elonerajeev/flowsyc?style=for-the-badge" alt="Stars"/></a>
  <a href="https://github.com/elonerajeev/flowsyc/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/></a>
</p>

---

## 🚀 The Problem

<p align="center">
  <i>Modern businesses struggle with fragmented tools, scattered data, and disconnected teams.</i>
</p>

| Business Pain | Traditional Solution | Flowsyc Solution |
|------------|----------------|---------------|
| Separate apps for CRM, Projects, HR | 5+ different SaaS tools | ✅ All-in-one platform |
| Data scattered across systems | Export/Import headaches | ✅ Single source of truth |
| Expensive per-seat pricing | $50-100/user/month | ✅ Cost-effective |
| Complex implementation | Months of setup | ✅ Ready in days |
| No customization | Rigid workflows | ✅ Fully configurable |
| Poor team adoption | Low engagement | ✅ Intuitive UI/UX |

---

## 💡 Why Flowsyc?

### The All-in-One Business Management Platform

Flowsyc replaces **dozens** of disconnected tools with a single, unified platform:

| Module | Replaces | Features |
|--------|----------|----------|
| **Sales CRM** | Salesforce, Pipedrive | Leads, Deals, Pipeline, Forecasts |
| **Project Mgmt** | Asana, Trello | Projects, Tasks, Kanban, Gantt |
| **Finance** | QuickBooks, FreshBooks | Invoices, Payments, Analytics |
| **HR** | BambooHR, Gusto | Employees, Payroll, Attendance |
| **Analytics** | Tableau, PowerBI | Dashboards, Reports, Insights |
| **Communication** | Slack, Email | Inbox, Notifications |

### Key Differentiators

- ✅ **Role-Based Access** — Admin, Manager, Employee, Client — granular permissions
- ✅ **Real-Time Updates** — Socket.IO live notifications
- ✅ **Workflow Automation** — Rule-based triggers & actions
- ✅ **Audit Logging** — Complete activity tracking
- ✅ **File Management** — Attachments, documents
- ✅ **Multi-Workspace** — Isolated team environments
- ✅ **Email Integration** — Gmail SMTP, Google Calendar
- ✅ **API-First** — RESTful backend

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **State** | TanStack Query, React Context |
| **Routing** | React Router v7 |
| **Charts** | Recharts |
| **Backend** | Express.js, TypeScript, Zod |
| **Database** | PostgreSQL (Prisma ORM) |
| **Auth** | JWT (Access + Refresh), Google OAuth |
| **Real-Time** | Socket.IO |
| **Email** | Nodemailer (SMTP) |
| **File Storage** | Multer (Local/Cloudinary) |
| **Monitoring** | Prometheus, Grafana, Loki |

---

## 📸 Screenshots

| Dashboard | Sales Pipeline | HR Management |
|-----------|--------------|---------------|
| ![Dashboard](docs/Flowsyc-Prime-Workflow-Logo.png) | ![Pipeline](docs/Flowsyc-Prime-Workflow-Logo.jpg) | ![HR](docs/Flowsyc-Prime-Workflow-Logo.gif) |

*See more in [docs/](docs/) folder.*

---

## 🎯 Who Is Flowsyc For?

| Business Type | Use Case |
|--------------|---------|
| **Small Business** | Replace multiple apps with one |
| **Agency** | Client management + projects |
| **Startup** | Sales + team + finance |
| **Enterprise** | Custom workflows + scale |
| **Consulting** | Time tracking + invoicing |
| **SaaS** | Customer success + billing |

---

## 📦 Installation

### Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/elonerajeev/flowsyc.git
cd flowsyc

# Start with Docker
docker-compose up -d

# Visit http://localhost:8080
```

### Manual Setup (Frontend on Vercel + Backend on EC2)

```bash
# Backend (on EC2)
cd backend
npm install
npx prisma migrate deploy
npm run build
npm start

# Frontend (deploy to Vercel)
# Connect GitHub repo to Vercel and set env vars:
# VITE_API_BASE_URL=http://185.27.134.55/api
# VITE_SOCKET_URL=ws://185.27.134.55
```

---

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/flowsyc

# Auth
JWT_ACCESS_SECRET=your_64_char_hex_secret
JWT_REFRESH_SECRET=your_64_char_hex_secret
COOKIE_SECRET=your_32_char_hex_secret

# Email (Gmail App Password)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cloud Storage (optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                       │
│  Port 8080 (prod) / 5173 (dev)                           │
│  • 35+ Pages  • Role-Gated  • Responsive                 │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP + WebSocket
┌────────────────────▼────────────────────────────────────┐
│                   BACKEND (Express)                     │
│  Port 3000                                              │
│  • REST API  • Auth  • Socket.IO                        │
│  • Zod Validation  • Rate Limiting                      │
└────────────────────┬────────────────────────────────────┘
                     │ Prisma ORM
┌────────────────────▼────────────────────────────────────┐
│              DATABASE (PostgreSQL)                      │
│  • 30+ Models  • Migrations  • Indexes                  │
└────────────────────────────────────────────────────────┘
```

---

## 📊 Features Matrix

| Feature | Status | Description |
|---------|--------|-----------|
| Client Management | ✅ | Accounts, contacts, companies |
| Lead Tracking | ✅ | Pipeline, stages, sources |
| Deal Management | ✅ | Deals, predictions, revenue |
| Project Management | ✅ | Projects, milestones, budget |
| Task Management | ✅ | Kanban, Gantt, priorities |
| Invoicing | ✅ | Create, send, track payments |
| HR Management | ✅ | Employees, payroll, attendance |
| Analytics | ✅ | Dashboards, reports, charts |
| Automation | ✅ | Rules, triggers, actions |
| Email Integration | ✅ | Gmail SMTP, templates |
| File Attachments | ✅ | Upload, download |
| Audit Logs | ✅ | Full activity tracking |
| Multi-Workspace | ✅ | Team isolation |
| Role-Based Access | ✅ | 4 roles with permissions |
| Real-Time Updates | ✅ | Socket.IO notifications |

---

## 🎁 Pricing

| Plan | Users | Price | Features |
|------|-------|-------|--------|
| **Free** | 1 | $0 | All core features |
| **Pro** | 10 | $29/mo | Priority support |
| **Enterprise** | Unlimited | Custom | On-premise, SLA |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com) - UI components
- [TanStack Query](https://tanstack.com/query) - Data fetching
- [Prisma](https://prisma.io) - Database ORM
- [Socket.IO](https://socket.io) - Real-time
- [Lucide Icons](https://lucide.dev) - Icons

---

<p align="center">
  <strong>Built with ❤️ by Flowsyc Team</strong><br/>
  <a href="https://flowsyc-svuj.vercel.app">flowsyc-svuj.vercel.app</a>
</p>