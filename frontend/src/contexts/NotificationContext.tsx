import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { toast } from "@/components/ui/sonner";
import { triggerHaptic } from "@/lib/micro-interactions";
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";
import { crmService } from "@/services/crm";
import { useRealtime } from "@/contexts/RealtimeContext";

const { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } = crmService;

export type NotificationCategory = "task" | "lead" | "deal" | "client" | "project" | "invoice" | "system" | "collaboration";

export interface WorkspaceNotification {
  id: number;
  title: string;
  description: string;
  category: NotificationCategory;
  createdAt: string;
  unread: boolean;
  count: number;
  batchKey: string;
  linkUrl?: string;
  linkLabel?: string;
  entityType?: string;
  entityId?: number;
}

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  liveUpdates: boolean;
  batching: boolean;
}

interface NotificationStateValue {
  notifications: WorkspaceNotification[];
  unreadCount: number;
  centerOpen: boolean;
  preferences: NotificationPreferences;
}

interface NotificationActionsValue {
  openCenter: () => void;
  closeCenter: () => void;
  toggleCenter: () => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
  setPreference: (key: keyof NotificationPreferences, value: boolean) => void;
  pushNotification: (notification: Omit<WorkspaceNotification, "id" | "createdAt" | "unread" | "count">) => void;
}

const NotificationStateContext = createContext<NotificationStateValue | null>(null);
const NotificationActionsContext = createContext<NotificationActionsValue | null>(null);

const storageKey = "crm-notifications";
const preferenceKey = "crm-notification-preferences";
const centerKey = "crm-notification-center";

const defaultPreferences: NotificationPreferences = {
  inApp: true,
  email: false,
  liveUpdates: true,
  batching: true,
};

function mapBackendToFrontendNotification(n: {
  id: number;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  linkLabel?: string;
  entityType?: string;
  entityId?: number;
  isRead: boolean;
  batchCount: number;
  createdAt: string;
}): WorkspaceNotification {
  return {
    id: n.id,
    title: n.title,
    description: n.message,
    category: (n.type || "system") as NotificationCategory,
    createdAt: n.createdAt,
    unread: !n.isRead,
    count: n.batchCount || 1,
    batchKey: "",
    linkUrl: n.linkUrl,
    linkLabel: n.linkLabel,
    entityType: n.entityType,
    entityId: n.entityId,
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useRealtime();
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    readStoredJSON<NotificationPreferences>(preferenceKey, defaultPreferences)
  );
  const [centerOpen, setCenterOpen] = useState(() => readStoredJSON<boolean>(centerKey, false));
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Fetch initial notifications from API
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    async function fetchNotifications() {
      try {
        const response = await getNotifications({ limit: 50 });
        const mapped = response.data.map(mapBackendToFrontendNotification);
        setNotifications(mapped);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setInitialLoadComplete(true);
      }
    }
    fetchNotifications();
  }, []);

  // Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await getUnreadNotificationCount();
      return response.count;
    } catch {
      return 0;
    }
  }, []);

  // Listen for real-time notifications from Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: {
      type: string;
      title: string;
      message: string;
      linkUrl?: string;
      entityType?: string;
      entityId?: number;
    }) => {
      const newNotification: WorkspaceNotification = {
        id: Date.now(),
        title: data.title,
        description: data.message,
        category: (data.type || "system") as NotificationCategory,
        createdAt: new Date().toISOString(),
        unread: true,
        count: 1,
        batchKey: "",
        linkUrl: data.linkUrl,
        entityType: data.entityType,
        entityId: data.entityId,
      };

      // Add to local state
      setNotifications((current) => [newNotification, ...current].slice(0, 24));

      // Show toast
      if (preferences.inApp) {
        toast(data.title, {
          description: data.message,
          action: {
            label: "View",
            onClick: () => setCenterOpen(true),
          },
        });
      }
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, preferences.inApp]);

  // Persist preferences
  useEffect(() => {
    const handler = setTimeout(() => {
      writeStoredJSON(preferenceKey, preferences);
    }, 1000);
    return () => clearTimeout(handler);
  }, [preferences]);

  // Persist center state
  useEffect(() => {
    const handler = setTimeout(() => {
      writeStoredJSON(centerKey, centerOpen);
    }, 1000);
    return () => clearTimeout(handler);
  }, [centerOpen]);

  const markRead = useCallback(async (id: number) => {
    setNotifications((current) =>
      current.map((notification) => (notification.id === id ? { ...notification, unread: false } : notification))
    );
    triggerHaptic("selection");

    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((notification) => ({ ...notification, unread: false })));
    triggerHaptic("success");

    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, []);

  const setPreference = useCallback((key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    triggerHaptic("selection");
  }, []);

  const pushNotification = useCallback(
    (notification: Omit<WorkspaceNotification, "id" | "createdAt" | "unread" | "count">) => {
      const now = new Date().toISOString();

      setNotifications((current) => [
        {
          id: Date.now(),
          createdAt: now,
          unread: true,
          count: 1,
          ...notification,
        },
        ...current,
      ].slice(0, 24));

      if (preferences.inApp) {
        toast(notification.title, {
          description: notification.description,
        });
      }
    },
    [preferences.inApp]
  );

  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const stateValue = useMemo(
    () => ({
      notifications,
      unreadCount,
      centerOpen,
      preferences,
    }),
    [notifications, unreadCount, centerOpen, preferences]
  );

  const actionsValue = useMemo(
    () => ({
      openCenter: () => setCenterOpen(true),
      closeCenter: () => setCenterOpen(false),
      toggleCenter: () => setCenterOpen((current) => !current),
      markRead,
      markAllRead,
      setPreference,
      pushNotification,
    }),
    [markRead, markAllRead, setPreference, pushNotification]
  );

  return (
    <NotificationStateContext.Provider value={stateValue}>
      <NotificationActionsContext.Provider value={actionsValue}>
        {children}
      </NotificationActionsContext.Provider>
    </NotificationStateContext.Provider>
  );
}

export function useNotificationState() {
  const context = useContext(NotificationStateContext);
  if (!context) throw new Error("useNotificationState must be used within NotificationProvider");
  return context;
}

export function useNotificationActions() {
  const context = useContext(NotificationActionsContext);
  if (!context) throw new Error("useNotificationActions must be used within NotificationProvider");
  return context;
}

/** @deprecated Use useNotificationState or useNotificationActions instead */
export function useNotifications() {
  const state = useNotificationState();
  const actions = useNotificationActions();
  return { ...state, ...actions };
}