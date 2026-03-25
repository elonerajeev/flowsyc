import { useState } from "react";
import { Building2, ClipboardList, CreditCard, FolderKanban, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const workflows = [
  {
    id: "client",
    title: "New Client",
    description: "Create an account shell with owner, segment, and next action.",
    icon: Building2,
    accent: "from-primary/18 via-primary/8 to-transparent",
  },
  {
    id: "project",
    title: "New Project",
    description: "Open a delivery track, assign budget, and map milestones.",
    icon: FolderKanban,
    accent: "from-accent/18 via-accent/8 to-transparent",
  },
  {
    id: "task",
    title: "New Task",
    description: "Create an execution task with priority, owner, and due date.",
    icon: ClipboardList,
    accent: "from-info/18 via-info/10 to-transparent",
  },
  {
    id: "invoice",
    title: "Invoice Draft",
    description: "Generate a finance-ready invoice draft for review.",
    icon: CreditCard,
    accent: "from-success/18 via-success/10 to-transparent",
  },
];

export default function QuickCreateDialog() {
  const { quickCreateOpen, closeQuickCreate, canUseQuickCreate } = useWorkspace();
  const [selected, setSelected] = useState(workflows[0].id);

  if (!canUseQuickCreate) {
    return null;
  }

  return (
    <Dialog open={quickCreateOpen} onOpenChange={(open) => (open ? undefined : closeQuickCreate())}>
      <DialogContent className="m-4 w-[min(96vw,72rem)] max-w-none overflow-hidden rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)_/_0.98),hsl(var(--card)_/_0.9))] p-0 shadow-[0_40px_100px_hsl(218_80%_6%_/_0.34)]">
        <div className="grid max-h-[calc(100dvh-2rem)] overflow-hidden lg:grid-cols-[0.92fr_1.08fr]">
          <div className="border-b border-border/70 bg-[linear-gradient(180deg,hsl(var(--sidebar-bg)_/_0.96),hsl(var(--secondary)_/_0.9))] p-6 lg:border-b-0 lg:border-r lg:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-info via-accent to-primary shadow-[0_20px_40px_hsl(218_80%_8%_/_0.22)]">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-foreground">Quick Create</p>
                <p className="text-sm text-muted-foreground">Launch CRM work without leaving context.</p>
              </div>
            </div>
            <div className="space-y-2.5 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-9rem)]">
              {workflows.map((workflow) => {
                const Icon = workflow.icon;
                const isSelected = workflow.id === selected;

                return (
                  <button
                    key={workflow.id}
                    type="button"
                    onClick={() => setSelected(workflow.id)}
                    className={`w-full rounded-[1.25rem] border px-4 py-4 text-left transition-all ${
                      isSelected
                        ? "border-primary/20 bg-primary/[0.06] shadow-[0_20px_40px_hsl(218_80%_5%_/_0.12)]"
                        : "border-border/70 bg-background/35 hover:bg-background/55"
                    }`}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/60 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-display text-base font-semibold text-foreground">{workflow.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{workflow.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex min-h-0 flex-col p-6 lg:p-7">
            <DialogHeader className="mb-6 text-left">
              <DialogTitle className="font-display text-2xl font-semibold text-foreground">
                {workflows.find((workflow) => workflow.id === selected)?.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Structured like a real workflow now, easy to connect to backend mutations later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2 lg:flex-1 lg:content-start lg:overflow-y-auto lg:pr-1">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Name</span>
                <input className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="High-value account, project, or task title" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Owner</span>
                <input className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Assign an owner" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Priority / Tier</span>
                <input className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Enterprise, critical, or strategic" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Target Date</span>
                <input className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Select a due date or launch date" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-foreground">Summary</span>
                <textarea className="min-h-24 w-full rounded-[1.25rem] border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Capture the commercial context, expected outcome, and next action." />
              </label>
            </div>
            <div className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Prepared for future backend integration</p>
                <p className="text-xs text-muted-foreground">These fields mirror a clean request payload shape for future API mutations.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeQuickCreate}
                  className="rounded-2xl border border-border/70 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-105"
                >
                  Create Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
