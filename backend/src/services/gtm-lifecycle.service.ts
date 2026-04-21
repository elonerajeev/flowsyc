import { prisma } from "../config/prisma";
import { GTMAutomationService } from "./gtm-automation.service";
import { cache, TTL } from "../utils/cache";
import { logger } from "../utils/logger";

type LifecycleSummary = {
  leadId: number;
  contactId?: number;
  dealId?: number;
  clientId?: number;
  tasksCreated: number;
  remindersCreated: number;
  notes: string[];
};

async function logLifecycleToAutomationLog(
  leadId: number,
  summary: LifecycleSummary,
  performedBy?: string
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  const actions: any[] = [];
  
  if (summary.contactId) {
    actions.push({ type: "contact_created", status: "success", details: { contactId: summary.contactId } });
  }
  if (summary.dealId) {
    actions.push({ type: "deal_created", status: "success", details: { dealId: summary.dealId } });
  }
  if (summary.clientId) {
    actions.push({ type: "client_created", status: "success", details: { clientId: summary.clientId } });
  }
  if (summary.tasksCreated > 0) {
    actions.push({ type: "tasks_created", status: "success", details: { count: summary.tasksCreated } });
  }
  if (summary.remindersCreated > 0) {
    actions.push({ type: "reminders_created", status: "success", details: { count: summary.remindersCreated } });
  }

  await prisma.automationLog.create({
    data: {
      ruleId: 0,
      trigger: "lead_updated",
      triggerData: {
        leadId,
        leadName: `${lead.firstName} ${lead.lastName}`,
        status: lead.status,
        performedBy,
      },
      actionData: actions,
      status: "completed",
      entityType: "Lead",
      entityId: leadId,
      completedAt: new Date(),
    },
  });
}

const FOLLOWUP_TAG = "gtm-followup";
const AUTO_TAG = "gtm-auto";

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function leadTag(leadId: number) {
  return `lead:${leadId}`;
}

function contactTag(contactId: number) {
  return `contact:${contactId}`;
}

function clientTag(clientId: number) {
  return `client:${clientId}`;
}

function parseEntityId(tags: string[] | null | undefined, prefix: string) {
  const match = (tags ?? []).find((tag) => tag.startsWith(`${prefix}:`));
  if (!match) return undefined;
  const value = Number(match.split(":")[1]);
  return Number.isInteger(value) ? value : undefined;
}

function toDealStage(status: string) {
  switch (status) {
    case "qualified":
      return "qualification" as const;
    case "proposal":
      return "proposal" as const;
    case "negotiation":
      return "negotiation" as const;
    case "closed_won":
      return "closed_won" as const;
    case "closed_lost":
      return "closed_lost" as const;
    case "contacted":
    case "new":
    default:
      return "prospecting" as const;
  }
}

function toLeadStatus(stage: string) {
  switch (stage) {
    case "qualification":
      return "qualified" as const;
    case "proposal":
      return "proposal" as const;
    case "negotiation":
      return "negotiation" as const;
    case "closed_won":
      return "closed_won" as const;
    case "closed_lost":
      return "closed_lost" as const;
    case "prospecting":
    default:
      return "contacted" as const;
  }
}

function probabilityForStage(stage: string) {
  switch (stage) {
    case "prospecting":
      return 20;
    case "qualification":
      return 40;
    case "proposal":
      return 65;
    case "negotiation":
      return 80;
    case "closed_won":
      return 100;
    case "closed_lost":
      return 0;
    default:
      return 50;
  }
}

function nextFollowupDate(days = 2) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function logActivity(input: {
  action: string;
  entityType: string;
  entityId: number;
  description: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.activityLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      performedBy: input.performedBy,
      metadata: (input.metadata ?? {}) as any,
      isVisible: true,
    },
  });
}

async function ensureContactFromLead(lead: {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  company: string;
  convertedToClientId: number | null;
}) {
  const existing = await prisma.contact.findUnique({
    where: { email: lead.email },
  });

  if (existing) {
    const restored = await prisma.contact.update({
      where: { id: existing.id },
      data: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        jobTitle: lead.jobTitle,
        clientId: lead.convertedToClientId ?? existing.clientId,
        leadId: lead.id, // Track the original lead
        deletedAt: null,
      },
    });
    return restored;
  }

  return prisma.contact.create({
    data: {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      jobTitle: lead.jobTitle,
      department: "Sales",
      clientId: lead.convertedToClientId ?? undefined,
      leadId: lead.id, // Track the original lead
    },
  });
}

