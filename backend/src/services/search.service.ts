import { prisma } from "../config/prisma";
import type { AccessActor } from "../utils/access-control";

type SearchResult = {
  type: "client" | "project" | "task" | "team-member" | "invoice" | "job";
  id: string | number;
  title: string;
  subtitle: string;
  url: string;
};

type SearchCategory = "client" | "project" | "task" | "team-member" | "invoice" | "job";

export const searchService = {
  async global(query: string, access?: AccessActor, limit = 20, category?: string): Promise<SearchResult[]> {
    const q = query.trim();
    if (!q || q.length < 2) return [];

    const contains = { contains: q, mode: "insensitive" as const };
    const take = Math.min(limit, 50);
    const cat = category?.trim().toLowerCase() as SearchCategory | undefined;
    const validCategories: SearchCategory[] = ["client", "project", "task", "team-member", "invoice", "job"];
    const filterCategory = cat && validCategories.includes(cat) ? cat : undefined;

    const entityTypeQueries: Record<string, SearchCategory> = {
      "clients": "client", "projects": "project", "tasks": "task",
      "team": "team-member", "members": "team-member", "invoices": "invoice",
      "jobs": "job", "hiring": "job",
    };

    const matchedEntityType = entityTypeQueries[q.toLowerCase()];
    const shouldSearch = (c: SearchCategory) => !filterCategory || filterCategory === c;

    // Build org-scoped base filter — narrows results to the actor's organization
    const orgId = access?.organizationId;
    const actorIds = access ? [access.email, access.userId].filter(Boolean) as string[] : [];

    // For admin within an org: see all org data. For manager/employee: further restrict.
    function clientScope() {
      if (orgId) {
        if (access?.role === "admin") return { organizationId: orgId };
        if (access?.role === "manager") return { organizationId: orgId, OR: actorIds.map(id => ({ assignedTo: id })) };
        if (access?.role === "employee") return { organizationId: orgId, assignedTo: { in: actorIds } };
      }
      // Backward-compat: user-level scope when no orgId
      if (actorIds.length > 0 && (access?.role === "admin" || access?.role === "manager")) {
        return { OR: actorIds.map(id => ({ assignedTo: id })) };
      }
      return {};
    }

    function projectScope() {
      if (orgId) {
        if (access?.role === "admin") return { organizationId: orgId };
        if (access?.role === "manager") return { organizationId: orgId, createdBy: { in: actorIds } };
      }
      if (actorIds.length > 0 && (access?.role === "admin" || access?.role === "manager")) {
        return { createdBy: { in: actorIds } };
      }
      return {};
    }

    function taskScope() {
      if (orgId) {
        if (access?.role === "admin") return { organizationId: orgId };
        if (access?.role === "manager" || access?.role === "employee") {
          return { organizationId: orgId, assignee: { in: actorIds } };
        }
      }
      return {};
    }

    function memberScope() {
      return orgId ? { organizationId: orgId } : {};
    }

    function invoiceScope() {
      if (orgId) {
        if (access?.role === "admin") return { organizationId: orgId };
        if (access?.role === "manager") return { organizationId: orgId, createdBy: { in: actorIds } };
      }
      if (actorIds.length > 0 && (access?.role === "admin" || access?.role === "manager")) {
        return { createdBy: { in: actorIds } };
      }
      return {};
    }

    function jobScope() {
      return orgId ? { organizationId: orgId } : {};
    }

    const [clients, projects, tasks, members, invoices, jobs] = await Promise.all([
      shouldSearch("client")
        ? prisma.client.findMany({
            where: {
              deletedAt: null,
              ...clientScope(),
              ...(matchedEntityType !== "client" ? { OR: [
                { name: contains }, { email: contains }, { company: contains },
                { phone: contains }, { industry: contains }, { location: contains }, { jobTitle: contains },
              ] } : {}),
            },
            select: { id: true, name: true, company: true, email: true, industry: true },
            take,
          })
        : Promise.resolve([]),
      shouldSearch("project")
        ? prisma.project.findMany({
            where: {
              deletedAt: null,
              ...projectScope(),
              ...(matchedEntityType !== "project" ? { OR: [
                { name: contains }, { description: contains }, { team: { has: q } },
              ] } : {}),
            },
            select: { id: true, name: true, status: true, stage: true },
            take,
          })
        : Promise.resolve([]),
      shouldSearch("task")
        ? prisma.task.findMany({
            where: {
              deletedAt: null,
              ...taskScope(),
              ...(matchedEntityType !== "task" ? { OR: [
                { title: contains }, { assignee: contains }, { valueStream: contains }, { tags: { has: q } },
              ] } : {}),
            },
            select: { id: true, title: true, assignee: true, column: true, valueStream: true },
            take,
          })
        : Promise.resolve([]),
      shouldSearch("team-member")
        ? prisma.teamMember.findMany({
            where: {
              deletedAt: null,
              ...memberScope(),
              ...(matchedEntityType !== "team-member" ? { OR: [
                { name: contains }, { email: contains }, { department: contains },
                { designation: contains }, { team: contains }, { officeLocation: contains },
              ] } : {}),
            },
            select: { id: true, name: true, department: true, designation: true, team: true },
            take,
          })
        : Promise.resolve([]),
      shouldSearch("invoice")
        ? prisma.invoice.findMany({
            where: {
              deletedAt: null,
              ...invoiceScope(),
              ...(matchedEntityType !== "invoice" ? { OR: [
                { client: contains }, { id: contains }, { amount: contains },
              ] } : {}),
            },
            select: { id: true, client: true, amount: true, status: true },
            take,
          })
        : Promise.resolve([]),
      shouldSearch("job")
        ? prisma.jobPosting.findMany({
            where: {
              deletedAt: null,
              ...jobScope(),
              ...(matchedEntityType !== "job" ? { OR: [
                { title: contains }, { department: contains }, { location: contains },
                { description: contains }, { skills: { has: q } },
              ] } : {}),
            },
            select: { id: true, title: true, department: true, status: true, location: true },
            take,
          })
        : Promise.resolve([]),
    ]);

    const results: SearchResult[] = [
      ...clients.map((c) => ({
        type: "client" as const,
        id: c.id,
        title: c.name,
        subtitle: c.company || c.email,
        url: `/sales/clients?id=${c.id}`,
      })),
      ...projects.map((p) => ({
        type: "project" as const,
        id: p.id,
        title: p.name,
        subtitle: `Status: ${p.status}`,
        url: `/workspace/projects?id=${p.id}`,
      })),
      ...tasks.map((t) => ({
        type: "task" as const,
        id: t.id,
        title: t.title,
        subtitle: `${t.assignee} - ${t.column}`,
        url: `/workspace/tasks`,
      })),
      ...members.map((m) => ({
        type: "team-member" as const,
        id: m.id,
        title: m.name,
        subtitle: `${m.designation} - ${m.department}`,
        url: `/people/team?id=${m.id}`,
      })),
      ...invoices.map((i) => ({
        type: "invoice" as const,
        id: i.id,
        title: `Invoice ${i.id}`,
        subtitle: `${i.client} - ${i.amount}`,
        url: `/finance/invoices?id=${i.id}`,
      })),
      ...jobs.map((j) => ({
        type: "job" as const,
        id: j.id,
        title: j.title,
        subtitle: `${j.department} - ${j.status}`,
        url: `/hr/hiring?id=${j.id}`,
      })),
    ];

    return results.slice(0, limit);
  },
};
