import { 
  UserRole, 
  LeadSource, 
  LeadStatus, 
  DealStage, 
  PayrollStatus, 
  PaymentMode, 
  EventRepeat, 
  AssignmentKind 
} from "@prisma/client";

import { env } from "../src/config/env";
import { prisma } from "../src/config/prisma";
import { authService } from "../src/services/auth.service";
import { clientsService } from "../src/services/clients.service";
import { projectsService } from "../src/services/projects.service";
import { tasksService } from "../src/services/tasks.service";
import { teamMembersService } from "../src/services/team-members.service";
import { teamsService } from "../src/services/teams.service";
import { invoicesService } from "../src/services/invoices.service";
import { notesService } from "../src/services/notes.service";
import { conversationSeedRecords, messageSeedRecords } from "../src/data/crm-static";

process.env.DISABLE_EMAIL_DELIVERY = "true";

function assertNonProduction() {
  if (env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error("Never seed in production");
  }
}

async function wipeExistingData() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany({}),
    prisma.calendarEvent.deleteMany({}),
    prisma.payroll.deleteMany({}),
    prisma.candidateActivity.deleteMany({}),
    prisma.candidate.deleteMany({}),
    prisma.jobPosting.deleteMany({}),
    prisma.message.deleteMany({}),
    prisma.conversation.deleteMany({}),
    prisma.note.deleteMany({}),
    prisma.invoice.deleteMany({}),
    prisma.teamMember.deleteMany({}),
    prisma.userPreference.deleteMany({ where: { userId: "system:teams" } }),
    prisma.task.deleteMany({}),
    prisma.project.deleteMany({}),
    prisma.client.deleteMany({}),
    prisma.dealActivity.deleteMany({}),
    prisma.deal.deleteMany({}),
    prisma.lead.deleteMany({}),
    prisma.refreshToken.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);
}

async function seedUsers() {
  const accounts = [
    { name: "Sarah Johnson", email: "admin@crmpro.com", password: "Password123!", role: UserRole.admin },
    { name: "Mike Chen", email: "manager@crmpro.com", password: "Password123!", role: UserRole.manager },
    { name: "Emily Davis", email: "employee1@crmpro.com", password: "Password123!", role: UserRole.employee },
    { name: "Lisa Park", email: "employee2@crmpro.com", password: "Password123!", role: UserRole.employee },
  ] as const;

  for (const account of accounts) {
    await authService.signup(account);
  }
}

async function seedClients() {
  const clients = [
    { name: "Acme Corporation", email: "contact@acme.com", industry: "Technology", manager: "Sarah Johnson", status: "active", revenue: "$45,000", location: "San Francisco, CA", tier: "Enterprise", healthScore: 92, nextAction: "Renewal prep call", segment: "Renewal", phone: "+1-555-0101", company: "Acme Corporation" },
    { name: "GlobalTech Inc", email: "hello@globaltech.com", industry: "Finance", manager: "Mike Chen", status: "active", revenue: "$82,000", location: "New York, NY", tier: "Strategic", healthScore: 88, nextAction: "Multi-region rollout", segment: "Expansion", phone: "+1-555-0102", company: "GlobalTech Inc" },
    { name: "StartUp Labs", email: "team@startuplabs.com", industry: "Healthcare", manager: "Emily Davis", status: "pending", revenue: "$12,000", location: "Austin, TX", tier: "Growth", healthScore: 71, nextAction: "Finalize onboarding docs", segment: "New Business", phone: "+1-555-0103", company: "StartUp Labs" },
    { name: "Digital Wave", email: "ops@digitalwave.com", industry: "Marketing", manager: "James Wilson", status: "active", revenue: "$28,000", location: "Chicago, IL", tier: "Growth", healthScore: 80, nextAction: "Quarterly strategy review", segment: "Expansion", phone: "+1-555-0104", company: "Digital Wave" },
    { name: "CloudNine Solutions", email: "security@cloudnine.com", industry: "Technology", manager: "Lisa Park", status: "pending", revenue: "$55,000", location: "Seattle, WA", tier: "Enterprise", healthScore: 76, nextAction: "Security review workshop", segment: "New Business", phone: "+1-555-0105", company: "CloudNine Solutions" },
    { name: "MetaVerse Corp", email: "exec@metaversecorp.com", industry: "Entertainment", manager: "Sarah Johnson", status: "completed", revenue: "$120,000", location: "Los Angeles, CA", tier: "Strategic", healthScore: 96, nextAction: "Executive business review", segment: "Renewal", phone: "+1-555-0106", company: "MetaVerse Corp" },
    { name: "Summit Retail", email: "ops@summitretail.com", industry: "Retail", manager: "Mike Chen", status: "active", revenue: "$33,000", location: "Denver, CO", tier: "Growth", healthScore: 84, nextAction: "Integration signoff", segment: "Expansion", phone: "+1-555-0107", company: "Summit Retail" },
    { name: "Northstar Logistics", email: "contact@northstarlogistics.com", industry: "Logistics", manager: "Emily Davis", status: "pending", revenue: "$21,500", location: "Dallas, TX", tier: "Growth", healthScore: 73, nextAction: "Contract review", segment: "New Business", phone: "+1-555-0108", company: "Northstar Logistics" },
  ] as const;

  for (const client of clients) {
    await clientsService.create(client);
  }
}

