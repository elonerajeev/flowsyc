export const revenueData = [
  { month: "Jan", revenue: 85000, target: 90000 },
  { month: "Feb", revenue: 112000, target: 100000 },
  { month: "Mar", revenue: 98000, target: 110000 },
  { month: "Apr", revenue: 145000, target: 120000 },
  { month: "May", revenue: 168000, target: 140000 },
  { month: "Jun", revenue: 192000, target: 160000 },
];

export const pipelineData = [
  { name: "Qualified", value: 42, color: "#5355D6" },
  { name: "Negotiation", value: 28, color: "#2A8F7A" },
  { name: "Proposal", value: 18, color: "#F0A030" },
  { name: "Lost", value: 12, color: "#DC3545" },
];

export const dealsBySource = [
  { source: "Website", deals: 45, color: "#5355D6" },
  { source: "Referral", deals: 32, color: "#2A8F7A" },
  { source: "Social", deals: 28, color: "#F0A030" },
  { source: "Email", deals: 22, color: "#7B7FFF" },
  { source: "Other", deals: 15, color: "#DC3545" },
];

export const activityFeed = [
  { text: "New deal — Acme Corp", amount: "$45,000", badge: "Won", badgeColor: "#2A8F7A", time: "2m ago" },
  { text: "Task completed — Dashboard redesign", amount: "", badge: "Done", badgeColor: "#5355D6", time: "15m ago" },
  { text: "Client onboarded — TechFlow Inc", amount: "", badge: "Active", badgeColor: "#2A8F7A", time: "1h ago" },
  { text: "Invoice sent — Q2 Retainer", amount: "$12,400", badge: "Pending", badgeColor: "#F0A030", time: "3h ago" },
  { text: "Lead converted — DataDriven", amount: "$28,000", badge: "Won", badgeColor: "#2A8F7A", time: "5h ago" },
];

export const crmLeads = [
  { name: "Acme Corporation", contact: "John Smith", stage: "Proposal", value: "$45,000", prob: 80, color: "#F0A030" },
  { name: "TechFlow Inc", contact: "Sarah Lee", stage: "Negotiation", value: "$82,000", prob: 65, color: "#5355D6" },
  { name: "DataDriven Co", contact: "Mike Chen", stage: "Qualified", value: "$28,000", prob: 40, color: "#2A8F7A" },
  { name: "ScaleUp Ltd", contact: "Emma Davis", stage: "Won", value: "$120,000", prob: 100, color: "#2A8F7A" },
  { name: "Innovate.io", contact: "Alex Park", stage: "Lost", value: "$35,000", prob: 0, color: "#DC3545" },
];

export const projects = [
  { name: "Website Redesign", client: "Acme Corp", progress: 78, status: "On Track", due: "Jun 15", tasks: 24, done: 18, color: "#5355D6" },
  { name: "Mobile App MVP", client: "TechFlow", progress: 45, status: "At Risk", due: "Jul 1", tasks: 36, done: 16, color: "#F0A030" },
  { name: "CRM Integration", client: "DataDriven", progress: 92, status: "On Track", due: "May 30", tasks: 12, done: 11, color: "#2A8F7A" },
  { name: "Brand Identity", client: "ScaleUp", progress: 20, status: "Planning", due: "Aug 10", tasks: 18, done: 4, color: "#7B7FFF" },
];

export const employees = [
  { name: "Sarah Chen", role: "Sales Manager", dept: "Sales", status: "Active", attendance: 98, salary: "$8,500" },
  { name: "Marcus Johnson", role: "Dev Lead", dept: "Engineering", status: "Active", attendance: 95, salary: "$11,200" },
  { name: "Elena Rodriguez", role: "Designer", dept: "Design", status: "On Leave", attendance: 82, salary: "$7,800" },
  { name: "David Park", role: "DevOps", dept: "Engineering", status: "Active", attendance: 100, salary: "$10,500" },
  { name: "Amanda Foster", role: "HR Manager", dept: "HR", status: "Active", attendance: 97, salary: "$9,000" },
];

export const invoices = [
  { id: "INV-2024", client: "Acme Corp", amount: "$12,400", status: "Paid", due: "May 1", color: "#2A8F7A" },
  { id: "INV-2025", client: "TechFlow", amount: "$8,750", status: "Pending", due: "Jun 5", color: "#F0A030" },
  { id: "INV-2026", client: "DataDriven", amount: "$22,000", status: "Overdue", due: "Apr 20", color: "#DC3545" },
  { id: "INV-2027", client: "ScaleUp", amount: "$5,200", status: "Paid", due: "May 15", color: "#2A8F7A" },
  { id: "INV-2028", client: "Innovate.io", amount: "$18,900", status: "Draft", due: "Jun 30", color: "#7B7FFF" },
];
