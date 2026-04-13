import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { useAuth } from "@/contexts/AuthContext";
import { appEnv, isProduction } from "@/lib/env";
import { reportError } from "@/lib/logger";

type RealtimeStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

type RealtimeContextValue = {
  status: RealtimeStatus;
  isConnected: boolean;
  socket: Socket | null;
  joinProjectRoom: (projectId: number) => void;
  joinTaskRoom: (taskId: number) => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function resolveSocketUrl() {
  if (typeof window === "undefined") return null;
  if (!appEnv.useRemoteApi) return null;

  const explicit = appEnv.socketUrl.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const apiBaseUrl = appEnv.apiBaseUrl.trim();
  if (!apiBaseUrl) return null;

  if (!apiBaseUrl.startsWith("http")) {
    return window.location.origin;
  }

  return apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>("idle");

  useEffect(() => {
    const socketUrl = resolveSocketUrl();

    if (!socketUrl || !user?.id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setStatus("idle");
      return;
    }

    setStatus("connecting");

    const socket = io(socketUrl, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: {
        userId: user.id,
      },
    });

    const handleConnect = () => {
      setStatus("connected");
      socket.emit("join", user.id);
    };

    const handleDisconnect = () => {
      setStatus("disconnected");
    };

    const handleConnectError = (error: Error) => {
      setStatus("error");
      reportError("Realtime socket connection failed", error);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    socketRef.current = socket;

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [user?.id]);

  const value = useMemo<RealtimeContextValue>(() => ({
    status,
    isConnected: status === "connected",
    socket: socketRef.current,
    joinProjectRoom: (projectId: number) => {
      if (!Number.isInteger(projectId) || projectId <= 0) return;
      socketRef.current?.emit("joinProject", projectId);
    },
    joinTaskRoom: (taskId: number) => {
      if (!Number.isInteger(taskId) || taskId <= 0) return;
      socketRef.current?.emit("joinTask", taskId);
    },
  }), [status]);

  useEffect(() => {
    if (!isProduction && status === "connected") {
      reportError("Realtime socket connected");
    }
  }, [status]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return context;
}
