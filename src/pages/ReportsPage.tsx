import { motion } from "framer-motion";
import { Download, FileText, Sparkles } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import { useReports } from "@/hooks/use-crm-data";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function ReportsPage() {
  const { data: reports = [], isLoading } = useReports();

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className="rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,hsl(var(--card)_/_0.98),hsl(var(--card)_/_0.84))] p-8 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/45 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Reporting Suite
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Executive-ready report surfaces with cleaner hierarchy.</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Reports are packaged as reusable frontend objects today so download workflows, filters, and backend generation jobs can attach later without reshaping the UI.
          </p>
        </div>
      </motion.section>

      <motion.section variants={item} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <article
            key={report.title}
            className={`rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)_/_0.96),hsl(var(--card)_/_0.86))] p-6 shadow-card`}
          >
            <div className={`mb-6 rounded-[1.5rem] bg-gradient-to-br ${report.gradient} p-5`}>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-card/75 text-primary shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {report.type}
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold text-foreground">{report.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.description}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{report.date}</p>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary">
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
          </article>
        ))}
      </motion.section>
    </motion.div>
  );
}
