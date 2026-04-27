import type { CompanyRecord, CompanySize, ContactRecord, SalesMetrics } from "../data/crm-static";
import { commandActions, themePreviews } from "../data/crm-static";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { cache, TTL } from "../utils/cache";
import type { AccessScope } from "../utils/access-control";

// Sales portfolio views are derived from live CRM records already present in the database.

function parseCurrencyAmount(value: string | null | undefined) {
  if (!value) return 0;
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function toCompanyId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "company";
}

function toCompanySize(contactCount: number, value: number): CompanySize {
  if (contactCount >= 50 || value >= 1_000_000) return "enterprise";
  if (contactCount >= 20 || value >= 250_000) return "large";
  if (contactCount >= 10 || value >= 100_000) return "medium";
  if (contactCount >= 4 || value >= 25_000) return "small";
  return "startup";
}

function deriveCompanyStatus(statuses: string[]): CompanyRecord["status"] {
  if (statuses.includes("active")) return "active";
  if (statuses.includes("pending")) return "prospect";
  return "inactive";
}

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "Unknown", lastName: "" };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
  };
}

export const staticCrmService = {
  async listCompanies() {
    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        company: true,
        industry: true,
        phone: true,
        email: true,
        jobTitle: true,
        revenue: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const companies = new Map<string, CompanyRecord>();

    for (const client of clients) {
      const companyName = client.company.trim() || client.name.trim();
      const key = normalizeKey(companyName);
      const companyId = toCompanyId(companyName || `company-${client.id}`);
      const value = parseCurrencyAmount(client.revenue);
      const { firstName, lastName } = splitName(client.name);
      const contact: ContactRecord = {
        id: String(client.id),
        companyId,
        firstName,
        lastName,
        email: client.email,
        phone: client.phone || undefined,
        jobTitle: client.jobTitle || undefined,
        isPrimary: !companies.has(key),
        createdAt: client.createdAt.toISOString(),
      };

      const existing = companies.get(key);
      if (!existing) {
        companies.set(key, {
          id: companyId,
          name: companyName || `Company ${client.id}`,
          industry: client.industry || undefined,
          phone: client.phone || undefined,
          email: client.email,
          status: client.status === "active" ? "active" : client.status === "pending" ? "prospect" : "inactive",
          contacts: [contact],
          deals: [],
          value,
          size: toCompanySize(1, value),
          createdAt: client.createdAt.toISOString(),
          updatedAt: client.updatedAt.toISOString(),
        });
        continue;
      }

      const createdAt = new Date(existing.createdAt) < client.createdAt ? existing.createdAt : client.createdAt.toISOString();
      const updatedAt = new Date(existing.updatedAt) > client.updatedAt ? existing.updatedAt : client.updatedAt.toISOString();
      const contacts = [...existing.contacts, contact];
      const statuses = [existing.status === "prospect" ? "pending" : existing.status, client.status];
      const nextValue = existing.value + value;

      companies.set(key, {
        ...existing,
        industry: existing.industry || client.industry || undefined,
        phone: existing.phone || client.phone || undefined,
        email: existing.email || client.email,
        contacts,
        value: nextValue,
        size: toCompanySize(contacts.length, nextValue),
        status: deriveCompanyStatus(statuses),
        createdAt,
        updatedAt,
      });
    }

    return Array.from(companies.values()).sort((left, right) => {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  },

  async getSalesMetrics(access?: AccessScope) {
    const CACHE_KEY = `sales:metrics:${access?.email || "public"}`;
    const cached = cache.get<SalesMetrics>(CACHE_KEY);
    if (cached) return cached;

    // Build user-specific filters for data isolation
    const dealWhere: Prisma.DealWhereInput = { deletedAt: null };
    
    // Admin/Manager see only their deals
    if (access?.role === "admin" || access?.role === "manager") {
      dealWhere.OR = [
        { assignedTo: access.email },
        { assignedTo: access.userId ?? "" },
      ];
    }
    // Employees see only their assigned deals
    if (access?.role === "employee") {
      dealWhere.assignedTo = { in: [access.email, access.userId ?? ""] };
    }

    // Get actual deals data for pipeline metrics
    const [deals, invoices, clients] = await Promise.all([
      prisma.deal.findMany({
        where: dealWhere,
        select: {
          value: true,
          stage: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.invoice.findMany({
        where: { deletedAt: null },
        select: {
          amount: true,
          client: true,
          status: true,
          date: true,
          createdAt: true,
        },
      }),
      prisma.client.findMany({
        where: { deletedAt: null },
        select: {
          name: true,
          company: true,
          revenue: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate pipeline metrics from deals
    const activeDeals = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage));
    const wonDeals = deals.filter(d => d.stage === "closed_won");
    const lostDeals = deals.filter(d => d.stage === "closed_lost");

    const pipelineValue = activeDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const totalDealsValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
    const dealsWon = wonDeals.length;
    const dealsLost = lostDeals.length;
    const conversionRate = deals.length > 0 ? Math.round(((dealsWon) / deals.length) * 100) : 0;

    // Calculate average deal size from won deals
    const averageDealSize = wonDeals.length > 0 
      ? Math.round(wonDeals.reduce((sum, d) => sum + (d.value || 0), 0) / wonDeals.length)
      : 0;

    // Calculate average sales cycle from deals
    const wonDealsWithDates = wonDeals.filter(d => d.createdAt && d.updatedAt);
    const salesCycleSamples = wonDealsWithDates.map(d => {
      const diff = d.updatedAt.getTime() - d.createdAt.getTime();
      return Math.round(diff / (1000 * 60 * 60 * 24)); // Convert to days
    });
    const salesCycle = salesCycleSamples.length > 0
      ? Math.round(salesCycleSamples.reduce((sum, days) => sum + days, 0) / salesCycleSamples.length)
      : 1; // Default to 1 day if no won deals

    // Revenue from invoices
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const invoiceEntries = invoices.map((invoice) => {
      const invoiceDate = invoice.date ? new Date(invoice.date) : invoice.createdAt;
      return {
        amount: parseCurrencyAmount(invoice.amount),
        clientKey: normalizeKey(invoice.client),
        status: invoice.status,
        invoiceDate: Number.isNaN(invoiceDate.getTime()) ? invoice.createdAt : invoiceDate,
      };
    });

    const totalRevenue = invoiceEntries.reduce((sum, invoice) => sum + invoice.amount, 0);
    const monthlyRevenue = invoiceEntries.reduce((sum, invoice) => {
      return invoice.invoiceDate.getMonth() === currentMonth && invoice.invoiceDate.getFullYear() === currentYear
        ? sum + invoice.amount
        : sum;
    }, 0);

    const pendingInvoiceRevenue = invoiceEntries
      .filter((invoice) => invoice.status === "pending")
      .reduce((sum, invoice) => sum + invoice.amount, 0);

    const metrics: SalesMetrics = {
      totalRevenue,
      monthlyRevenue,
      dealsWon,
      dealsLost,
      conversionRate,
      averageDealSize,
      salesCycle,
      pipelineValue,
      forecastedRevenue: pendingInvoiceRevenue,
    };

    cache.set(CACHE_KEY, metrics, TTL.SALES_METRICS);
    return metrics;
  },

  async listCommandActions() {
    return commandActions;
  },

  async listThemePreviews() {
    return themePreviews;
  },
};
