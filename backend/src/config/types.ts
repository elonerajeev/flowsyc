export type UserRole = "admin" | "manager" | "employee" | "client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  employeeId: string;
  department: string;
  team: string;
  designation: string;
  manager: string;
  workingHours: string;
  officeLocation: string;
  timeZone: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  paymentMode: "bank-transfer" | "cash" | "upi";
  payrollCycle: string;
  payrollDueDate: string;
  joinedAt: string;
  location: string;
};

export type ThemePreview = {
  label: string;
  subtitle: string;
  vibe: string;
};
