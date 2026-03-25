import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Command, Rocket, Settings2, Sparkles } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandActions } from "@/hooks/use-crm-data";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const iconBySection = {
  Navigate: ArrowUpRight,
  Actions: Sparkles,
};

export default function CommandPalette() {
  const navigate = useNavigate();
  const { commandOpen, closeCommandPalette, openQuickCreate, canUseQuickCreate } = useWorkspace();
  const { data = [] } = useCommandActions();

  const actions = useMemo(
    () => data.filter((item) => canUseQuickCreate || item.intent !== "open-quick-create"),
    [canUseQuickCreate, data],
  );

  const grouped = useMemo(() => {
    return actions.reduce<Record<string, typeof actions>>((acc, item) => {
      acc[item.section] = [...(acc[item.section] ?? []), item];
      return acc;
    }, {});
  }, [actions]);

  const handleSelect = (value: string) => {
    const item = actions.find((entry) => entry.id === value);
    if (!item) return;

    closeCommandPalette();

    if (item.intent === "open-quick-create") {
      openQuickCreate();
      return;
    }

    if (item.route) {
      navigate(item.route);
    }
  };

  return (
    <CommandDialog open={commandOpen} onOpenChange={(open) => (open ? undefined : closeCommandPalette())}>
      <div className="border-b border-white/10 bg-[linear-gradient(180deg,hsl(var(--card)_/_0.96),hsl(var(--card)_/_0.84))] px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-accent to-info shadow-[0_18px_44px_hsl(218_80%_8%_/_0.22)]">
            <Rocket className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">Command Center</p>
            <p className="text-sm text-muted-foreground">Navigate the CRM, trigger quick actions, and keep velocity high.</p>
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-border/70 bg-background/60">
          <CommandInput placeholder="Search pages, workflows, and quick actions..." />
        </div>
      </div>
      <CommandList className="max-h-[420px] bg-[linear-gradient(180deg,hsl(var(--card)_/_0.9),hsl(var(--card)_/_0.82))] p-3">
        <CommandEmpty>No matching workspace actions.</CommandEmpty>
        {Object.entries(grouped).map(([section, items]) => {
          const SectionIcon = iconBySection[section as keyof typeof iconBySection] ?? Settings2;

          return (
            <CommandGroup
              key={section}
              heading={section}
              className="rounded-[1.25rem] border border-border/60 bg-card/45 p-2"
            >
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={handleSelect}
                  className="rounded-xl px-3 py-3 data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground"
                >
                  <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-primary">
                    <SectionIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  {item.shortcut ? (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  ) : (
                    <div className="text-muted-foreground">
                      <Command className="h-3.5 w-3.5" />
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
