import {
  attendanceRecords,
  clientRecords,
  commandActions,
  conversations,
  invoices,
  messages,
  projectRecords,
  reports,
  taskBoard,
  themePreviews,
} from "@/data/mock-crm";
import type { ActivityItem, KPIMetric } from "@/types/crm";

const simulateLatency = async <T,>(data: T, delay = 120): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return structuredClone(data);
};

const dayKey = () => new Date().toISOString().slice(0, 10);

const hashString = (input: string) => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const createRng = (seedInput: string) => {
  let seed = hashString(seedInput) || 1;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
};

const pick = <T,>(rng: () => number, values: T[]) => values[Math.floor(rng() * values.length)];

const buildDailyMetrics = (): KPIMetric[] => {
  const rng = createRng(`${dayKey()}-metrics`);
  const revenue = 1700000 + Math.floor(rng() * 220000);
  const clients = 118 + Math.floor(rng() * 18);
  const coverage = 3.2 + rng() * 0.9;
  const risk = 4 + Math.floor(rng() * 4);

  return [
    { label: "Revenue Run Rate", value: `$${(revenue / 1000000).toFixed(2)}M`, change: `+${(9 + rng() * 8).toFixed(1)}%`, direction: "up", detail: "vs previous period" },
    { label: "Active Clients", value: String(clients), change: `+${(4 + rng() * 7).toFixed(1)}%`, direction: "up", detail: "accounts in play" },
    { label: "Pipeline Coverage", value: `${coverage.toFixed(1)}x`, change: `+${(0.2 + rng() * 0.5).toFixed(1)}x`, direction: "up", detail: "against target" },
    { label: "At-Risk Accounts", value: `${String(risk).padStart(2, "0")}`, change: `-${1 + Math.floor(rng() * 3)}`, direction: "up", detail: "need follow-up" },
  ];
};

const buildDailyRevenueSeries = () => {
  const rng = createRng(`${dayKey()}-revenue`);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((month, index) => ({
    month,
    revenue: 42000 + index * 6200 + Math.floor(rng() * 6800),
    deals: 12 + index * 2 + Math.floor(rng() * 4),
    retention: 91 + Math.min(5, index) + Math.floor(rng() * 2),
  }));
};

const buildDailyPipeline = () => {
  const rng = createRng(`${dayKey()}-pipeline`);
  const base = [
    { name: "Qualified", color: "hsl(211 38% 51%)" },
    { name: "Proposal", color: "hsl(213 43% 64%)" },
    { name: "Negotiation", color: "hsl(202 100% 88%)" },
    { name: "Closed Won", color: "hsl(173 58% 39%)" },
  ];
  const values = [26, 22, 20, 32];
  return base.map((stage, index) => ({
    ...stage,
    value: values[index] + Math.floor(rng() * 6) - 2,
  }));
};

const buildDailyCadence = () => {
  const rng = createRng(`${dayKey()}-cadence`);
  return [
    { name: "Revenue", value: 84 + Math.floor(rng() * 10) },
    { name: "Delivery", value: 78 + Math.floor(rng() * 12) },
    { name: "Support", value: 82 + Math.floor(rng() * 10) },
    { name: "Ops", value: 74 + Math.floor(rng() * 10) },
    { name: "Hiring", value: 68 + Math.floor(rng() * 14) },
  ].map((item) => ({ ...item, value: Math.min(100, item.value) }));
};

const buildDailyActivityFeed = (): ActivityItem[] => {
  const rng = createRng(`${dayKey()}-activity`);
  const templates: ActivityItem[] = [
    { id: 1, text: "Client follow-up completed for a renewal account", time: "5 min ago", type: "completed" },
    { id: 2, text: "A new task was assigned to the delivery team", time: "18 min ago", type: "pending" },
    { id: 3, text: "Executive review booked for later today", time: "42 min ago", type: "active" },
    { id: 4, text: "A project moved into review for QA sign-off", time: "2 hours ago", type: "in-progress" },
    { id: 5, text: "A hiring candidate entered the final stage", time: "3 hours ago", type: "pending" },
    { id: 6, text: "Attendance corrections were requested by a manager", time: "4 hours ago", type: "completed" },
  ];

  const shuffled = [...templates].sort(() => rng() - 0.5);
  const timeLabels = ["Just now", "9 min ago", "27 min ago", "1 hour ago", "3 hours ago", "Today"];
  return shuffled.slice(0, 4).map((item, index) => ({
    ...item,
    id: index + 1,
    time: timeLabels[index],
  }));
};

const buildTodayFocus = () => {
  const rng = createRng(`${dayKey()}-focus`);
  const focusSets = [
    [
      "Finance and media accounts are leading the pipeline.",
      "Two enterprise clients need proactive outreach today.",
      "Analytics delivery should stay on the critical path only.",
    ],
    [
      "One renewal account is ready for expansion follow-up.",
      "Attendance reviews should be cleared before noon.",
      "Task completion is strongest in delivery and support today.",
    ],
    [
      "New leads are strongest in the enterprise segment.",
      "Billing reminders should go out before the afternoon cutoff.",
      "Team capacity is balanced across product and ops.",
    ],
  ];

  return pick(rng, focusSets);
};

const buildExecutionReadiness = () => {
  const rng = createRng(`${dayKey()}-readiness`);
  return 84 + Math.floor(rng() * 12);
};

export const crmService = {
  getDashboard: () =>
    simulateLatency({
      metrics: buildDailyMetrics(),
      revenueSeries: buildDailyRevenueSeries(),
      pipelineBreakdown: buildDailyPipeline(),
      operatingCadence: buildDailyCadence(),
      activityFeed: buildDailyActivityFeed(),
      todayFocus: buildTodayFocus(),
      executionReadiness: buildExecutionReadiness(),
    }),
  getClients: () => simulateLatency(clientRecords),
  getProjects: () => simulateLatency(projectRecords),
  getTasks: () => simulateLatency(taskBoard),
  getConversations: () => simulateLatency(conversations),
  getMessages: () => simulateLatency(messages),
  getInvoices: () => simulateLatency(invoices),
  getReports: () => simulateLatency(reports),
  getTeamMembers: () => simulateLatency(teamMembers),
  getAttendance: () => simulateLatency(attendanceRecords),
  getCommandActions: () => simulateLatency(commandActions),
  getThemePreviews: () => simulateLatency(themePreviews),
};
