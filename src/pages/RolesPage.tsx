import { Shield, Eye, Edit, Trash2, Users, ClipboardList, FolderKanban, UserCheck, Settings, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const roles = [
  {
    name: "Admin",
    description: "Full access to all features and settings",
    color: "bg-accent/10 text-accent border-accent/20",
    members: 2,
    permissions: {
      Dashboard: ["view", "edit"],
      "Team Management": ["view", "edit", "delete"],
      "Client Management": ["view", "edit", "delete"],
      "Task Management": ["view", "edit", "delete"],
      "Project Management": ["view", "edit", "delete"],
      Hiring: ["view", "edit", "delete"],
      Settings: ["view", "edit"],
    },
  },
  {
    name: "Manager",
    description: "Manage team, clients, and tasks",
    color: "bg-info/10 text-info border-info/20",
    members: 3,
    permissions: {
      Dashboard: ["view"],
      "Team Management": ["view", "edit"],
      "Client Management": ["view", "edit"],
      "Task Management": ["view", "edit"],
      "Project Management": ["view"],
      Hiring: ["view"],
      Settings: [],
    },
  },
  {
    name: "Employee",
    description: "View assigned tasks and projects only",
    color: "bg-muted text-muted-foreground border-border",
    members: 4,
    permissions: {
      Dashboard: ["view"],
      "Team Management": [],
      "Client Management": ["view"],
      "Task Management": ["view"],
      "Project Management": ["view"],
      Hiring: [],
      Settings: [],
    },
  },
];

const permIcons: Record<string, any> = {
  Dashboard: BarChart3,
  "Team Management": Users,
  "Client Management": UserCheck,
  "Task Management": ClipboardList,
  "Project Management": FolderKanban,
  Hiring: Users,
  Settings: Settings,
};

function PermBadge({ has }: { has: boolean }) {
  return (
    <div className={cn("flex h-6 w-6 items-center justify-center rounded", has ? "bg-success/10 text-success" : "bg-muted text-muted-foreground/30")}>
      {has ? "✓" : "—"}
    </div>
  );
}

export default function RolesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Roles & Access Control</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure role-based permissions for your team</p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((r) => (
          <div key={r.name} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", r.color)}>
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">{r.name}</h3>
                <p className="text-xs text-muted-foreground">{r.members} members</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{r.description}</p>
          </div>
        ))}
      </div>

      {/* Permissions matrix */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Permissions Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Module</th>
                {roles.map((r) => (
                  <th key={r.name} className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider" colSpan={3}>
                    {r.name}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border bg-secondary/30">
                <th />
                {roles.map((r) => (
                  <>
                    <th key={`${r.name}-v`} className="px-2 py-2 text-center"><Eye className="h-3 w-3 mx-auto text-muted-foreground" /></th>
                    <th key={`${r.name}-e`} className="px-2 py-2 text-center"><Edit className="h-3 w-3 mx-auto text-muted-foreground" /></th>
                    <th key={`${r.name}-d`} className="px-2 py-2 text-center"><Trash2 className="h-3 w-3 mx-auto text-muted-foreground" /></th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(roles[0].permissions).map((module) => {
                const ModuleIcon = permIcons[module] || Shield;
                return (
                  <tr key={module} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <ModuleIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{module}</span>
                      </div>
                    </td>
                    {roles.map((r) => {
                      const perms = r.permissions[module as keyof typeof r.permissions];
                      return (
                        <>
                          <td key={`${r.name}-${module}-v`} className="px-2 py-3 text-center"><PermBadge has={perms.includes("view")} /></td>
                          <td key={`${r.name}-${module}-e`} className="px-2 py-3 text-center"><PermBadge has={perms.includes("edit")} /></td>
                          <td key={`${r.name}-${module}-d`} className="px-2 py-3 text-center"><PermBadge has={perms.includes("delete")} /></td>
                        </>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
