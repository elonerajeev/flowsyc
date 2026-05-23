import { useState } from "react";
import { ChevronRight, TrendingUp } from "lucide-react";
import { crmLeads } from "./DashboardData";

const stages = ["Qualified", "Proposal", "Negotiation", "Won", "Lost"];
const stageColors: Record<string, string> = {
  Qualified: "#5355D6", Proposal: "#F0A030", Negotiation: "#7B7FFF", Won: "#2A8F7A", Lost: "#DC3545",
};

export default function CRMTab() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Pipeline kanban header */}
      <div className="grid grid-cols-5 gap-2">
        {stages.map((stage) => {
          const count = crmLeads.filter((l) => l.stage === stage).length;
          return (
            <div key={stage} className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-center">
              <div className="mb-1 h-1 w-full rounded-full" style={{ backgroundColor: `${stageColors[stage]}40` }}>
                <div className="h-full rounded-full" style={{ backgroundColor: stageColors[stage], width: `${count * 20}%` }} />
              </div>
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: stageColors[stage] }}>{stage}</p>
              <p className="text-xs font-bold text-foreground">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Leads table */}
      <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
        <div className="grid grid-cols-5 border-b border-border/50 px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          <span className="col-span-2">Company</span>
          <span>Stage</span>
          <span>Value</span>
          <span>Probability</span>
        </div>
        {crmLeads.map((lead, i) => (
          <div
            key={lead.name}
            onClick={() => setSelected(selected === i ? null : i)}
            className={`grid cursor-pointer grid-cols-5 items-center border-b border-border/30 px-4 py-3 transition-all last:border-0 hover:bg-muted/50 ${selected === i ? "bg-muted/60" : ""}`}
          >
            <div className="col-span-2 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-foreground" style={{ backgroundColor: `${lead.color}20` }}>
                {lead.name[0]}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground/80">{lead.name}</p>
                <p className="text-[10px] text-muted-foreground">{lead.contact}</p>
              </div>
            </div>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold w-fit" style={{ backgroundColor: `${stageColors[lead.stage]}15`, color: stageColors[lead.stage] }}>
              {lead.stage}
            </span>
            <span className="text-xs font-semibold text-foreground/70">{lead.value}</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted-foreground/10">
                <div className="h-full rounded-full transition-all" style={{ width: `${lead.prob}%`, backgroundColor: lead.color }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{lead.prob}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
        <TrendingUp className="h-4 w-4 text-[#5355D6]" />
        <div className="flex gap-6 text-[11px]">
          <span className="text-muted-foreground">Total Pipeline: <span className="font-bold text-foreground">$310,000</span></span>
          <span className="text-muted-foreground">Avg. Deal: <span className="font-bold text-foreground">$62,000</span></span>
          <span className="text-muted-foreground">Win Rate: <span className="font-bold text-[#2A8F7A]">40%</span></span>
        </div>
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40" />
      </div>
    </div>
  );
}
