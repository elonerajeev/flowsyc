import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { triggerHaptic } from "@/lib/micro-interactions";

export type WorkspaceContextValue = {
  commandOpen: boolean;
  quickCreateOpen: boolean;
  workflowToOpen: string | null;
  canUseQuickCreate: boolean;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openQuickCreate: (workflowId?: string, data?: any) => void;
  closeQuickCreate: () => void;
  editData: any | null;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { role } = useTheme();
  const [commandOpen, setCommandOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [workflowToOpen, setWorkflowToOpen] = useState<string | null>(null);
  const [editData, setEditData] = useState<any | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  
  const canUseQuickCreate = role === "admin" || role === "manager";
  const togglePrivacyMode = () => setPrivacyMode(v => !v);

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
    openQuickCreate: (workflowId?: string, data?: any) => {
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
