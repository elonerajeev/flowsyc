import { useMemo, useState } from "react";
import { ArrowUpRight, Calendar, FolderKanban, Gauge, GripVertical, Pin, Wallet } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useTheme } from "@/contexts/ThemeContext";
import { useProjects } from "@/hooks/use-crm-data";
import { useListPreferences } from "@/hooks/use-list-preferences";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { role } = useTheme();
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const { orderedItems: preferredProjects, pinnedIds, togglePin, move } = useListPreferences(
    `crm-projects-preferences-${role}`,
    projects,
    (project) => String(project.id),
  );

  const summary = useMemo(() => {
    return {
      active: projects.filter((project) => project.status === "active" || project.status === "in-progress").length,
      launchReady: projects.filter((project) => project.stage === "Launch").length,
      averageProgress: projects.length
        ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
        : 0,
      budgetTracked: projects.length ? `${projects.length} portfolios` : "0 portfolios",
    };
  }, [projects]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,hsl(var(--card)_/_0.98),hsl(var(--card)_/_0.84))] p-8 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/45 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <FolderKanban className="h-3.5 w-3.5 text-primary" />
            Program Delivery
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Delivery portfolio with stage clarity and budget context.</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Projects can now be pinned and reordered by preference, which gives you a practical frontend model for portfolio prioritization later.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active Programs", value: String(summary.active), icon: FolderKanban },
            { label: "Launch Ready", value: String(summary.launchReady), icon: ArrowUpRight },
            { label: "Average Progress", value: `${summary.averageProgress}%`, icon: Gauge },
            { label: "Budget Coverage", value: summary.budgetTracked, icon: Wallet },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-border/70 bg-secondary/28 p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {preferredProjects.map((project) => (
            <article
              key={project.id}
              draggable
              onDragStart={() => setDraggedProjectId(String(project.id))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedProjectId) move(draggedProjectId, String(project.id));
                setDraggedProjectId(null);
              }}
              onDragEnd={() => setDraggedProjectId(null)}
              className="rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)_/_0.98),hsl(var(--card)_/_0.84))] p-5 shadow-card"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => togglePin(String(project.id))}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                      pinnedIds.includes(String(project.id))
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/70 bg-secondary/25 text-muted-foreground hover:text-foreground",
                    )}
                    aria-label="Pin project"
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(String(project.id), preferredProjects[Math.max(0, preferredProjects.indexOf(project) - 1)]?.id?.toString() ?? String(project.id))}
                    className="rounded-lg border border-border/70 bg-secondary/25 p-1 text-muted-foreground transition hover:text-foreground"
                    aria-label="Move project"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-foreground">{project.name}</h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
                    {pinnedIds.includes(String(project.id)) && (
                      <span className="mt-2 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                        Pinned
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={project.status} />
              </div>
              <div className="mb-4 h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-[linear-gradient(90deg,#5483B3,#7DA0CA,#C1E8FF)]" style={{ width: `${project.progress}%` }} />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Stage</p>
                  <p className="mt-1 font-semibold text-foreground">{project.stage}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Budget</p>
                  <p className="mt-1 font-semibold text-foreground">{project.budget}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tasks complete</p>
                  <p className="mt-1 font-semibold text-foreground">{project.tasks.done}/{project.tasks.total}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Target date</p>
                  <p className="mt-1 flex items-center gap-2 font-semibold text-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    {project.dueDate}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <aside className="rounded-[1.75rem] border border-border/70 bg-card/88 p-5 shadow-card backdrop-blur-xl">
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Portfolio Notes</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">What improves later with backend</h2>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Project stage and status are already separated so delivery logic does not depend on visual labels.</p>
            <p>Budget fields are isolated for future finance integrations and margin reporting.</p>
            <p>Task completion objects can expand directly into milestone APIs without redesigning these cards.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
