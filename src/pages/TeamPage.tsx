import { useState } from "react";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Shield } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

const teamData = [
  { id: 1, name: "Sarah Johnson", email: "sarah@crmpro.com", role: "Admin", status: "active" as const, avatar: "SJ", department: "Sales" },
  { id: 2, name: "Mike Chen", email: "mike@crmpro.com", role: "Manager", status: "active" as const, avatar: "MC", department: "Engineering" },
  { id: 3, name: "Emily Davis", email: "emily@crmpro.com", role: "Employee", status: "active" as const, avatar: "ED", department: "Marketing" },
  { id: 4, name: "James Wilson", email: "james@crmpro.com", role: "Manager", status: "pending" as const, avatar: "JW", department: "Support" },
  { id: 5, name: "Lisa Park", email: "lisa@crmpro.com", role: "Employee", status: "active" as const, avatar: "LP", department: "Design" },
  { id: 6, name: "Tom Anderson", email: "tom@crmpro.com", role: "Employee", status: "pending" as const, avatar: "TA", department: "Sales" },
];

const roleColors: Record<string, string> = {
  Admin: "bg-accent/10 text-accent border-accent/20",
  Manager: "bg-info/10 text-info border-info/20",
  Employee: "bg-muted text-muted-foreground border-border",
};

export default function TeamPage() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = teamData.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Team Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{teamData.length} team members</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Member
        </button>
      </div>

      {/* Search & Filters */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text" placeholder="Search team members..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-sm text-primary">
                        {m.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", roleColors[m.role])}>
                      <Shield className="h-3 w-3" /> {m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{m.department}</td>
                  <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"><Edit className="h-4 w-4" /></button>
                      <button className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold text-foreground mb-4">Add Team Member</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
                <input className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary" placeholder="Enter name" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                <input className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary" placeholder="Enter email" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Role</label>
                <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary">
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Employee</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Department</label>
                <input className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary" placeholder="Enter department" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 h-10 rounded-lg border border-border bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
                <button onClick={() => setShowModal(false)} className="flex-1 h-10 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Add Member</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