async function seedProjects() {
  const projects = [
    { name: "CRM Platform v2.0", description: "Complete redesign of the CRM dashboard with new analytics", progress: 78, status: "in-progress", team: ["SJ", "MC", "LP"], dueDate: "Apr 15", stage: "Build", budget: "$240K" },
    { name: "Mobile App Launch", description: "Native iOS and Android app for client management", progress: 45, status: "in-progress", team: ["MC", "ED"], dueDate: "May 1", stage: "Review", budget: "$180K" },
    { name: "AI Concierge", description: "Account insights assistant for sales and success teams", progress: 92, status: "active", team: ["MC", "JW"], dueDate: "Mar 28", stage: "Launch", budget: "$95K" },
    { name: "Executive Reporting", description: "Cross-functional analytics layer for leadership reporting", progress: 30, status: "pending", team: ["ED", "SJ", "LP", "TA"], dueDate: "Jun 10", stage: "Discovery", budget: "$75K" },
    { name: "Customer Ops Portal", description: "Shared workspace for client requests, billing, and workflows", progress: 100, status: "completed", team: ["LP", "MC"], dueDate: "Mar 15", stage: "Launch", budget: "$130K" },
    { name: "Security Review", description: "Internal compliance and access review", progress: 55, status: "active", team: ["SJ", "MC"], dueDate: "Apr 22", stage: "Review", budget: "$60K" },
  ] as const;

  for (const project of projects) {
    await projectsService.create(project);
  }
}

async function seedTasks() {
  const tasks = [
    { title: "Finalize premium onboarding storyboard", assignee: "Emily Davis", avatar: "ED", priority: "high", dueDate: "Mar 28", tags: ["Design"], valueStream: "Growth", column: "todo" },
    { title: "Document API handshake states", assignee: "Mike Chen", avatar: "MC", priority: "medium", dueDate: "Mar 30", tags: ["Platform"], valueStream: "Product", column: "todo" },
    { title: "Map expansion signals for tier-1 accounts", assignee: "Sarah Johnson", avatar: "SJ", priority: "low", dueDate: "Apr 2", tags: ["Revenue"], valueStream: "Growth", column: "todo" },
    { title: "Refine executive dashboard hierarchy", assignee: "Lisa Park", avatar: "LP", priority: "high", dueDate: "Mar 26", tags: ["UI", "Analytics"], valueStream: "Product", column: "in-progress" },
    { title: "Automate invoice reminder draft", assignee: "Emily Davis", avatar: "ED", priority: "medium", dueDate: "Mar 29", tags: ["Finance"], valueStream: "Support", column: "in-progress" },
    { title: "Migrate account notes schema", assignee: "Mike Chen", avatar: "MC", priority: "high", dueDate: "Mar 20", tags: ["Platform"], valueStream: "Product", column: "done" },
    { title: "Review churn risk signals", assignee: "James Wilson", avatar: "JW", priority: "low", dueDate: "Mar 22", tags: ["Success"], valueStream: "Support", column: "done" },
    { title: "Prepare hiring scorecards", assignee: "Lisa Park", avatar: "LP", priority: "medium", dueDate: "Apr 4", tags: ["Hiring"], valueStream: "Product", column: "todo" },
    { title: "Audit team access permissions", assignee: "Sarah Johnson", avatar: "SJ", priority: "high", dueDate: "Apr 1", tags: ["Security"], valueStream: "Support", column: "in-progress" },
    { title: "Publish weekly pipeline summary", assignee: "Mike Chen", avatar: "MC", priority: "medium", dueDate: "Mar 31", tags: ["Sales"], valueStream: "Growth", column: "done" },
    { title: "Review onboarding survey feedback", assignee: "Emily Davis", avatar: "ED", priority: "low", dueDate: "Apr 3", tags: ["Ops"], valueStream: "Support", column: "todo" },
    { title: "Close delivery blockers", assignee: "James Wilson", avatar: "JW", priority: "high", dueDate: "Mar 27", tags: ["Delivery"], valueStream: "Product", column: "in-progress" },
  ] as const;

  for (const task of tasks) {
    await tasksService.create(task);
  }
}

