import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { logger } from "../utils/logger";

export type ContactInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  clientId?: number;
};

export type ContactRecord = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  clientId?: number;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
};

type AccessScope = {
  role: string;
  email: string;
  userId?: string;
  organizationId?: string;
} | null | undefined;

function mapContact(contact: any): ContactRecord {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    jobTitle: contact.jobTitle,
    department: contact.department,
    clientId: contact.clientId,
    companyName: contact.client?.name,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export const contactsService = {
  async buildScopedWhere(access?: AccessScope, contactId?: number) {
    const where: any = {
      deletedAt: null,
      ...(contactId ? { id: contactId } : {}),
    };

    const actorIds = [access?.email, access?.userId].filter(Boolean) as string[];
    if (!access) {
      return where;
    }

    // Primary tenant isolation by organization.
    if (access.organizationId) {
      where.organizationId = access.organizationId;

      // Employees are narrowed to contacts tied to their scope.
      if (access.role === "employee") {
        const [assignedClients, scopedLeads] = await Promise.all([
          prisma.client.findMany({
            where: {
              deletedAt: null,
              organizationId: access.organizationId,
              ...(actorIds.length > 0 ? { assignedTo: { in: actorIds } } : { id: -1 }),
            },
            select: { id: true },
          }),
          prisma.lead.findMany({
            where: {
              deletedAt: null,
              organizationId: access.organizationId,
              ...(actorIds.length > 0 ? { assignedTo: { in: actorIds } } : { id: -1 }),
            },
            select: { id: true },
          }),
        ]);

        const assignedClientIds = assignedClients.map((c) => c.id);
        const scopedLeadIds = scopedLeads.map((l) => l.id);
        where.OR = [
          { clientId: { in: assignedClientIds } },
          { leadId: { in: scopedLeadIds } },
        ];
      }

      return where;
    }

    // Legacy fallback for records without organizationId.
    if (access.role === "admin" || access.role === "manager" || access.role === "employee") {
      const [scopedLeads, assignedClients] = await Promise.all([
        prisma.lead.findMany({
          where: {
            deletedAt: null,
            ...(access.role === "employee"
              ? { assignedTo: { in: actorIds } }
              : {
                  OR: [
                    ...(actorIds.length > 0 ? actorIds.map((id) => ({ createdBy: id })) : []),
                    ...(actorIds.length > 0 ? actorIds.map((id) => ({ assignedTo: id })) : []),
                  ],
                }),
          },
          select: { id: true },
        }),
        prisma.client.findMany({
          where: {
            deletedAt: null,
            ...(actorIds.length > 0 ? { assignedTo: { in: actorIds } } : { id: -1 }),
          },
          select: { id: true },
        }),
      ]);

      const scopedLeadIds = scopedLeads.map((l) => l.id);
      const assignedClientIds = assignedClients.map((c) => c.id);
      where.OR = [
        { leadId: { in: scopedLeadIds } },
        { clientId: { in: assignedClientIds } },
      ];
    }

    return where;
  },

  async list(access?: AccessScope) {
    const where = await this.buildScopedWhere(access);

    try {
      const contacts = await prisma.contact.findMany({
        where,
        include: { client: { select: { id: true, name: true, company: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      return contacts.map(mapContact);
    } catch (error) {
      logger.error("Error fetching contacts:", error);
      throw new AppError("Failed to fetch contacts", 500, "INTERNAL_ERROR");
    }
  },

  async create(input: ContactInput, access?: AccessScope) {
    try {
      const normalizedEmail = input.email.trim().toLowerCase();
      const organizationId = access?.organizationId ?? null;

      // Check if email already exists
      const existing = await prisma.contact.findFirst({
        where: {
          email: normalizedEmail,
          organizationId,
        },
      });

      if (existing && !existing.deletedAt) {
        throw new AppError("A contact with this email already exists", 409, "CONFLICT");
      }

      // If email exists but is deleted, restore it
      if (existing && existing.deletedAt) {
        const updated = await prisma.contact.update({
          where: { id: existing.id },
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: normalizedEmail,
            phone: input.phone,
            jobTitle: input.jobTitle,
            department: input.department,
            clientId: input.clientId,
            organizationId: organizationId ?? existing.organizationId,
            deletedAt: null,
            updatedAt: new Date(),
          },
          include: { client: true },
        });
        return mapContact(updated);
      }

      // Create new contact
      const contact = await prisma.contact.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: normalizedEmail,
          phone: input.phone,
          jobTitle: input.jobTitle,
          department: input.department,
          clientId: input.clientId,
          organizationId,
        },
        include: { client: true },
      });

      return mapContact(contact);
    } catch (error) {
      logger.error("Error creating contact:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to create contact", 500, "INTERNAL_ERROR");
    }
  },

  async update(id: number, patch: Partial<ContactInput>, access?: AccessScope) {
    try {
      // Check permissions
      const existing = await this.getById(id, access);
      const normalizedEmail = patch.email?.trim().toLowerCase();

      if (normalizedEmail && normalizedEmail !== existing.email.toLowerCase()) {
        const emailOwner = await prisma.contact.findFirst({
          where: {
            email: normalizedEmail,
            organizationId: access?.organizationId ?? null,
            deletedAt: null,
            id: { not: id },
          },
          select: { id: true },
        });
        if (emailOwner) {
          throw new AppError("A contact with this email already exists", 409, "CONFLICT");
        }
      }

      const contact = await prisma.contact.update({
        where: { id },
        data: {
          ...patch,
          ...(normalizedEmail ? { email: normalizedEmail } : {}),
          updatedAt: new Date(),
        },
        include: { client: true },
      });

      return mapContact(contact);
    } catch (error) {
      logger.error("Error updating contact:", error);
      throw new AppError("Failed to update contact", 500, "INTERNAL_ERROR");
    }
  },

  async delete(id: number, access?: AccessScope) {
    try {
      // Check permissions
      await this.getById(id, access);

      await prisma.contact.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    } catch (error) {
      logger.error("Error deleting contact:", error);
      throw new AppError("Failed to delete contact", 500, "INTERNAL_ERROR");
    }
  },

  async getById(id: number, access?: AccessScope) {
    const where = await this.buildScopedWhere(access, id);

    const contact = await prisma.contact.findFirst({
      where,
      include: { client: true },
    });

    if (!contact) {
      throw new AppError("Contact not found or access denied", 404, "NOT_FOUND");
    }

    return mapContact(contact);
  },
};
