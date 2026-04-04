import { prisma } from "../src/config/prisma";
import { LeadSource, LeadStatus, DealStage } from "@prisma/client";

async function main() {
  console.log("Seeding Leads and Deals...");

  // Wipe existing
  await prisma.dealActivity.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.lead.deleteMany({});

  // Seed Leads
  const leads = [
    { firstName: "John", lastName: "Doe", email: "john@example.com", company: "Innovate Inc", status: LeadStatus.new, source: LeadSource.website, score: 85, assignedTo: "admin@crmpro.com" },
    { firstName: "Jane", lastName: "Smith", email: "jane@example.com", company: "Growth Co", status: LeadStatus.qualified, source: LeadSource.referral, score: 92, assignedTo: "manager@crmpro.com" },
    { firstName: "Robert", lastName: "Brown", email: "robert@example.com", company: "Future Tech", status: LeadStatus.contacted, source: LeadSource.social, score: 70, assignedTo: "employee1@crmpro.com" },
    { firstName: "Alice", lastName: "Johnson", email: "alice@example.com", company: "Alice's Apps", status: LeadStatus.proposal, source: LeadSource.email, score: 95, assignedTo: "admin@crmpro.com" },
  ];

  for (const lead of leads) {
    await prisma.lead.create({ data: { ...lead, updatedAt: new Date() } });
  }

  // Seed Deals
  const deals = [
    { title: "Enterprise License Upgrade", value: 50000, stage: DealStage.negotiation, probability: 80, assignedTo: "admin@crmpro.com", description: "Upgrading Acme Corp to Enterprise tier." },
    { title: "New Mobile App Implementation", value: 25000, stage: DealStage.proposal, probability: 60, assignedTo: "manager@crmpro.com", description: "Standard implementation for Growth Co." },
    { title: "Consulting Package", value: 10000, stage: DealStage.prospecting, probability: 20, assignedTo: "employee1@crmpro.com", description: "Initial consulting for Future Tech." },
    { title: "SaaS Subscription Bundle", value: 15000, stage: DealStage.qualification, probability: 40, assignedTo: "admin@crmpro.com", description: "Bundle for Small Biz." },
    { title: "Old Won Deal", value: 5000, stage: DealStage.closed_won, probability: 100, assignedTo: "admin@crmpro.com", description: "Completed last month." },
  ];

  for (const deal of deals) {
    await prisma.deal.create({ data: { ...deal, updatedAt: new Date() } });
  }

  console.log("✅ Seeding Leads and Deals complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