async function seedTeamMembers() {
  const members = [
    { name: "Sarah Johnson", email: "sarah@crmpro.com", role: "Admin" as const, status: "active" as const, avatar: "SJ", department: "Sales", team: "Revenue Ops", designation: "Admin Lead", manager: "Executive Team", workingHours: "09:30 - 18:30", officeLocation: "HQ - Floor 3", timeZone: "Asia/Calcutta", baseSalary: 145000, allowances: 22000, deductions: 7800, paymentMode: "bank-transfer" as const, attendance: "present" as const, checkIn: "8:42 AM", location: "HQ - Floor 3", workload: 82 },
    { name: "Mike Chen", email: "mike@crmpro.com", role: "Manager" as const, status: "active" as const, avatar: "MC", department: "Engineering", team: "Platform", designation: "Engineering Manager", manager: "Director of Engineering", workingHours: "10:00 - 19:00", officeLocation: "Remote Hub", timeZone: "Asia/Calcutta", baseSalary: 128000, allowances: 18000, deductions: 6500, paymentMode: "bank-transfer" as const, attendance: "remote" as const, checkIn: "9:05 AM", location: "Remote", workload: 68 },
    { name: "Emily Davis", email: "emily@crmpro.com", role: "Employee" as const, status: "active" as const, avatar: "ED", department: "Marketing", team: "Growth", designation: "Marketing Specialist", manager: "Growth Lead", workingHours: "09:00 - 18:00", officeLocation: "HQ - Floor 2", timeZone: "Asia/Calcutta", baseSalary: 72000, allowances: 12000, deductions: 3200, paymentMode: "upi" as const, attendance: "late" as const, checkIn: "9:27 AM", location: "HQ - Floor 2", workload: 74 },
    { name: "James Wilson", email: "james@crmpro.com", role: "Manager" as const, status: "pending" as const, avatar: "JW", department: "Support", team: "Customer Care", designation: "Support Manager", manager: "Head of Support", workingHours: "09:30 - 18:30", officeLocation: "HQ - Floor 1", timeZone: "Asia/Calcutta", baseSalary: 98000, allowances: 14000, deductions: 4500, paymentMode: "bank-transfer" as const, attendance: "present" as const, checkIn: "8:58 AM", location: "HQ - Floor 1", workload: 58 },
    { name: "Lisa Park", email: "lisa@crmpro.com", role: "Employee" as const, status: "active" as const, avatar: "LP", department: "Design", team: "Creative", designation: "Product Designer", manager: "Design Lead", workingHours: "09:15 - 18:15", officeLocation: "Remote", timeZone: "Asia/Calcutta", baseSalary: 68000, allowances: 11000, deductions: 2800, paymentMode: "cash" as const, attendance: "remote" as const, checkIn: "9:11 AM", location: "Remote", workload: 61 },
    { name: "Tom Anderson", email: "tom@crmpro.com", role: "Employee" as const, status: "pending" as const, avatar: "TA", department: "Sales", team: "Outbound", designation: "Sales Associate", manager: "Sales Manager", workingHours: "09:00 - 18:00", officeLocation: "No check-in", timeZone: "Asia/Calcutta", baseSalary: 52000, allowances: 9000, deductions: 2400, paymentMode: "cash" as const, attendance: "absent" as const, checkIn: "-", location: "No check-in", workload: 39 },
    { name: "Nina Brown", email: "nina@crmpro.com", role: "Employee" as const, status: "active" as const, avatar: "NB", department: "Operations", team: "Process", designation: "Operations Specialist", manager: "Operations Lead", workingHours: "09:00 - 18:00", officeLocation: "HQ - Floor 2", timeZone: "Asia/Calcutta", baseSalary: 61000, allowances: 10000, deductions: 2600, paymentMode: "upi" as const, attendance: "present" as const, checkIn: "8:54 AM", location: "HQ - Floor 2", workload: 55 },
    { name: "Owen Clark", email: "owen@crmpro.com", role: "Employee" as const, status: "active" as const, avatar: "OC", department: "Delivery", team: "Implementation", designation: "Product Specialist", manager: "Team Manager", workingHours: "09:00 - 18:00", officeLocation: "HQ - Floor 2", timeZone: "Asia/Calcutta", baseSalary: 70000, allowances: 10500, deductions: 3000, paymentMode: "bank-transfer" as const, attendance: "present" as const, checkIn: "9:02 AM", location: "HQ - Floor 2", workload: 66 },
  ] as const;

  const teamNames = Array.from(new Set(members.map((member) => member.team.trim()).filter(Boolean)))
    .filter((name) => name.toLowerCase() !== "general");
  for (const name of teamNames) {
    await teamsService.create({ name });
  }

  for (const member of members) {
    await teamMembersService.create(member);
  }
}

