import { motion } from "framer-motion";
import { CreditCard, Download, Search, Filter, ArrowUpRight, Plus } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const invoices = [
  { id: "INV-1024", client: "Acme Corp", amount: "$12,400", date: "Mar 20, 2026", due: "Apr 20, 2026", status: "pending" as const, emoji: "🏢" },
  { id: "INV-1023", client: "GlobalTech", amount: "$8,200", date: "Mar 15, 2026", due: "Apr 15, 2026", status: "completed" as const, emoji: "🌐" },
  { id: "INV-1022", client: "StartUp Labs", amount: "$3,500", date: "Mar 10, 2026", due: "Apr 10, 2026", status: "active" as const, emoji: "🚀" },
  { id: "INV-1021", client: "Digital Wave", amount: "$6,800", date: "Mar 5, 2026", due: "Apr 5, 2026", status: "completed" as const, emoji: "🌊" },
  { id: "INV-1020", client: "CloudNine", amount: "$15,200", date: "Feb 28, 2026", due: "Mar 28, 2026", status: "rejected" as const, emoji: "☁️" },
  { id: "INV-1019", client: "MetaVerse", amount: "$22,000", date: "Feb 20, 2026", due: "Mar 20, 2026", status: "completed" as const, emoji: "🎮" },
];

const summary = [
  { label: "Total Revenue", value: "$68,100", emoji: "💰", change: "+12%" },
  { label: "Pending", value: "$15,900", emoji: "⏳", change: "3 invoices" },
  { label: "Overdue", value: "$15,200", emoji: "⚠️", change: "1 invoice" },
  { label: "Paid This Month", value: "$37,000", emoji: "✅", change: "+8%" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function InvoicesPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">Invoices 💳</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage billing and payments</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New Invoice
        </button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-card card-hover">
            <span className="text-2xl">{s.emoji}</span>
            <p className="text-2xl font-display font-bold text-foreground mt-2">{s.value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <span className="text-[10px] font-medium text-success">{s.change}</span>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div variants={item} className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-card overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search invoices..." className="h-9 w-full rounded-lg border border-input bg-secondary/40 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          </div>
          <button className="flex items-center gap-1.5 h-9 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-secondary transition-colors"><Filter className="h-3.5 w-3.5" /> Filter</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4 text-sm font-mono font-medium text-primary">{inv.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{inv.emoji}</span>
                    <span className="text-sm text-foreground">{inv.client}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-display font-semibold text-foreground">{inv.amount}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{inv.date}</td>
                <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                <td className="px-6 py-4 text-right">
                  <button className="text-xs text-primary hover:underline flex items-center gap-1 ml-auto"><Download className="h-3 w-3" /> PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