async function ensureDealFromLead(lead: {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  status: string;
  assignedTo: string | null;
  score: number;
  tags: string[];
}, contactId?: number, clientId?: number) {
  const existing = await prisma.deal.findFirst({
    where: {
      deletedAt: null,
      tags: { has: leadTag(lead.id) },
    },
    orderBy: { createdAt: "desc" },
  });

  const stage = toDealStage(lead.status);
  const tags = [
    ...new Set(
      [
        ...(existing?.tags ?? []),
        ...lead.tags,
        AUTO_TAG,
        leadTag(lead.id),
        contactId ? contactTag(contactId) : undefined,
        clientId ? clientTag(clientId) : undefined,
      ].filter(Boolean) as string[],
    ),
  ];

  if (existing) {
    return prisma.deal.update({
      where: { id: existing.id },
      data: {
        title: `${lead.company || fullName(lead.firstName, lead.lastName)} Opportunity`,
        stage,
        probability: probabilityForStage(stage),
        assignedTo: lead.assignedTo ?? existing.assignedTo,
        tags,
      },
    });
  }

  return prisma.deal.create({
    data: {
      title: `${lead.company || fullName(lead.firstName, lead.lastName)} Opportunity`,
      value: 0,
      currency: "USD",
      stage,
      probability: Math.max(probabilityForStage(stage), Math.min(95, lead.score)),
      assignedTo: lead.assignedTo ?? "unassigned",
      expectedClose: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      tags,
      description: `Auto-created from lead ${fullName(lead.firstName, lead.lastName)}.`,
    },
  });
}

async function ensureClientFromLead(lead: {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string;
  jobTitle: string | null;
  source: string;
  assignedTo: string | null;
  convertedToClientId: number | null;
}) {
  const existingById = lead.convertedToClientId
    ? await prisma.client.findUnique({ where: { id: lead.convertedToClientId } })
    : null;

  if (existingById) {
    return existingById;
  }

  const existing = await prisma.client.findUnique({
    where: { email: lead.email },
  });

  if (existing) {
    return prisma.client.update({
      where: { id: existing.id },
      data: {
        name: fullName(lead.firstName, lead.lastName),
        company: lead.company,
        phone: lead.phone ?? existing.phone,
        jobTitle: lead.jobTitle ?? existing.jobTitle,
        source: lead.source,
        assignedTo: lead.assignedTo ?? existing.assignedTo,
        status: "active",
        nextAction: "Customer kickoff and onboarding",
      },
    });
  }

  return prisma.client.create({
    data: {
      name: fullName(lead.firstName, lead.lastName),
      email: lead.email,
      phone: lead.phone ?? "",
      company: lead.company,
      jobTitle: lead.jobTitle,
      source: lead.source,
      assignedTo: lead.assignedTo,
      manager: lead.assignedTo ?? "Unassigned",
      avatar: `${lead.firstName[0] ?? "C"}${lead.lastName[0] ?? ""}`.toUpperCase(),
      status: "active",
      nextAction: "Customer kickoff and onboarding",
      segment: "new_business",
      tier: "Growth",
      revenue: "$0",
      location: "Unknown",
      industry: "General",
      healthScore: 75,
      updatedAt: new Date(),
    },
  });
}

async function ensureLeadFollowupTask(lead: {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  assignedTo: string | null;
  status: string;
}, dealId?: number) {
  if (!lead.assignedTo) return false;

  const existing = await prisma.task.findFirst({
    where: {
      column: { not: "done" },
      assignee: lead.assignedTo,
      tags: { has: leadTag(lead.id) },
    },
    orderBy: { createdAt: "desc" },
  });

  const title = `Follow up: ${lead.company || fullName(lead.firstName, lead.lastName)}`;
  const tags = [
    FOLLOWUP_TAG,
    AUTO_TAG,
    leadTag(lead.id),
    dealId ? `deal:${dealId}` : undefined,
    `status:${lead.status}`,
  ].filter(Boolean) as string[];

  if (existing) {
    await prisma.task.update({
      where: { id: existing.id },
      data: {
        title,
        dueDate: nextFollowupDate(2),
        tags: [...new Set([...(existing.tags ?? []), ...tags])],
      },
    });
    return false;
  }

  await prisma.task.create({
    data: {
      title,
      assignee: lead.assignedTo,
      avatar: "FU",
      priority: lead.status === "negotiation" ? "high" : "medium",
      dueDate: nextFollowupDate(2),
      tags,
      valueStream: "sales",
      column: "todo",
      updatedAt: new Date(),
    },
  });
  return true;
}