async function seedInvoices() {
  const invoices = [
    { client: "Acme Corp",           amount: "$12,400", date: "2026-01-15", due: "2026-02-15", status: "completed" as const },
    { client: "GlobalTech",          amount: "$8,200",  date: "2026-01-28", due: "2026-02-28", status: "completed" as const },
    { client: "StartUp Labs",        amount: "$3,500",  date: "2026-02-10", due: "2026-03-10", status: "completed" as const },
    { client: "Digital Wave",        amount: "$6,800",  date: "2026-02-22", due: "2026-03-22", status: "completed" as const },
    { client: "CloudNine",           amount: "$15,200", date: "2026-03-05", due: "2026-04-05", status: "completed" as const },
    { client: "Summit Retail",       amount: "$9,750",  date: "2026-03-18", due: "2026-04-18", status: "active"    as const },
    { client: "Northstar Logistics", amount: "$4,900",  date: "2026-04-02", due: "2026-05-02", status: "pending"   as const },
    { client: "MetaVerse Corp",      amount: "$22,000", date: "2026-04-15", due: "2026-05-15", status: "pending"   as const },
    { client: "Acme Corp",           amount: "$18,500", date: "2026-05-08", due: "2026-06-08", status: "active"    as const },
    { client: "GlobalTech",          amount: "$11,300", date: "2026-05-20", due: "2026-06-20", status: "active"    as const },
    { client: "Digital Wave",        amount: "$7,600",  date: "2026-06-03", due: "2026-07-03", status: "pending"   as const },
    { client: "MetaVerse Corp",      amount: "$28,000", date: "2026-06-18", due: "2026-07-18", status: "pending"   as const },
  ] as const;

  for (const invoice of invoices) {
    await invoicesService.create(invoice);
  }
}

async function seedNotes() {
  const notes = [
    { title: "Acme renewal prep", content: "Confirm pricing guardrails and Q3 expansion seats before the review.", isPinned: true, color: "blue" },
    { title: "CRM v2.0 scope", content: "Keep dashboard hierarchy simple. Avoid adding more widgets to the hero.", isPinned: false, color: "slate" },
    { title: "Ops sync", content: "Attendance and approvals should remain visible from the People section.", isPinned: false, color: "green" },
    { title: "Hiring scorecards", content: "Keep interview feedback short and consistent across stages.", isPinned: false, color: "amber" },
    { title: "Support escalation", content: "Route urgent billing issues through the shared inbox first.", isPinned: true, color: "rose" },
    { title: "Workspace polish", content: "Background previews and live cards should remain clean and legible.", isPinned: false, color: "default" },
  ] as const;

  const users = await prisma.user.findMany({ select: { id: true } });
  const authorId = users[0]?.id;
  if (!authorId) return;

  for (const note of notes) {
    await notesService.create(authorId, note);
  }
}

async function seedConversations() {
  const createdConversations: Array<{ id: number }> = [];

  for (const conversation of conversationSeedRecords) {
    const created = await prisma.conversation.create({
      data: {
        name: conversation.name,
        avatar: conversation.avatar,
        lastMessage: conversation.lastMessage,
        time: conversation.time,
        unread: conversation.unread,
        online: conversation.online,
        team: conversation.team,
        updatedAt: new Date(),
      },
    });

    createdConversations.push(created);
  }

  return createdConversations;
}

