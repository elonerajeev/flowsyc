import { teamMembersService } from "../src/services/team-members.service";
import { prisma } from "../src/config/prisma";

async function main() {
  const email = `member-${Date.now()}@example.com`;
  const member = await teamMembersService.create({
    name: "Minimal Member",
    email,
    role: "Employee",
    department: "Ops",
    team: "Smoke",
    designation: "Support Specialist",
    manager: "Team Lead",
    workingHours: "09:00 - 18:00",
    officeLocation: "HQ",
    timeZone: "Asia/Calcutta",
    baseSalary: 50000,
    allowances: 5000,
    deductions: 1000,
    paymentMode: "upi",
    attendance: "present",
    checkIn: "9:00 AM",
    location: "HQ",
  });

  console.log(
    JSON.stringify(
      {
        id: member.id,
        name: member.name,
        email: member.email,
        team: member.team,
        designation: member.designation,
        paymentMode: member.paymentMode,
      },
      null,
      2,
    ),
  );

  await teamMembersService.delete(member.id);
  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
