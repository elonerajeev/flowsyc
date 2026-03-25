import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { motion } from "framer-motion";

import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useInvoices } from "@/hooks/use-crm-data";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function InvoicesPage() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const [query, setQuery] = useState("");

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.id.toLowerCase().includes(query.toLowerCase()) ||
          invoice.client.toLowerCase().includes(query.toLowerCase()),
      ),
    [invoices, query],
  );

  const summary = useMemo(() => {
    const completed = invoices.filter((invoice) => invoice.status === "completed").length;
    const pending = invoices.filter((invoice) => invoice.status === "pending").length;
    const rejected = invoices.filter((invoice) => invoice.status === "rejected").length;
    return { total: invoices.length, completed, pending, rejected };
  }, [invoices]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className="rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,hsl(var(--card)_/_0.98),hsl(var(--card)_/_0.84))] p-8 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <h1 className="font-display text-3xl font-semibold text-foreground">Finance operations with cleaner visibility.</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Billing is structured to become a real frontend shell for finance APIs later, with searchable invoice rows and status-safe presentation now.
            </p>
          </div>
          {canUseQuickCreate ? (
            <button
              type="button"
              onClick={openQuickCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" />
              Invoice Draft
            </button>
          ) : (
            <div className="inline-flex items-center rounded-2xl border border-border/70 bg-secondary/30 px-5 py-3 text-sm font-semibold text-muted-foreground">
              Read only
            </div>
          )}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total invoices", value: String(summary.total) },
            { label: "Paid", value: String(summary.completed) },
            { label: "Pending", value: String(summary.pending) },
            { label: "Rejected", value: String(summary.rejected) },
          ].map((card) => (
            <div key={card.label} className="rounded-[1.5rem] border border-border/70 bg-secondary/28 p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold text-foreground">{card.value}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section variants={item} className="rounded-[1.75rem] border border-border/70 bg-card/88 shadow-card backdrop-blur-xl">
        <div className="border-b border-border/70 p-5">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by invoice or client"
              className="h-12 w-full rounded-2xl border border-border/70 bg-background/55 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-secondary/24">
              <tr>
                {["Invoice", "Client", "Amount", "Issued", "Due", "Status", "Action"].map((heading) => (
                  <th key={heading} className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-border/70 transition hover:bg-secondary/18">
                  <td className="px-6 py-4 text-sm font-semibold text-primary">{invoice.id}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{invoice.client}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-foreground">{invoice.amount}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{invoice.date}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{invoice.due}</td>
                  <td className="px-6 py-4"><StatusBadge status={invoice.status} /></td>
                  <td className="px-6 py-4">
                    <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary">
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </motion.div>
  );
}