async function seedMessages(conversationIds: Array<number>) {
  for (const message of messageSeedRecords) {
    await prisma.message.create({
      data: {
        conversationId: conversationIds[message.conversationId - 1] ?? conversationIds[0],
        sender: message.sender,
        text: message.text,
        time: message.time,
        isMe: message.isMe,
        updatedAt: new Date(),
      },
    });
  }
}

async function seedJobPostings() {
  const jobs = [
    { title: "Senior Full Stack Developer", department: "Engineering", location: "Remote", type: "Full-time", status: "open" as const, description: "Build and scale our core CRM platform. You'll work across the stack using React, Node.js, and TypeScript. Experience with PostgreSQL and cloud infrastructure is a plus.", salary: "$120K - $150K", experience: "5+ years", skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"], priority: "high", views: 342, deadline: "2026-05-15", updatedAt: new Date() },
    { title: "Product Manager", department: "Product", location: "San Francisco, CA", type: "Full-time", status: "open" as const, description: "Own the product roadmap for our CRM platform. Partner with engineering, design, and sales to deliver features that drive customer value and revenue growth.", salary: "$110K - $140K", experience: "3-5 years", skills: ["Product Strategy", "Roadmapping", "Agile", "Analytics", "SQL"], priority: "urgent", views: 287, deadline: "2026-04-30", updatedAt: new Date() },
    { title: "UX Designer", department: "Design", location: "Hybrid", type: "Full-time", status: "open" as const, description: "Design beautiful and intuitive user experiences for enterprise customers. You'll create wireframes, prototypes, and high-fidelity designs using Figma.", salary: "$90K - $120K", experience: "3-5 years", skills: ["Figma", "UI/UX", "Prototyping", "User Research", "Design Systems"], priority: "normal", views: 198, deadline: "2026-06-01", updatedAt: new Date() },
    { title: "Sales Development Rep", department: "Sales", location: "New York, NY", type: "Full-time", status: "open" as const, description: "Generate qualified leads and build pipeline for the enterprise sales team. You'll prospect into target accounts and qualify inbound interest.", salary: "$60K - $80K + Commission", experience: "1-3 years", skills: ["CRM", "Lead Generation", "Communication", "Sales", "Outreach"], priority: "normal", views: 456, deadline: "2026-04-20", updatedAt: new Date() },
    { title: "Customer Success Manager", department: "Support", location: "Remote", type: "Full-time", status: "open" as const, description: "Ensure customer satisfaction and retention for our strategic accounts. You'll manage onboarding, adoption, and renewal cycles.", salary: "$70K - $95K", experience: "2-4 years", skills: ["Customer Success", "Communication", "Problem Solving", "SaaS"], priority: "normal", views: 167, deadline: "2026-05-30", updatedAt: new Date() },
    { title: "DevOps Engineer", department: "Engineering", location: "Remote", type: "Full-time", status: "open" as const, description: "Build and maintain CI/CD pipelines, infrastructure as code, and monitoring systems. Experience with Docker, Kubernetes, and Terraform required.", salary: "$130K - $160K", experience: "4-6 years", skills: ["Docker", "Kubernetes", "Terraform", "AWS", "CI/CD"], priority: "high", views: 231, deadline: "2026-05-10", updatedAt: new Date() },
    { title: "Data Analyst", department: "Analytics", location: "Hybrid", type: "Full-time", status: "draft" as const, description: "Analyze customer data to uncover insights that drive product and business decisions. Build dashboards and reports for leadership.", salary: "$80K - $110K", experience: "2-4 years", skills: ["SQL", "Python", "Tableau", "Statistics", "Data Modeling"], priority: "low", views: 0, deadline: null, updatedAt: new Date() },
    { title: "Technical Writer", department: "Product", location: "Remote", type: "Contract", status: "closed" as const, description: "Create clear, concise documentation for our API and user guides. Work closely with engineering to document new features.", salary: "$50/hr", experience: "2-3 years", skills: ["Technical Writing", "API Docs", "Markdown", "Developer Experience"], priority: "normal", views: 89, deadline: null, updatedAt: new Date() },
  ] as const;

  const createdJobs: Array<{ id: number }> = [];
  for (const job of jobs) {
    const created = await prisma.jobPosting.create({ data: job });
    createdJobs.push(created);
  }
  return createdJobs;
}

async function seedCandidates(jobIds: Array<number>) {
  const candidates = [
    { name: "Alex Thompson", email: "alex.thompson@email.com", jobId: jobIds[0], stage: "interview" as const, source: "LinkedIn", phone: "+1-555-1001", rating: 4, interviewDate: new Date("2026-04-08T10:00:00Z"), interviewers: ["Sarah Johnson", "Mike Chen"], notes: "5 years React/Node experience. Strong system design skills. Culture fit looks great.", updatedAt: new Date() },
    { name: "Maria Garcia", email: "maria.garcia@email.com", jobId: jobIds[1], stage: "screening" as const, source: "Indeed", phone: "+1-555-1002", rating: 3, notes: "3 years PM experience at Series B startups. Good product sense. Need to assess technical depth.", updatedAt: new Date() },
    { name: "David Chen", email: "david.chen@email.com", jobId: jobIds[0], stage: "offer" as const, source: "Referral", phone: "+1-555-1003", rating: 5, notes: "Passed all technical rounds with flying colors. Excellent coding and system design.", updatedAt: new Date() },
    { name: "Sarah Williams", email: "sarah.williams@email.com", jobId: jobIds[2], stage: "applied" as const, source: "Website", phone: "+1-555-1004", rating: 2, notes: "Strong portfolio with B2B SaaS experience. Need to review case studies.", updatedAt: new Date() },
    { name: "James Rodriguez", email: "james.rodriguez@email.com", jobId: jobIds[3], stage: "interview" as const, source: "LinkedIn", phone: "+1-555-1005", rating: 4, interviewDate: new Date("2026-04-10T14:00:00Z"), interviewers: ["Mike Chen"], notes: "2 years SDR experience at Salesforce. Great communication skills and pipeline numbers.", updatedAt: new Date() },
    { name: "Emily Zhang", email: "emily.zhang@email.com", jobId: jobIds[0], stage: "rejected" as const, source: "Indeed", phone: "+1-555-1006", rating: 2, notes: "Not enough backend experience for senior role. May fit junior position.", updatedAt: new Date() },
    { name: "Michael Brown", email: "michael.brown@email.com", jobId: jobIds[4], stage: "screening" as const, source: "Referral", phone: "+1-555-1007", rating: 3, notes: "Customer success background at HubSpot. Good references from former manager.", updatedAt: new Date() },
    { name: "Lisa Anderson", email: "lisa.anderson@email.com", jobId: jobIds[1], stage: "hired" as const, source: "LinkedIn", phone: "+1-555-1008", rating: 5, joiningDate: "2026-04-15", offeredSalary: "$125,000", offerLetterSent: true, notes: "Accepted offer. Start date: Apr 15. Background check complete.", updatedAt: new Date() },
    { name: "Ryan Patel", email: "ryan.patel@email.com", jobId: jobIds[5], stage: "interview" as const, source: "GitHub", phone: "+1-555-1009", rating: 4, interviewDate: new Date("2026-04-12T11:00:00Z"), interviewers: ["Mike Chen", "Sarah Johnson"], notes: "Strong Kubernetes and IaC experience. Active open-source contributor.", updatedAt: new Date() },
    { name: "Nina Kowalski", email: "nina.kowalski@email.com", jobId: jobIds[0], stage: "screening" as const, source: "StackOverflow Jobs", phone: "+1-555-1010", rating: 3, notes: "Full-stack dev with 4 years experience. Resume looks promising. Schedule phone screen.", updatedAt: new Date() },
    { name: "Carlos Mendez", email: "carlos.mendez@email.com", jobId: jobIds[3], stage: "applied" as const, source: "Website", phone: "+1-555-1011", rating: 1, notes: "Entry-level candidate. Not enough experience for current opening.", updatedAt: new Date() },
    { name: "Priya Sharma", email: "priya.sharma@email.com", jobId: jobIds[4], stage: "interview" as const, source: "LinkedIn", phone: "+1-555-1012", rating: 4, interviewDate: new Date("2026-04-09T15:30:00Z"), interviewers: ["Emily Davis"], notes: "Excellent customer success track record. Managed $2M ARR book of business.", updatedAt: new Date() },
  ] as const;

  const createdCandidates: Array<{ id: number }> = [];
  for (const candidate of candidates) {
    const created = await prisma.candidate.create({ data: candidate });
    createdCandidates.push(created);
  }
  return createdCandidates;
}

async function seedCandidateActivities(candidateIds: Array<number>) {
  const activities = [
    { candidateId: candidateIds[0], action: "applied", detail: "Applied via LinkedIn", performedBy: "System" },
    { candidateId: candidateIds[0], action: "stage_change", detail: "Moved from applied to screening", performedBy: "HR" },
    { candidateId: candidateIds[0], action: "note", detail: "Resume looks strong. Schedule technical screen.", performedBy: "Sarah Johnson" },
    { candidateId: candidateIds[0], action: "stage_change", detail: "Moved from screening to interview", performedBy: "HR" },
    { candidateId: candidateIds[2], action: "applied", detail: "Referred by Mike Chen", performedBy: "System" },
    { candidateId: candidateIds[2], action: "stage_change", detail: "Moved from applied to screening", performedBy: "HR" },
    { candidateId: candidateIds[2], action: "stage_change", detail: "Moved from screening to interview", performedBy: "HR" },
    { candidateId: candidateIds[2], action: "note", detail: "Technical round 1: Excellent. Scored 95/100.", performedBy: "Mike Chen" },
    { candidateId: candidateIds[2], action: "stage_change", detail: "Moved from interview to offer", performedBy: "HR" },
    { candidateId: candidateIds[5], action: "applied", detail: "Applied via Indeed", performedBy: "System" },
    { candidateId: candidateIds[5], action: "stage_change", detail: "Moved from applied to screening", performedBy: "HR" },
    { candidateId: candidateIds[5], action: "rejected", detail: "Insufficient backend experience for senior role", performedBy: "Sarah Johnson" },
    { candidateId: candidateIds[7], action: "applied", detail: "Applied via LinkedIn", performedBy: "System" },
    { candidateId: candidateIds[7], action: "stage_change", detail: "Moved from applied to screening", performedBy: "HR" },
    { candidateId: candidateIds[7], action: "stage_change", detail: "Moved from screening to interview", performedBy: "HR" },
    { candidateId: candidateIds[7], action: "stage_change", detail: "Moved from interview to offer", performedBy: "HR" },
    { candidateId: candidateIds[7], action: "offer_letter_sent", detail: "Offer letter emailed to lisa.anderson@email.com", performedBy: "admin@crmpro.com" },
    { candidateId: candidateIds[7], action: "hired", detail: "Accepted offer. Start date: Apr 15.", performedBy: "HR" },
  ];

  for (const activity of activities) {
    await prisma.candidateActivity.create({ data: activity });
  }
}

async function seedLeadsAndDeals() {
  const leads = [
    { firstName: "John", lastName: "Doe", email: "john@example.com", company: "Innovate Inc", status: LeadStatus.new, source: LeadSource.website, score: 85, assignedTo: "admin@crmpro.com" },
    { firstName: "Jane", lastName: "Smith", email: "jane@example.com", company: "Growth Co", status: LeadStatus.qualified, source: LeadSource.referral, score: 92, assignedTo: "manager@crmpro.com" },
    { firstName: "Robert", lastName: "Brown", email: "robert@example.com", company: "Future Tech", status: LeadStatus.contacted, source: LeadSource.social, score: 70, assignedTo: "employee1@crmpro.com" },
    { firstName: "Alice", lastName: "Johnson", email: "alice@example.com", company: "Alice's Apps", status: LeadStatus.proposal, source: LeadSource.email, score: 95, assignedTo: "admin@crmpro.com" },
  ];

  for (const lead of leads) {
    await prisma.lead.create({ data: { ...lead, updatedAt: new Date() } });
  }

  const deals = [
    { title: "Enterprise License Upgrade", value: 50000, stage: DealStage.negotiation, probability: 80, assignedTo: "admin@crmpro.com", description: "Upgrading Acme Corp to Enterprise tier." },
    { title: "New Mobile App Implementation", value: 25000, stage: DealStage.proposal, probability: 60, assignedTo: "manager@crmpro.com", description: "Standard implementation for Growth Co." },
    { title: "Consulting Package", value: 10000, stage: DealStage.prospecting, probability: 20, assignedTo: "employee1@crmpro.com", description: "Consulting package for Future Tech." },
    { title: "SaaS Subscription Bundle", value: 15000, stage: DealStage.qualification, probability: 40, assignedTo: "admin@crmpro.com", description: "Bundle for Small Biz." },
    { title: "Old Won Deal", value: 5000, stage: DealStage.closed_won, probability: 100, assignedTo: "admin@crmpro.com", description: "Completed last month." },
  ];

  for (const deal of deals) {
    await prisma.deal.create({ data: { ...deal, updatedAt: new Date() } });
  }
}

async function seedPayroll() {
  const members = await prisma.teamMember.findMany();
  for (const member of members) {
    await prisma.payroll.create({
      data: {
        memberId: String(member.id),
        memberName: member.name,
        department: member.department,
        period: "2026-04",
        baseSalary: member.baseSalary,
        allowances: member.allowances,
        deductions: member.deductions,
        netPay: member.baseSalary + member.allowances - member.deductions,
        status: PayrollStatus.pending,
        paymentMode: member.paymentMode,
      },
    });

    await prisma.payroll.create({
      data: {
        memberId: String(member.id),
        memberName: member.name,
        department: member.department,
        period: "2026-03",
        baseSalary: member.baseSalary,
        allowances: member.allowances,
        deductions: member.deductions,
        netPay: member.baseSalary + member.allowances - member.deductions,
        status: PayrollStatus.paid,
        paymentMode: member.paymentMode,
        paidAt: new Date("2026-03-31T10:00:00Z"),
      },
    });
  }
}

async function seedCalendarEvents() {
  const adminUser = await prisma.user.findFirst({ where: { role: UserRole.admin } });
  if (!adminUser) return;

  const events = [
    {
      title: "Weekly Team Sync",
      date: "2026-04-06",
      startTime: "10:00",
      endTime: "11:00",
      location: "Zoom",
      notes: "Discuss weekly goals and blockers.",
      color: "primary",
      repeat: EventRepeat.weekly,
      assignmentKind: AssignmentKind.team,
      assigneeId: "Platform",
      assigneeName: "Platform",
      assigneeMeta: "Team",
      authorId: adminUser.id,
    },
    {
      title: "Monthly Strategy Review",
      date: "2026-04-01",
      startTime: "14:00",
      endTime: "16:00",
      location: "HQ - Board Room",
      notes: "Executive review of Q2 goals.",
      color: "warning",
      repeat: EventRepeat.monthly,
      assignmentKind: AssignmentKind.none,
      authorId: adminUser.id,
    },
    {
      title: "Client Onboarding: Acme Corp",
      date: "2026-04-03",
      startTime: "11:30",
      endTime: "12:30",
      location: "Google Meet",
      notes: "Finalizing implementation timeline.",
      color: "success",
      repeat: EventRepeat.none,
      assignmentKind: AssignmentKind.member,
      assigneeId: "sarah@crmpro.com",
      assigneeName: "Sarah Johnson",
      assigneeMeta: "Sales",
      authorId: adminUser.id,
    },
  ];

  for (const event of events) {
    await prisma.calendarEvent.create({ data: event });
  }
}

async function seedAuditLogs() {
  const adminUser = await prisma.user.findFirst({ where: { role: UserRole.admin } });
  const logs = [
    { userId: "system", userName: "System", action: "CREATE", entity: "Client", entityId: "1", detail: "Created Acme Corporation account" },
    { userId: "system", userName: "System", action: "CREATE", entity: "Project", entityId: "1", detail: "Started CRM Platform v2.0" },
    { userId: adminUser?.id || "admin", userName: "Sarah Johnson", action: "UPDATE", entity: "User", entityId: "admin", detail: "Updated profile information" },
  ];

  for (const log of logs) {
    await prisma.auditLog.create({ data: log });
  }
}

async function main() {
  assertNonProduction();
  await wipeExistingData();
  await seedUsers();
  await seedClients();
  await seedProjects();
  await seedTasks();
  await seedTeamMembers();
  await seedInvoices();
  await seedNotes();
  const conversations = await seedConversations();
  await seedMessages(conversations.map((conversation) => conversation.id));
  const jobs = await seedJobPostings();
  const candidates = await seedCandidates(jobs.map((job) => job.id));
  await seedCandidateActivities(candidates.map((c) => c.id));
  await seedLeadsAndDeals();
  await seedPayroll();
  await seedCalendarEvents();
  await seedAuditLogs();
  
  console.log("✅ Seed complete - All modules populated!");
  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
