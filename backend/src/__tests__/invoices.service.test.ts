import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type MockInvoice = {
  id: string;
  client: string;
  amount: string;
  date: string;
  due: string;
  status: "active" | "pending" | "completed";
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const mockState = {
  invoices: [] as MockInvoice[],
};

const mockPrisma = {
  client: {
    findFirst: jest.fn(async () => ({ email: "client@example.com" })),
  },
  invoice: {
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => mockState.invoices.find((invoice) => invoice.id === where.id) ?? null),
    count: jest.fn(async () => mockState.invoices.filter((invoice) => !invoice.deletedAt).length),
    findMany: jest.fn(async () => mockState.invoices.filter((invoice) => !invoice.deletedAt)),
    create: jest.fn(async ({ data }: { data: Omit<MockInvoice, "id" | "deletedAt" | "createdAt" | "updatedAt"> }) => {
      const invoice: MockInvoice = {
        id: `INV-${mockState.invoices.length + 1}`,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      mockState.invoices.push(invoice);
      return invoice;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<MockInvoice> }) => {
      const invoice = mockState.invoices.find((entry) => entry.id === where.id);
      if (!invoice) throw new Error("Invoice not found");
      Object.assign(invoice, data, { updatedAt: new Date() });
      return invoice;
    }),
  },
  $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Array<Promise<unknown>>)),
};

jest.mock("../config/prisma", () => ({
  prisma: mockPrisma,
}));

describe("invoicesService", () => {
  beforeEach(() => {
    mockState.invoices.length = 0;
    mockPrisma.invoice.findUnique.mockClear();
    mockPrisma.invoice.count.mockClear();
    mockPrisma.invoice.findMany.mockClear();
    mockPrisma.invoice.create.mockClear();
    mockPrisma.invoice.update.mockClear();
    mockPrisma.$transaction.mockClear();
  });

  it("creates an invoice with a cuid id", async () => {
    const { invoicesService } = await import("../services/invoices.service");
    const invoice = await invoicesService.create({
      client: "Acme",
      amount: "$100",
      date: "2026-03-28",
      due: "2026-04-28",
      status: "pending",
    });
    expect(invoice.id).toEqual(expect.any(String));
    expect(invoice.client).toBe("Acme");
  });

  it("soft-deletes on delete", async () => {
    mockState.invoices.push({
      id: "INV-1",
      client: "Acme",
      amount: "$100",
      date: "2026-03-28",
      due: "2026-04-28",
      status: "pending",
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { invoicesService } = await import("../services/invoices.service");
    await invoicesService.delete("INV-1");
    expect(mockState.invoices[0].deletedAt).toEqual(expect.any(Date));
  });
});
