import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Admin@123456", 10);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@crm.com" },
    update: {},
    create: {
      id: "admin-001",
      name: "Admin User",
      email: "admin@crm.com",
      passwordHash: hashedPassword,
      role: "admin",
      employeeId: "EMP-ADMIN-001",
      department: "Management",
      team: "Admin",
      designation: "Administrator",
      manager: "Self",
      workingHours: "9-5",
      officeLocation: "HQ",
      timeZone: "IST",
      baseSalary: 100000,
      allowances: 10000,
      deductions: 5000,
      paymentMode: "bank_transfer",
      payrollCycle: "monthly",
      payrollDueDate: "25",
      joinedAt: new Date().toISOString(),
      location: "India",
      emailVerified: true,
      updatedAt: new Date(),
    },
  });

  console.log("✅ Admin created:");
  console.log(`Email: ${admin.email}`);
  console.log(`Password: Admin@123456`);
  console.log(`Role: ${admin.role}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
