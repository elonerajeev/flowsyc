import crypto from "crypto";
import type { AuthUser, UserRole } from "../config/types";

function generateEmployeeId(role: UserRole) {
  const prefix = role === "client" ? "CLT" : "EMP";
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

const salaryProfiles: Record<UserRole, Omit<AuthUser, "id" | "name" | "email" | "role" | "employeeId">> = {
  admin: {
    emailVerified: true,
    department: "Operations",
    team: "Platform Ops",
    designation: "Admin Lead",
    manager: "Executive Team",
    workingHours: "09:30 - 18:30",
    officeLocation: "HQ - Floor 4",
    timeZone: "Asia/Calcutta",
    baseSalary: 145000,
    allowances: 22000,
    deductions: 7800,
    paymentMode: "bank-transfer",
    payrollCycle: "Mar 2026",
    payrollDueDate: "Apr 05, 2026",
    joinedAt: "2023-09-18",
    location: "Head Office",
  },
  manager: {
    emailVerified: true,
    department: "Management",
    team: "Growth Team",
    designation: "Workspace Manager",
    manager: "Director of Operations",
    workingHours: "10:00 - 19:00",
    officeLocation: "Hybrid Desk",
    timeZone: "Asia/Calcutta",
    baseSalary: 128000,
    allowances: 18000,
    deductions: 6500,
    paymentMode: "bank-transfer",
    payrollCycle: "Mar 2026",
    payrollDueDate: "Apr 05, 2026",
    joinedAt: "2024-01-12",
    location: "Hybrid",
  },
  employee: {
    emailVerified: true,
    department: "Delivery",
    team: "Client Delivery",
    designation: "Product Specialist",
    manager: "Team Manager",
    workingHours: "09:00 - 18:00",
    officeLocation: "HQ - Floor 2",
    timeZone: "Asia/Calcutta",
    baseSalary: 72000,
    allowances: 12000,
    deductions: 3200,
    paymentMode: "upi",
    payrollCycle: "Mar 2026",
    payrollDueDate: "Apr 05, 2026",
    joinedAt: "2024-05-06",
    location: "Remote",
  },
  client: {
    emailVerified: true,
    department: "Client Success",
    team: "Account Care",
    designation: "Client Contact",
    manager: "Account Owner",
    workingHours: "09:00 - 17:00",
    officeLocation: "External",
    timeZone: "Asia/Calcutta",
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    paymentMode: "upi",
    payrollCycle: "Mar 2026",
    payrollDueDate: "Apr 05, 2026",
    joinedAt: "2025-02-20",
    location: "External",
  },
};

export function buildProfile(role: UserRole) {
  return {
    ...salaryProfiles[role],
    employeeId: generateEmployeeId(role),
  };
}
