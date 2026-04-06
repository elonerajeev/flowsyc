import { prisma } from "../config/prisma";

type AlertType = "payroll_due" | "invoice_overdue" | "task_overdue" | "project_stalled";

interface Alert {
  type: AlertType;
  severity: "warning" | "critical";
  title: string;
  description: string;
  entityId?: string | number;
  entityType: string;
  actionUrl?: string;
}

export const automationService = {
  async checkAllAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    const [payrollAlerts, invoiceAlerts, taskAlerts, projectAlerts] = await Promise.all([
      this.checkPayrollAlerts(),
      this.checkInvoiceOverdue(),
      this.checkTaskOverdue(),
      this.checkProjectStalled(),
    ]);
    
    return [...payrollAlerts, ...invoiceAlerts, ...taskAlerts, ...projectAlerts];
  },

  async checkPayrollAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const currentPeriod = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    
    // Get all active team members with salary
    const members = await prisma.teamMember.findMany({
      where: { deletedAt: null, status: "active", baseSalary: { gt: 0 } },
      select: { id: true, name: true, baseSalary: true, department: true },
    });
    
    // Check payroll by comparing updatedAt with current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    for (const member of members) {
      // If not updated this month, flag as payroll due
      if (member.baseSalary > 0) {
        alerts.push({
          type: "payroll_due",
          severity: member.baseSalary > 80000 ? "critical" : "warning",
          title: `Payroll Due - ${member.name}`,
          description: `${member.name} (${member.department}) - Base salary: $${member.baseSalary.toLocaleString()}`,
          entityId: member.id,
          entityType: "TeamMember",
          actionUrl: `/hr/payroll?member=${member.id}`,
        });
      }
    }
    
    return alerts;
  },

  async checkInvoiceOverdue(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        deletedAt: null,
        status: { in: ["pending", "active"] },
        due: { lt: today.toISOString().slice(0, 10) },
      },
      select: { id: true, client: true, amount: true, due: true, status: true },
    });
    
    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor((today.getTime() - new Date(invoice.due).getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        type: "invoice_overdue",
        severity: daysOverdue > 30 ? "critical" : "warning",
        title: `Invoice Overdue - ${invoice.client}`,
        description: `${invoice.client} invoice (${invoice.amount}) is ${daysOverdue} days overdue`,
        entityId: invoice.id,
        entityType: "Invoice",
        actionUrl: `/finance/invoices?id=${invoice.id}`,
      });
    }
    
    return alerts;
  },

  async checkTaskOverdue(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const today = new Date().toISOString().slice(0, 10);
    
    const overdueTasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        column: { in: ["todo", "in_progress"] },
        dueDate: { lt: today },
      },
      select: { id: true, title: true, assignee: true, priority: true, dueDate: true },
    });
    
    for (const task of overdueTasks) {
      alerts.push({
        type: "task_overdue",
        severity: task.priority === "high" ? "critical" : "warning",
        title: `Task Overdue - ${task.title.slice(0, 30)}`,
        description: `Task "${task.title}" assigned to ${task.assignee} was due on ${task.dueDate}`,
        entityId: task.id,
        entityType: "Task",
        actionUrl: `/workspace/tasks?id=${task.id}`,
      });
    }
    
    return alerts;
  },

  async checkProjectStalled(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const stalledProjects = await prisma.project.findMany({
      where: {
        deletedAt: null,
        status: "active",
        updatedAt: { lt: oneWeekAgo },
      },
      select: { id: true, name: true, progress: true, stage: true },
    });
    
    for (const project of stalledProjects) {
      alerts.push({
        type: "project_stalled",
        severity: project.progress < 30 ? "critical" : "warning",
        title: `Project Stalled - ${project.name}`,
        description: `${project.name} has had no updates in 7 days. Progress: ${project.progress}%`,
        entityId: project.id,
        entityType: "Project",
        actionUrl: `/workspace/projects?id=${project.id}`,
      });
    }
    
    return alerts;
  },

  async calculateProjectProgress(projectId: number): Promise<number> {
    const tasks = await prisma.task.findMany({
      where: { deletedAt: null, projectId },
      select: { column: true },
    });
    
    if (tasks.length === 0) return 0;
    
    const doneCount = tasks.filter(t => t.column === "done").length;
    return Math.round((doneCount / tasks.length) * 100);
  },

  async autoUpdateProjectProgress(): Promise<void> {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    
    for (const project of projects) {
      const progress = await this.calculateProjectProgress(project.id);
      await prisma.project.update({
        where: { id: project.id },
        data: { progress },
      });
    }
  },

  async getAlertsSummary() {
    const alerts = await this.checkAllAlerts();
    
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === "critical").length,
      warning: alerts.filter(a => a.severity === "warning").length,
      byType: {
        payroll_due: alerts.filter(a => a.type === "payroll_due").length,
        invoice_overdue: alerts.filter(a => a.type === "invoice_overdue").length,
        task_overdue: alerts.filter(a => a.type === "task_overdue").length,
        project_stalled: alerts.filter(a => a.type === "project_stalled").length,
      },
    };
  },
};
