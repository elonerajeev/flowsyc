import { Users, Calendar, ArrowUpRight, Clock } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const projects = [
  { id: 1, name: "CRM Platform v2.0", description: "Complete redesign of the CRM dashboard with new analytics", progress: 78, status: "in-progress" as const, team: ["SJ", "MC", "LP"], dueDate: "Apr 15", tasks: { done: 32, total: 41 } },
  { id: 2, name: "Mobile App Launch", description: "Native iOS and Android app for client management", progress: 45, status: "in-progress" as const, team: ["MC", "ED"], dueDate: "May 1", tasks: { done: 18, total: 40 } },
  { id: 3, name: "AI Chatbot Integration", description: "Intelligent customer support chatbot with NLP", progress: 92, status: "active" as const, team: ["MC", "JW"], dueDate: "Mar 28", tasks: { done: 23, total: 25 } },
  { id: 4, name: "Email Marketing Suite", description: "Automated email campaigns with A/B testing", progress: 30, status: "pending" as const, team: ["ED", "SJ", "LP", "TA"], dueDate: "Jun 10", tasks: { done: 9, total: 30 } },
  { id: 5, name: "Analytics Dashboard", description: "Real-time reporting and data visualization", progress: 100, status: "completed" as const, team: ["LP", "MC"], dueDate: "Mar 15", tasks: { done: 20, total: 20 } },
  { id: 6, name: "API Gateway", description: "Centralized API management and rate limiting", progress: 60, status: "in-progress" as const, team: ["MC", "JW", "TA"], dueDate: "Apr 20", tasks: { done: 15, total: 25 } },
];

const activityLog = [
  { text: "Lisa pushed 3 commits to CRM Platform v2.0", time: "10 min ago" },
  { text: "Mike resolved 2 issues in API Gateway", time: "1 hour ago" },
  { text: "AI Chatbot Integration passed QA review", time: "3 hours ago" },
  { text: "Email Marketing Suite kickoff meeting scheduled", time: "Yesterday" },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">{projects.length} projects in total</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5 shadow-card card-hover">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              {/* Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{p.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {p.team.slice(0, 3).map((a) => (
                      <div key={a} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[10px] font-semibold text-primary">{a}</div>
                    ))}
                    {p.team.length > 3 && <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">+{p.team.length - 3}</div>}
                  </div>
                  <span className="text-xs text-muted-foreground">{p.tasks.done}/{p.tasks.total} tasks</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> {p.dueDate}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Logs */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card h-fit">
          <h3 className="font-display font-semibold text-foreground mb-4">Activity Log</h3>
          <div className="space-y-0">
            {activityLog.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
