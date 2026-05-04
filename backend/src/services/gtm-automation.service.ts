import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";

interface LeadScoringCriteria {
  field: string;
  operator: string;
  value: any;
  score: number;
}

interface HealthScoreInput {
  lastContactDate?: Date;
  emailOpenRate?: number;
  supportTickets?: number;
  paymentStatus?: string;
  engagementScore?: number;
}

import { cache, TTL } from "../utils/cache";

async function getCachedScore(leadId: number): Promise<{ score: number; breakdown: Record<string, number> } | null> {
  const cacheKey = `lead:score:${leadId}`;
  return await cache.get<{ score: number; breakdown: Record<string, number> }>(cacheKey);
}

async function setCachedScore(leadId: number, score: number, breakdown: Record<string, number>): Promise<void> {
  const cacheKey = `lead:score:${leadId}`;
  await cache.set(cacheKey, { score, breakdown }, TTL.MEDIUM);
}

export class GTMAutomationService {
  
  // ============================================
  // LEAD SCORING ENGINE
  // ============================================

  static async calculateLeadScoreFromCriteria(criteria: {
    companySize?: string;
    budget?: string;
    timeline?: string;
    source?: string;
  }): Promise<number> {
    let score = 0;
    
    if (criteria.companySize) {
      score += this.scoreCompanySize(criteria.companySize);
    }
    if (criteria.source) {
      score += this.scoreSource(criteria.source);
    }
    if (criteria.budget) {
      score += this.scoreBudget(criteria.budget);
    }
    if (criteria.timeline) {
      score += this.scoreTimeline(criteria.timeline);
    }
    
    return Math.min(100, score);
  }

  static async calculateLeadScore(leadId: number): Promise<{ score: number; breakdown: Record<string, number> }> {
    // Check cache first
    const cached = await getCachedScore(leadId);
    if (cached) return cached;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { score: 0, breakdown: {} };

    let totalScore = 0;
    const breakdown: Record<string, number> = {};

    // Company Size Score
    if (lead.companySize) {
      const sizeScore = this.scoreCompanySize(lead.companySize);
      breakdown.companySize = sizeScore;
      totalScore += sizeScore;
    }

    // Source Score
    if (lead.source) {
      const sourceScore = this.scoreSource(lead.source);
      breakdown.source = sourceScore;
      totalScore += sourceScore;
    }

    // Budget Score
    if (lead.budget) {
      const budgetScore = this.scoreBudget(lead.budget);
      breakdown.budget = budgetScore;
      totalScore += budgetScore;
    }

    // Timeline Score
    if (lead.timeline) {
      const timelineScore = this.scoreTimeline(lead.timeline);
      breakdown.timeline = timelineScore;
      totalScore += timelineScore;
    }

    // Existing score from CRM data
    breakdown.existingScore = lead.score;
    totalScore += lead.score;

    // Normalize to 0-100
    const finalScore = Math.min(100, Math.max(0, totalScore));

    // Update lead score
    await prisma.lead.update({
      where: { id: leadId },
      data: { score: finalScore }
    });

    // Cache the result
    await setCachedScore(leadId, finalScore, breakdown);

    return { score: finalScore, breakdown };
  }

  static scoreCompanySize(size: string): number {
    const scores: Record<string, number> = {
      "1-10": 5,
      "11-50": 15,
      "51-200": 25,
      "201-500": 35,
      "501-1000": 45,
      "1000+": 50
    };
    return scores[size] || 10;
  }

  static scoreSource(source: string): number {
    const scores: Record<string, number> = {
      "referral": 40,
      "partner": 35,
      "linkedin": 30,
      "inbound": 30,
      "website": 20,
      "cold_outbound": 15,
      "trade_show": 25,
      "webinar": 25,
      "content": 20,
      "paid_ads": 15
    };
    return scores[source.toLowerCase()] || 10;
  }

