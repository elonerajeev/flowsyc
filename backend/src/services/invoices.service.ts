import crypto from "crypto";
import { prisma } from "../config/prisma";
import type { UserRole } from "../config/types";
import { AppError } from "../middleware/error.middleware";
import { getInvoiceClientLabels } from "../utils/access-control";
import { sendInvoiceSentEmail } from "../utils/email-templates";

type InvoiceRecord = {
  id: string;
  client: string;
  amount: string;
  date: string;
  due: string;
  status: "active" | "pending" | "completed";
};

type InvoiceInput = Omit<InvoiceRecord, "id">;

type InvoiceQuery = {
  page: number;
  limit: number;
  status?: InvoiceRecord["status"];
};

type AccessScope = {
  role: UserRole;
  email: string;
  userId?: string;
} | null | undefined;

async function buildWhere(query: InvoiceQuery, access: AccessScope) {
  const permittedLabels = await getInvoiceClientLabels(access);
  return {
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(permittedLabels
      ? { client: { in: permittedLabels } }
      : access?.role === "admin" || access?.role === "manager"
        ? { createdBy: { in: [access.email, access.userId ?? ""].filter(Boolean) } }
        : {}),
  };
}

export const invoicesService = {
  async getById(invoiceId: string, access?: AccessScope) {
    const permittedLabels = await getInvoiceClientLabels(access);

    let invoice;
    if (permittedLabels) {
      // Client role: can only see invoices for their own client label
      invoice = await prisma.invoice.findFirst({
        where: { deletedAt: null, id: invoiceId, client: { in: permittedLabels } },
      });
    } else if (access?.role === "admin" || access?.role === "manager") {
      // Admin/Manager: can only see invoices they created
      invoice = await prisma.invoice.findFirst({
        where: {
          deletedAt: null,
          id: invoiceId,
          createdBy: { in: [access.email, access.userId ?? ""].filter(Boolean) },
        },
      });
    } else {
      invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    }

    if (!invoice || invoice.deletedAt) {
      throw new AppError("Invoice not found", 404, "NOT_FOUND");
    }
    return {
      id: invoice.id,
      client: invoice.client,
      amount: invoice.amount,
      date: invoice.date,
      due: invoice.due,
      status: invoice.status,
    };
  },

  async list(query: InvoiceQuery, access?: AccessScope) {
    const where = await buildWhere(query, access);

    const [total, invoices] = await prisma.$transaction([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      data: invoices.map((invoice) => ({
        id: invoice.id,
        client: invoice.client,
        amount: invoice.amount,
        date: invoice.date,
        due: invoice.due,
        status: invoice.status,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },

  async create(input: InvoiceInput, access?: AccessScope) {
    const invoice = await prisma.invoice.create({
      data: {
        id: crypto.randomUUID(),
        client: input.client,
        amount: input.amount,
        date: input.date,
        due: input.due,
        status: input.status ?? "pending",
        createdBy: access?.email ?? null,
        updatedAt: new Date(),
      },
    });

    // Send invoice sent email
    const client = await prisma.client.findFirst({ where: { name: input.client }, select: { email: true } });
    if (client) {
      sendInvoiceSentEmail({
        id: invoice.id,
        client: invoice.client,
        amount: invoice.amount,
        due: invoice.due,
      }, client.email).catch(() => {});
    }

    return {
      id: invoice.id,
      client: invoice.client,
      amount: invoice.amount,
      date: invoice.date,
      due: invoice.due,
      status: invoice.status,
    };
  },

  async update(invoiceId: string, patch: Partial<InvoiceInput>, access?: AccessScope) {
    const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Invoice not found", 404, "NOT_FOUND");
    }

    if (access?.role === "admin" || access?.role === "manager") {
      const isOwner = existing.createdBy === access.email || existing.createdBy === access.userId;
      if (!isOwner) {
        throw new AppError("Access denied: you can only update invoices you created", 403, "FORBIDDEN");
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(patch.client !== undefined ? { client: patch.client } : {}),
        ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
        ...(patch.date !== undefined ? { date: patch.date } : {}),
        ...(patch.due !== undefined ? { due: patch.due } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
      },
    });
    return {
      id: invoice.id,
      client: invoice.client,
      amount: invoice.amount,
      date: invoice.date,
      due: invoice.due,
      status: invoice.status,
    };
  },

  async delete(invoiceId: string) {
    const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Invoice not found", 404, "NOT_FOUND");
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { deletedAt: new Date() },
    });
  },
};
