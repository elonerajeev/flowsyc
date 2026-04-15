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
  async list(access?: AccessScope) {
    const where: any = { deletedAt: null };

    // RBAC: All authenticated users can see contacts
    // Employees see contacts from clients they're assigned to, PLUS unassigned contacts (from leads)
    if (access?.role === "employee") {
      const assignedClients = await prisma.client.findMany({
        where: {
          assignedTo: access.email,
          deletedAt: null,
        },
        select: { id: true },
      });
      const assignedClientIds = assignedClients.map(c => c.id);
      // Show contacts that either: 1) belong to assigned clients, OR 2) have no clientId (created from leads)
      where.OR = [
        { clientId: { in: assignedClientIds } },
        { clientId: null },
      ];
    }

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

  async create(input: ContactInput) {
    try {
      // Check if email already exists
      const existing = await prisma.contact.findUnique({
        where: { email: input.email },
      });

      if (existing && !existing.deletedAt) {
        throw new AppError("A contact with this email already exists", 409, "CONFLICT");
      }

      // If email exists but is deleted, restore it
      if (existing && existing.deletedAt) {
        const updated = await prisma.contact.update({
          where: { email: input.email },
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            jobTitle: input.jobTitle,
            department: input.department,
            clientId: input.clientId,
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
          email: input.email,
          phone: input.phone,
          jobTitle: input.jobTitle,
          department: input.department,
          clientId: input.clientId,
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

      const contact = await prisma.contact.update({
        where: { id },
        data: {
          ...patch,
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
    const where: any = { id, deletedAt: null };

    // RBAC: Admins/Managers see all; Employees see contacts from clients they're assigned to
    if (access?.role === "employee") {
      const assignedClients = await prisma.client.findMany({
        where: {
          assignedTo: access.email,
          deletedAt: null,
        },
        select: { id: true },
      });
      where.clientId = { in: assignedClients.map(c => c.id) };
    }

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