  static scoreBudget(budget: string): number {
    const scores: Record<string, number> = {
      "under_10k": 5,
      "10k_50k": 20,
      "50k_100k": 35,
      "100k_500k": 45,
      "500k+": 50
    };
    return scores[budget.toLowerCase()] || 10;
  }

  static scoreTimeline(timeline: string): number {
    const scores: Record<string, number> = {
      "immediate": 40,
      "1_month": 35,
      "3_months": 25,
      "6_months": 15,
      "exploring": 10
    };
    return scores[timeline.toLowerCase()] || 10;
  }

  // ============================================
  // AUTO-TAGGING BASED ON SCORE
  // ============================================

  static async autoTagLead(leadId: number): Promise<string[]> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return [];

    const tags: string[] = [];
    const score = lead.score;

    // Score-based tags
    if (score >= 80) tags.push("hot-lead", "priority");
    else if (score >= 60) tags.push("warm-lead");
    else if (score >= 40) tags.push("medium-priority");
    else tags.push("cold-lead");

    // Company size tags
    if (lead.companySize === "1000+") tags.push("enterprise");
    else if (lead.companySize === "501-1000") tags.push("mid-market");

    // Source tags
    if (lead.source === "referral") tags.push("referral");

    // Update tags (avoid duplicates)
    const existingTags = lead.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];

    await prisma.lead.update({
      where: { id: leadId },
      data: { tags: newTags }
    });

    return tags;
  }

  // ============================================
  // CLIENT HEALTH SCORE
  // ============================================

  static async calculateClientHealthScore(clientId: number): Promise<{
    score: number;
    grade: string;
    breakdown: Record<string, number>;
  }> {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return { score: 0, grade: "F", breakdown: {} };

    const breakdown: Record<string, number> = {};
    let totalScore = 0;

    // Last Contact Score (max 25 points)
    if (client.lastContactDate) {
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(client.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      breakdown.lastContact = Math.max(0, 25 - daysSinceContact * 2);
      totalScore += breakdown.lastContact;
    } else {
      breakdown.lastContact = 0;
    }

    // Email Engagement Score (max 25 points)
    const engagementScore = client.engagementScore || 50;
    breakdown.engagement = Math.round(engagementScore * 0.25);
    totalScore += breakdown.engagement;

    // Status-based score (max 25 points)
    const statusScore = client.status === "active" ? 25 : 
                       client.status === "pending" ? 10 : 0;
    breakdown.status = statusScore;
    totalScore += statusScore;

    // Tier-based score (max 25 points)
    const tierScore = client.tier === "Enterprise" ? 25 :
                      client.tier === "Strategic" ? 20 : 10;
    breakdown.tier = tierScore;
    totalScore += tierScore;

    // Determine grade
    let grade: string;
    if (totalScore >= 90) grade = "A+";
    else if (totalScore >= 80) grade = "A";
    else if (totalScore >= 70) grade = "B";
    else if (totalScore >= 60) grade = "C";
    else if (totalScore >= 40) grade = "D";
    else grade = "F";

    // Update client health score
    await prisma.client.update({
      where: { id: clientId },
      data: { 
        healthScore: Math.round(totalScore),
        healthGrade: grade
      }
    });

    return { score: Math.round(totalScore), grade, breakdown };
  }

  // ============================================
  // FOLLOW-UP REMINDERS
  // ============================================

  static async createFollowUpReminders(leadId: number, repEmail: string): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const leadName = `${lead.firstName} ${lead.lastName}`;

    // Day 1 Reminder
    await prisma.scheduledJob.create({
      data: {
        jobType: "task",
        name: `Day 1 Follow-up: ${leadName}`,
        description: `Follow up with lead from ${lead.company || "Unknown Company"}`,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
        payload: {
          type: "follow_up",
          leadId: lead.id,
          priority: "high",
          message: "First follow-up with new lead"
        },
        status: "pending",
        createdBy: "system"
      }
    });

    // Day 3 Reminder
    await prisma.scheduledJob.create({
      data: {
        jobType: "task",
        name: `Day 3 Follow-up: ${leadName}`,
        description: "Second follow-up attempt",
        scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        payload: {
          type: "follow_up",
          leadId: lead.id,
          priority: "medium",
          message: "Second follow-up - provide value"
        },
        status: "pending",
        createdBy: "system"
      }
    });

    // Day 7 Reminder
    await prisma.scheduledJob.create({
      data: {
        jobType: "task",
        name: `Day 7 Check-in: ${leadName}`,
        description: "Week follow-up and engagement check",
        scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        payload: {
          type: "follow_up",
          leadId: lead.id,
          priority: "low",
          message: "Weekly check-in"
        },
        status: "pending",
        createdBy: "system"
      }
    });

    logger.info(`Created follow-up reminders for lead ${leadId}`);
  }

  // ============================================
  // DEAL STALE ALERTS
  // ============================================

  static async checkStaleDeals(): Promise<number> {
    const staleDays = 7;
    const cutoffDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

    const staleDeals = await prisma.deal.findMany({
      where: {
        updatedAt: { lt: cutoffDate },
        stage: { notIn: ["closed_won", "closed_lost"] }
      }
    });

    for (const deal of staleDeals) {
      // Deduplicate: skip if unresolved alert already exists
      const existingAlert = await prisma.alert.findFirst({
        where: { entityType: "Deal", entityId: deal.id, type: "stale_deal", isResolved: false }
      });
      if (existingAlert) continue;

      await prisma.alert.create({
        data: {
          type: "stale_deal",
          severity: "warning",
          title: `Stale Deal Alert: ${deal.title}`,
          message: `Deal "${deal.title}" has had no activity for ${staleDays} days. Consider following up or closing.`,
          entityType: "Deal",
          entityId: deal.id
        }
      });

      // Create task for assigned rep
      if (deal.assignedTo) {
        await prisma.task.create({
          data: {
            title: `Follow up on stale deal: ${deal.title}`,
            assignee: deal.assignedTo,
            priority: "medium",
            column: "todo",
            dueDate: new Date().toISOString().slice(0, 10),
            valueStream: "",
            avatar: "SD",
            updatedAt: new Date()
          }
        });
      }

      logger.info(`Created stale deal alert for deal ${deal.id}`);
    }

    return staleDeals.length;
  }

  // ============================================
  // SMART LEAD ASSIGNMENT
  // ============================================

  static async assignLeadToBestRep(leadId: number): Promise<{ assigned: boolean; repEmail?: string; reason?: string }> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { assigned: false, reason: "Lead not found" };

    // Get all active team members
    const reps = await prisma.teamMember.findMany({
      where: { 
        deletedAt: null,
        status: "active"
      }
    });

    if (reps.length === 0) {
      // Fallback: assign to first admin/manager user
      const adminUser = await prisma.user.findFirst({ where: { role: "admin" } });
      if (adminUser) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { assignedTo: adminUser.email }
        });
        return { assigned: true, repEmail: adminUser.email, reason: "Fallback to admin" };
      }
      return { assigned: false, reason: "No reps available" };
    }

    // Score-based assignment - find least loaded rep
    // Use single batched query to prevent N+1 problem
    const [leadCounts, dealAggregates] = await Promise.all([
      prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { assignedTo: { in: reps.map(r => r.email) }, deletedAt: null },
        _count: true
      }),
      prisma.deal.groupBy({
        by: ['assignedTo'],
        where: { assignedTo: { in: reps.map(r => r.email) }, stage: { notIn: ["closed_won", "closed_lost"] } },
        _sum: { value: true }
      })
    ]);

    const leadCountMap = new Map(leadCounts.map(lc => [lc.assignedTo, lc._count]));
    const dealValueMap = new Map(dealAggregates.map(da => [da.assignedTo, da._sum.value || 0]));

    const repWorkloads = reps.map(rep => {
      const leadCount = leadCountMap.get(rep.email) || 0;
      const pipelineValue = dealValueMap.get(rep.email) || 0;
      return {
        rep,
        leadCount,
        pipelineValue,
        workload: leadCount + pipelineValue / 10000
      };
    });

    // Sort by workload (lowest first)
    repWorkloads.sort((a, b) => a.workload - b.workload);

    // Assign to least loaded rep
    const bestRep = repWorkloads[0];
    
    await prisma.lead.update({
      where: { id: leadId },
      data: { 
        assignedTo: bestRep.rep.email,
        assignedAt: new Date()
      }
    });

    // Update tags
    await prisma.lead.update({
      where: { id: leadId },
      data: { tags: [...(lead.tags || []), "auto-assigned"] }
    });

    logger.info(`Assigned lead ${leadId} to ${bestRep.rep.email}`);

    return { 
      assigned: true, 
      repEmail: bestRep.rep.email, 
      reason: `Lowest workload (${bestRep.leadCount} leads)` 
    };
  }

  // ============================================
  // COLD LEAD RE-ENGAGEMENT
  // ============================================

  static async identifyColdLeads(daysThreshold: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

    const coldLeads = await prisma.lead.findMany({
      where: {
        updatedAt: { lt: cutoffDate },
        tags: { has: "cold-lead" }
      }
    });

    for (const lead of coldLeads) {
      // Create re-engagement task
      await prisma.task.create({
        data: {
          title: `Re-engage cold lead: ${lead.firstName} ${lead.lastName}`,
          assignee: lead.assignedTo || "unassigned",
          priority: "low",
          column: "todo",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          valueStream: "re-engagement",
          avatar: "RL",
          updatedAt: new Date()
        }
      });

      // Update tag
      await prisma.lead.update({
        where: { id: lead.id },
        data: { tags: [...(lead.tags || []).filter(t => t !== "cold-lead"), "needs-re-engagement"] }
      });
    }

    return coldLeads.length;
  }

  // ============================================
  // CHURN RISK ALERTS
  // ============================================

  static async checkChurnRisk(): Promise<number> {
    // Find clients with health score below 50
    const atRiskClients = await prisma.client.findMany({
      where: {
        healthScore: { lt: 50 },
        status: "active"
      }
    });

    for (const client of atRiskClients) {
      // Check if alert already exists
      const existingAlert = await prisma.alert.findFirst({
        where: {
          entityType: "Client",
          entityId: client.id,
          type: "churn_risk",
          isResolved: false
        }
      });

      if (!existingAlert) {
        await prisma.alert.create({
          data: {
            type: "churn_risk",
            severity: client.healthScore < 30 ? "critical" : "warning",
            title: `Churn Risk: ${client.name}`,
            message: `Client ${client.name} has health score of ${client.healthScore}%. Immediate attention required.`,
            entityType: "Client",
            entityId: client.id
          }
        });
      }
    }

    return atRiskClients.length;
  }

  // ============================================
  // RENEWAL REMINDERS
  // ============================================

  static async createRenewalReminders(): Promise<number> {
    // For Enterprise clients, create renewal reminders
    const highValueClients = await prisma.client.findMany({
      where: {
        tier: "Enterprise",
        status: "active"
      }
    });

    for (const client of highValueClients) {
      // Create 90, 60, 30 day reminders
      const reminders = [
        { days: 90, priority: "low" },
        { days: 60, priority: "medium" },
        { days: 30, priority: "high" }
      ];

      for (const reminder of reminders) {
        const reminderDate = new Date(Date.now() + reminder.days * 24 * 60 * 60 * 1000);
        
        await prisma.scheduledJob.create({
          data: {
            jobType: "task",
            name: `${reminder.days}-Day Renewal Reminder: ${client.name}`,
            description: `Prepare renewal discussion with ${client.name}`,
            scheduledFor: reminderDate,
            payload: {
              type: "renewal",
              clientId: client.id,
              priority: reminder.priority
            },
            status: "pending",
            createdBy: "system"
          }
        });
      }
    }

    return highValueClients.length;
  }
}
