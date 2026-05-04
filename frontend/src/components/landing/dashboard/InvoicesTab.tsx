import { invoices } from "./DashboardData";
import { DollarSign } from "lucide-react";

export default function InvoicesTab() {
  const total = 67250;
  const paid = 17600;
  const pending = 8750;
  const overdue = 22000;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Billed", value: "$67.2k", color: "#5355D6" },
          { label: "Paid", value: "$17.6k", color: "#2A8F7A" },
          { label: "Pending", value: "$8.7k", color: "#F0A030" },
          { label: "Overdue", value: "$22k", color: "#DC3545" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-0.5 text-[10px] text-white/35">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Collection bar */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="mb-2 flex items-center justify-between text-[10px] text-white/40">
          <span>Collection Rate</span>
          <span className="font-bold text-white">{Math.round((paid / total) * 100)}%</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-[#2A8F7A]" style={{ width: `${(paid / total) * 100}%` }} />
          <div className="h-full bg-[#F0A030]" style={{ width: `${(pending / total) * 100}%` }} />
          <div className="h-full bg-[#DC3545]" style={{ width: `${(overdue / total) * 100}%` }} />
        </div>
        <div className="mt-2 flex gap-4 text-[9px] text-white/30">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#2A8F7A]" />Paid</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#F0A030]" />Pending</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#DC3545]" />Overdue</span>
        </div>
      </div>

      {/* Invoice list */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="grid grid-cols-5 border-b border-white/5 px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-white/25">
          <span>Invoice</span>
          <span className="col-span-2">Client</span>
          <span>Amount</span>
          <span>Status</span>
        </div>
        {invoices.map((inv) => (
          <div key={inv.id} className="grid grid-cols-5 items-center border-b border-white/[0.03] px-4 py-3 transition-all last:border-0 hover:bg-white/[0.03]">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-white/20" />
              <span className="text-[10px] font-mono text-white/50">{inv.id}</span>
            </div>
            <span className="col-span-2 text-xs font-semibold text-white/70">{inv.client}</span>
            <span className="text-xs font-bold text-white">{inv.amount}</span>
            <span className="w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `${inv.color}15`, color: inv.color }}>
              {inv.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
