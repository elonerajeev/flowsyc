import { motion } from "framer-motion";
import { FileText, Download, Calendar, BarChart3, Users, DollarSign } from "lucide-react";

const reports = [
  { title: "Monthly Revenue Report", description: "Complete breakdown of revenue by source and client", date: "Mar 2026", type: "Financial", emoji: "💰", color: "from-success/20 to-success/5" },
  { title: "Team Performance Q1", description: "Quarterly team metrics and KPI analysis", date: "Q1 2026", type: "HR", emoji: "📊", color: "from-primary/20 to-primary/5" },
  { title: "Client Acquisition Report", description: "New client trends and conversion funnel", date: "Mar 2026", type: "Sales", emoji: "🎯", color: "from-accent/20 to-accent/5" },
  { title: "Project Status Overview", description: "All active projects progress and blockers", date: "Mar 2026", type: "Operations", emoji: "🚀", color: "from-info/20 to-info/5" },
  { title: "Hiring Pipeline Report", description: "Candidate status and recruitment metrics", date: "Mar 2026", type: "HR", emoji: "👥", color: "from-warning/20 to-warning/5" },
  { title: "Customer Satisfaction", description: "NPS scores and feedback analysis", date: "Feb 2026", type: "Support", emoji: "⭐", color: "from-primary/20 to-primary/5" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function ReportsPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">Reports 📑</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate and download business reports</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.title} className={`rounded-2xl border border-border bg-gradient-to-br ${r.color} p-6 shadow-card card-hover`}>
            <div className="flex items-start justify-between mb-4">
              <span className="text-3xl">{r.emoji}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-card/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-muted-foreground border border-border/50">{r.type}</span>
            </div>
            <h3 className="font-display font-semibold text-foreground mb-1">{r.title}</h3>
            <p className="text-xs text-muted-foreground mb-4">{r.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {r.date}</span>
              <button className="flex items-center gap-1.5 rounded-lg bg-card/80 border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card transition-colors">
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