async function ensureLeadReminder(lead: {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  assignedTo: string | null;
  status: string;
}, dealId?: number) {
  const existing = await prisma.scheduledJob.findFirst({
    where: {
      status: "pending",
      entityType: "Lead",
      entityId: lead.id,
      jobType: "reminder",
    },
    orderBy: { scheduledFor: "asc" },
  });

  if (existing) return false;

  await prisma.scheduledJob.create({
    data: {
      jobType: "reminder",
      name: `Lead follow-up reminder: ${lead.company || fullName(lead.firstName, lead.lastName)}`,
      description: `Automatic reminder for ${lead.status} lead follow-up.`,
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
      payload: {
        type: "followup_reminder",
        leadId: lead.id,
        dealId,
        status: lead.status,
      },
      status: "pending",
      entityType: "Lead",
      entityId: lead.id,
      createdBy: lead.assignedTo ?? "system",
    },
  });

  return true;
}

async function closePendingLeadReminders(leadId: number) {
  await prisma.scheduledJob.updateMany({
    where: {
      entityType: "Lead",
      entityId: leadId,
      status: "pending",
    },
    data: {
      status: "cancelled",
      updatedAt: new Date(),
    },
  });
}

export const gtmLifecycleService = {
  async syncLeadLifecycle(leadId: number, performedBy?: string): Promise<LifecycleSummary> {
    logger.debug(`[Lifecycle Sync] Starting sync for lead ${leadId}`);
    
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.deletedAt) {
      logger.debug(`[Lifecycle Sync] Lead ${leadId} not found or deleted`);
      throw new Error("Lead not found");
    }

    logger.debug(`[Lifecycle Sync] Lead ${leadId} status: ${lead.status}, name: ${lead.firstName} ${lead.lastName}`);

    const summary: LifecycleSummary = {
      leadId,
      tasksCreated: 0,
      remindersCreated: 0,
      notes: [],
    };

    const shouldBridgeToContact = ["contacted", "qualified", "proposal", "negotiation", "closed_won"].includes(lead.status);
    logger.debug(`[Lifecycle Sync] shouldBridgeToContact: ${shouldBridgeToContact}`);
    
    let contactId: number | undefined;
    if (shouldBridgeToContact) {
      logger.debug(`[Lifecycle Sync] Creating/linking contact for lead ${leadId}`);
      try {
        const contact = await ensureContactFromLead(lead);
        summary.contactId = contact.id;
        contactId = contact.id;
        summary.notes.push("contact_synced");
        logger.debug(`[Lifecycle Sync] Contact ${contact.id} created/linked for lead ${leadId}`);
      } catch (err) {
        logger.error(`[Lifecycle Sync] Failed to create contact for lead ${leadId}:`, err);
      }
    }

    const shouldCreateDeal = ["qualified", "proposal", "negotiation", "closed_won", "closed_lost"].includes(lead.status);
    logger.debug(`[Lifecycle Sync] shouldCreateDeal: ${shouldCreateDeal}`);
    
    let dealId: number | undefined;
    if (shouldCreateDeal) {
      logger.debug(`[Lifecycle Sync] Creating/linking deal for lead ${leadId}`);
      try {
        const deal = await ensureDealFromLead(lead, contactId, lead.convertedToClientId ?? undefined);
        summary.dealId = deal.id;
        dealId = deal.id;
        summary.notes.push("deal_synced");
        logger.debug(`[Lifecycle Sync] Deal ${deal.id} created/linked for lead ${leadId}`);
      } catch (err) {
        logger.error(`[Lifecycle Sync] Failed to create deal for lead ${leadId}:`, err);
      }
    }

    if (["new", "contacted", "qualified", "proposal", "negotiation"].includes(lead.status)) {
      const taskCreated = await ensureLeadFollowupTask(lead, dealId);
      const reminderCreated = await ensureLeadReminder(lead, dealId);
      summary.tasksCreated += taskCreated ? 1 : 0;
      summary.remindersCreated += reminderCreated ? 1 : 0;
      if (taskCreated) summary.notes.push("followup_task_created");
      if (reminderCreated) summary.notes.push("followup_reminder_created");
    }

    if (lead.status === "closed_won") {
      logger.debug(`[Lifecycle Sync] Lead ${leadId} won - creating client`);
      try {
        const client = await ensureClientFromLead(lead);
        summary.clientId = client.id;
        logger.debug(`[Lifecycle Sync] Client ${client.id} created for lead ${leadId}`);

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            convertedAt: lead.convertedAt ?? new Date(),
            convertedToClientId: client.id,
            tags: [...new Set([...(lead.tags ?? []), AUTO_TAG, "converted-client"])],
          },
        });

        if (contactId) {
          await prisma.contact.update({
            where: { id: contactId },
            data: { clientId: client.id },
          });
        }

        if (dealId) {
          const deal = await prisma.deal.findUnique({ where: { id: dealId } });
          if (deal) {
            await prisma.deal.update({
              where: { id: dealId },
              data: {
                stage: "closed_won",
                probability: 100,
                tags: [...new Set([...(deal.tags ?? []), clientTag(client.id)])],
              },
            });
          }
        }

        await closePendingLeadReminders(lead.id);
        summary.notes.push("client_converted");
      } catch (err) {
        logger.error(`[Lifecycle Sync] Failed to create client for lead ${leadId}:`, err);
      }
    }

    if (lead.status === "closed_lost" && dealId) {
      await prisma.deal.update({
        where: { id: dealId },
        data: {
          stage: "closed_lost",
          probability: 0,
        },
      });
      await closePendingLeadReminders(lead.id);
      summary.notes.push("deal_closed_lost");
    }

    await logActivity({
      action: "gtm_sync",
      entityType: "Lead",
      entityId: lead.id,
      description: `GTM lifecycle sync completed for ${fullName(lead.firstName, lead.lastName)}.`,
      performedBy,
      metadata: summary,
    });

    await logLifecycleToAutomationLog(leadId, summary, performedBy);

    // Invalidate GTM overview cache so next request reflects changes
    cache.invalidatePattern("gtm:overview:");
    return summary;
  },

  async syncDealLifecycle(dealId: number, performedBy?: string) {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.deletedAt) {
      throw new Error("Deal not found");
    }

    const linkedLeadId = parseEntityId(deal.tags, "lead");
    let clientId = parseEntityId(deal.tags, "client");
    const summary: Record<string, unknown> = { dealId, linkedLeadId, clientId };

    if (linkedLeadId) {
      const lead = await prisma.lead.findUnique({ where: { id: linkedLeadId } });
      if (lead && lead.status !== toLeadStatus(deal.stage)) {
        await prisma.lead.update({
          where: { id: linkedLeadId },
          data: { status: toLeadStatus(deal.stage) },
        });
      }

      const synced = await this.syncLeadLifecycle(linkedLeadId, performedBy);
      clientId = synced.clientId ?? clientId;
      summary.syncedLead = synced;
    }

    if (deal.stage !== "closed_won" && deal.stage !== "closed_lost" && deal.assignedTo) {
      const existingTask = await prisma.task.findFirst({
        where: {
          column: { not: "done" },
          tags: { has: `deal:${deal.id}` },
        },
      });

      if (!existingTask) {
        await prisma.task.create({
          data: {
            title: `Advance deal: ${deal.title}`,
            assignee: deal.assignedTo,
            avatar: "DL",
            priority: deal.stage === "negotiation" ? "high" : "medium",
            dueDate: nextFollowupDate(1),
            tags: [AUTO_TAG, `deal:${deal.id}`, `stage:${deal.stage}`],
            valueStream: "sales",
            column: "todo",
            updatedAt: new Date(),
          },
        });
        summary.nextStepTaskCreated = true;
      }
    }

    await logActivity({
      action: "gtm_sync",
      entityType: "Deal",
      entityId: deal.id,
      description: `Pipeline automation synced for ${deal.title}.`,
      performedBy,
      metadata: summary,
    });

    return summary;
  },

  async getOverview(access?: AccessScope) {
    const CACHE_KEY = `gtm:overview:${access?.email || "public"}`;
    // Use object to avoid circular ReturnType<typeof this.getOverview> reference
    const cached = cache.get<object>(CACHE_KEY);
    if (cached) return cached;

    // Build user-specific filters
    const leadWhere = { deletedAt: null };
    const dealWhere = { deletedAt: null };
    const clientWhere = { deletedAt: null };
    const contactWhere = { deletedAt: null };

    if (access?.role === "admin" || access?.role === "manager") {
      // Filter leads: user's created or assigned
      (leadWhere as any).OR = [
        { createdBy: access.email },
        { assignedTo: access.email },
        { assignedTo: access.userId ?? "" },
      ];

      // Filter deals: user's assigned
      (dealWhere as any).OR = [
        { assignedTo: access.email },
        { assignedTo: access.userId ?? "" },
      ];

      // Filter clients: user's assigned
      (clientWhere as any).OR = [
        { assignedTo: access.email },
        { assignedTo: access.userId ?? "" },
      ];

      // Filter contacts: from user's leads or assigned clients
      const userLeads = await prisma.lead.findMany({
        where: (leadWhere as any),
        select: { email: true },
      });
      const leadEmails = userLeads.map(l => l.email);
      const assignedClients = await prisma.client.findMany({
        where: (clientWhere as any),
        select: { id: true },
      });
      const assignedClientIds = assignedClients.map(c => c.id);
      (contactWhere as any).OR = [
        { email: { in: leadEmails } },
        { clientId: { in: assignedClientIds } },
      ];
    }

    if (access?.role === "employee") {
      // Filter leads: user's assigned
      (leadWhere as any).assignedTo = { in: [access.email, access.userId ?? ""] };

      // Filter deals: user's assigned
      (dealWhere as any).assignedTo = { in: [access.email, access.userId ?? ""] };

      // Filter clients: user's assigned
      (clientWhere as any).assignedTo = { in: [access.email, access.userId ?? ""] };

      // Filter contacts: from user's assigned clients
      const assignedClients = await prisma.client.findMany({
        where: (clientWhere as any),
        select: { id: true },
      });
      const assignedClientIds = assignedClients.map(c => c.id);
      (contactWhere as any).OR = [
        { clientId: { in: assignedClientIds } },
        { clientId: null },
      ];
    }

    const [leads, deals, clients, contacts, pendingTasks, pendingJobs, recentLogs, recentActivities, alerts] = await Promise.all([
      prisma.lead.findMany({ where: leadWhere, orderBy: { updatedAt: "desc" }, take: 500 }),
      prisma.deal.findMany({ where: dealWhere, orderBy: { updatedAt: "desc" }, take: 200 }),
      prisma.client.findMany({ where: clientWhere, orderBy: { updatedAt: "desc" }, take: 200 }),
      prisma.contact.findMany({ where: contactWhere, orderBy: { updatedAt: "desc" }, take: 200 }),
      prisma.task.findMany({
        where: {
          column: { not: "done" },
          ...(access?.role === "admin" || access?.role === "manager" ? {
            OR: [
              { tags: { has: FOLLOWUP_TAG }, assignee: access.email },
              { tags: { has: FOLLOWUP_TAG }, assignee: access.userId ?? "" },
              { valueStream: "sales", assignee: access.email },
              { valueStream: "sales", assignee: access.userId ?? "" },
            ],
          } : access?.role === "employee" ? {
            OR: [
              { tags: { has: FOLLOWUP_TAG }, assignee: { in: [access.email, access.userId ?? ""] } },
              { valueStream: "sales", assignee: { in: [access.email, access.userId ?? ""] } },
            ],
          } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      prisma.scheduledJob.findMany({
        where: { status: "pending" },
        orderBy: { scheduledFor: "asc" },
        take: 12,
      }),
      prisma.automationLog.findMany({
        orderBy: { startedAt: "desc" },
        include: { rule: { select: { name: true } } },
        take: 10,
      }),
      prisma.activityLog.findMany({
        where: { isVisible: true, entityType: { in: ["Lead", "Deal", "Client", "Contact"] } },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.alert.findMany({
        where: { 
          isResolved: false, 
          entityType: { in: ["Lead", "Deal", "Client"] },
          ...(access?.role === "employee" ? {} : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);

    const leadStatusCounts = leads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.status] = (acc[lead.status] ?? 0) + 1;
      return acc;
    }, {});
    const dealStageCounts = deals.reduce<Record<string, number>>((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] ?? 0) + 1;
      return acc;
    }, {});

    const orphanContacts = contacts.filter((contact) => !contact.clientId);
    const leadsWithoutDeals = leads.filter((lead) => ["qualified", "proposal", "negotiation", "closed_won"].includes(lead.status))
      .filter((lead) => !deals.some((deal) => (deal.tags ?? []).includes(leadTag(lead.id))));
    const wonLeadsPendingConversion = leads.filter((lead) => lead.status === "closed_won" && !lead.convertedToClientId);
    const staleDeals = deals.filter((deal) => !["closed_won", "closed_lost"].includes(deal.stage))
      .filter((deal) => Date.now() - deal.updatedAt.getTime() > 7 * 24 * 60 * 60 * 1000);
    const churnRiskClients = clients.filter((client) => client.healthScore < 60);
    const hotLeads = [...leads]
      .filter((l) => !["closed_lost", "closed_won"].includes(l.status))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((lead) => ({
        id: lead.id,
        name: fullName(lead.firstName, lead.lastName),
        company: lead.company,
        score: lead.score,
        status: lead.status,
        assignedTo: lead.assignedTo,
      }));

    const nextActions = [
      ...pendingTasks.slice(0, 5).map((task) => ({
        type: "task",
        title: task.title,
        owner: task.assignee,
        dueDate: task.dueDate,
        entityType: "Task",
        entityId: task.id,
      })),
      ...wonLeadsPendingConversion.slice(0, 3).map((lead) => ({
        type: "conversion",
        title: `Convert won lead ${fullName(lead.firstName, lead.lastName)} to client`,
        owner: lead.assignedTo ?? "unassigned",
        dueDate: lead.updatedAt.toISOString(),
        entityType: "Lead",
        entityId: lead.id,
      })),
      ...churnRiskClients.slice(0, 3).map((client) => ({
        type: "client_risk",
        title: `${client.name} needs recovery plan`,
        owner: client.assignedTo ?? client.manager,
        dueDate: client.updatedAt.toISOString(),
        entityType: "Client",
        entityId: client.id,
      })),
    ].slice(0, 10);

    const pipelineValue = deals
      .filter((d) => !["closed_won", "closed_lost"].includes(d.stage))
      .reduce((sum, d) => sum + (d.value ?? 0), 0);

    const result = {
      summary: {
        totalLeads: leads.length,
        totalContacts: contacts.length,
        totalClients: clients.length,
        totalDeals: deals.length,
        pendingFollowups: pendingTasks.length,
        pendingAutomations: pendingJobs.length,
        churnRiskClients: churnRiskClients.length,
        staleDeals: staleDeals.length,
        pipelineValue,
      },
      funnels: {
        leads: leadStatusCounts,
        deals: dealStageCounts,
      },
      leakage: {
        orphanContacts: orphanContacts.length,
        leadsWithoutDeals: leadsWithoutDeals.length,
        wonLeadsPendingConversion: wonLeadsPendingConversion.length,
      },
      hotLeads,
      workQueues: {
        pendingTasks: pendingTasks.map((task) => ({
          id: task.id,
          title: task.title,
          assignee: task.assignee,
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : new Date().toISOString(),
          tags: task.tags,
        })),
        scheduled: pendingJobs.map((job) => ({
          id: job.id,
          name: job.name,
          jobType: job.jobType,
          status: job.status,
          scheduledFor: job.scheduledFor.toISOString(),
          entityType: job.entityType,
          entityId: job.entityId,
        })),
        churnRiskClients: churnRiskClients.slice(0, 8).map((client) => ({
          id: client.id,
          name: client.name,
          healthScore: client.healthScore,
          nextAction: client.nextAction,
          owner: client.assignedTo ?? client.manager,
        })),
        staleDeals: staleDeals.slice(0, 8).map((deal) => ({
          id: deal.id,
          title: deal.title,
          stage: deal.stage,
          assignedTo: deal.assignedTo,
          updatedAt: deal.updatedAt.toISOString(),
        })),
        orphanContacts: orphanContacts.slice(0, 8).map((contact) => ({
          id: contact.id,
          name: fullName(contact.firstName, contact.lastName),
          email: contact.email,
          jobTitle: contact.jobTitle,
        })),
      },
      recentAutomation: recentLogs,
      recentActivities,
      alerts: alerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        entityType: alert.entityType,
        entityId: alert.entityId,
        createdAt: alert.createdAt,
      })),
      nextActions,
    };

    cache.set(CACHE_KEY, result, TTL.GTM_OVERVIEW);
    return result;

  },
};
