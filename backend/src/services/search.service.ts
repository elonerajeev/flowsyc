import { prisma } from "../config/prisma";

type SearchResult = {
  type: "client" | "project" | "task" | "team-member" | "invoice" | "job";
  id: string | number;
  title: string;
  subtitle: string;
  url: string;
};

type SearchCategory = "client" | "project" | "task" | "team-member" | "invoice" | "job";

export const searchService = {
  async global(query: string, limit = 20, category?: string): Promise<SearchResult[]> {
    const q = query.trim();
    if (!q || q.length < 2) return [];

    const contains = { contains: q, mode: "insensitive" as const };
    const take = Math.min(limit, 50);
    const cat = category?.trim().toLowerCase() as SearchCategory | undefined;
    const validCategories: SearchCategory[] = ["client", "project", "task", "team-member", "invoice", "job"];
    const filterCategory = cat && validCategories.includes(cat) ? cat : undefined;

    // Check if query matches entity type names (plural forms)
    const entityTypeQueries: Record<string, SearchCategory> = {
      "clients": "client",
      "projects": "project",
      "tasks": "task",
      "team": "team-member",
      "members": "team-member",
      "invoices": "invoice",
      "jobs": "job",
      "hiring": "job"
    };

    const matchedEntityType = entityTypeQueries[q.toLowerCase()];
    const shouldSearch = (c: SearchCategory) => !filterCategory || filterCategory === c;

    const [clients, projects, tasks, members, invoices, jobs] = await Promise.all([
      shouldSearch("client")
        ? prisma.client.findMany({
            where: matchedEntityType === "client"
              ? { deletedAt: null } // Show all clients if searching for "clients"
              : { deletedAt: null, OR: [
                  { name: contains }, { email: contains }, { company: contains },
                  { phone: contains }, { industry: contains }, { location: contains }, { jobTitle: contains }
                ] },
            select: { id: true, name: true, company: true, email: true, industry: true },
            take,
          })
        : Promise.resolve([]),
      shouldSearch("project")
        ? prisma.project.findMany({
            where: matchedEntityType === "project"
              ? { deletedAt: null } // Show all projects if searching for "projects"
              : { deletedAt: null, OR: [
                  { name: contains }, { description: contains },
                  { team: { has: q } }
                ] },
            select: { id: true, name: true, status: true, stage: true },
            take,
          })
        : Promise.resolve([]),
      shouldSearch("task")
        ? prisma.task.findMany({
            where: matchedEntityType === "task"
              ? { deletedAt: null } // Show all tasks if searching for "tasks"
              : { deletedAt: null, OR: [
                  { title: contains }, { assignee: contains }, { valueStream: contains },
                  { tags: { has: q } }
                ] },
            select: { id: true, title: true, assignee: true, column: true, valueStream: true },
            take,
          })
        : Promise.resolve([]),
      shouldSearch("team-member")
        ? prisma.teamMember.findMany({
            where: matchedEntityType === "team-member"
              ? { deletedAt: null } // Show all team members if searching for "team" or "members"
              : { deletedAt: null, OR: [
                  { name: contains }, { email: contains }, { department: contains },
                  { designation: contains }, { team: contains }, { officeLocation: contains }
                ] },
            select: { id: true, name: true, department: true, designation: true, team: true },
            take,
          })
        : Promise.resolve([]),
      shouldSearch("invoice")
        ? prisma.invoice.findMany({
            where: matchedEntityType === "invoice"
              ? { deletedAt: null } // Show all invoices if searching for "invoices"
              : { deletedAt: null, OR: [
                  { client: contains }, { id: contains }, { amount: contains }
                ] },
            select: { id: true, client: true, amount: true, status: true },
            take,
          })
        : Promise.resolve([]),
      shouldSearch("job")
        ? prisma.jobPosting.findMany({
            where: matchedEntityType === "job"
              ? { deletedAt: null } // Show all jobs if searching for "jobs" or "hiring"
              : { deletedAt: null, OR: [
                  { title: contains }, { department: contains }, { location: contains },
                  { description: contains }, { skills: { has: q } }
                ] },
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
