import { useState } from "react";
import { Plus, Search, Building2, MapPin, Phone, Mail, ArrowUpRight } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const clients = [
  { id: 1, name: "Acme Corporation", industry: "Technology", manager: "Sarah Johnson", status: "active" as const, revenue: "$45,000", location: "San Francisco, CA", avatar: "AC" },
  { id: 2, name: "GlobalTech Inc", industry: "Finance", manager: "Mike Chen", status: "active" as const, revenue: "$82,000", location: "New York, NY", avatar: "GT" },
  { id: 3, name: "StartUp Labs", industry: "Healthcare", manager: "Emily Davis", status: "pending" as const, revenue: "$12,000", location: "Austin, TX", avatar: "SL" },
  { id: 4, name: "Digital Wave", industry: "Marketing", manager: "James Wilson", status: "active" as const, revenue: "$28,000", location: "Chicago, IL", avatar: "DW" },
  { id: 5, name: "CloudNine Solutions", industry: "Technology", manager: "Lisa Park", status: "pending" as const, revenue: "$55,000", location: "Seattle, WA", avatar: "CS" },
  { id: 6, name: "MetaVerse Corp", industry: "Entertainment", manager: "Sarah Johnson", status: "completed" as const, revenue: "$120,000", location: "Los Angeles, CA", avatar: "MV" },
];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = clients.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.industry.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients.length} total clients</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Client
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-5 shadow-card card-hover">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 font-display font-bold text-primary">{c.avatar}</div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> {c.industry}</p>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="space-y-2 text-xs text-muted-foreground mb-4">
              <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {c.location}</p>
              <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> Managed by {c.manager}</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-lg font-display font-bold text-foreground">{c.revenue}</span>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">View Profile <ArrowUpRight className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
