import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { triggerHaptic } from "@/lib/micro-interactions";
import { readStoredString, writeStoredString } from "@/lib/preferences";
import { crmService } from "@/services/crm";

export type WorkspaceContextValue = {
  commandOpen: boolean;
  quickCreateOpen: boolean;
  workflowToOpen: string | null;
  canUseQuickCreate: boolean;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openQuickCreate: (workflowId?: string, data?: Record<string, unknown>) => void;
  closeQuickCreate: () => void;
  editData: Record<string, unknown> | null;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { role } = useTheme();
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [workflowToOpen, setWorkflowToOpen] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null);
  // Persist privacy mode in localStorage + backend preferences
  const [privacyMode, setPrivacyMode] = useState(() => readStoredString("crm-privacy-mode", "false") === "true");

  const canUseQuickCreate = role === "admin" || role === "manager";

  // Sync privacy mode from backend on mount
  useEffect(() => {
    if (typeof crmService.getPreferences !== 'function') return;
    crmService.getPreferences().then(({ data }) => {
      if (data["crm-privacy-mode"] !== undefined) {
        const val = data["crm-privacy-mode"] === "true" || data["crm-privacy-mode"] === true;
        setPrivacyMode(val);
        writeStoredString("crm-privacy-mode", String(val));
      }
    }).catch(() => {});
  }, []);

  const togglePrivacyMode = useCallback(() => {
    setPrivacyMode(v => {
      const next = !v;
      writeStoredString("crm-privacy-mode", String(next));
      // Persist to backend — org-wide for admin, personal for others
      crmService.updatePreferences({ "crm-privacy-mode": String(next) }).catch(() => {});
      triggerHaptic("medium");
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const isCommandPalette = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const isQuickCreate = event.shiftKey && event.key.toLowerCase() === "n";

      if (isCommandPalette) {
        event.preventDefault();
        setCommandOpen((current) => !current);
        triggerHaptic("selection");
      }

      if (isQuickCreate && canUseQuickCreate) {
        event.preventDefault();
        setWorkflowToOpen(null);
        setEditData(null);
        setQuickCreateOpen(true);
        triggerHaptic("medium");
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [canUseQuickCreate]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    commandOpen,
    quickCreateOpen,
    workflowToOpen,
    canUseQuickCreate,
    privacyMode,
    editData,
    togglePrivacyMode,
    openCommandPalette: () => {
      setCommandOpen(true);
      triggerHaptic("selection");
    },
    closeCommandPalette: () => setCommandOpen(false),
    openQuickCreate: (workflowId?: string, data?: Record<string, unknown>) => {
      if (canUseQuickCreate) {
        setWorkflowToOpen(workflowId || null);
        setEditData(data || null);
        setQuickCreateOpen(true);
        triggerHaptic("medium");
      }
    },
    closeQuickCreate: () => {
      setQuickCreateOpen(false);
      setWorkflowToOpen(null);
      setEditData(null);
    },
  }), [
    commandOpen, 
    quickCreateOpen, 
    workflowToOpen, 
    canUseQuickCreate, 
    privacyMode,
    editData
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
