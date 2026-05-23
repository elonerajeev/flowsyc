import { createLogger, format, transports } from "winston";
import { getIO } from "../socket";

type LogSocketEntry = {
  level: string;
  message: string;
  timestamp: string;
};

const LOG_BATCH_INTERVAL_MS = 120;
const LOG_BATCH_MAX = 200;
let pendingSocketLogs: LogSocketEntry[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function flushSocketLogs() {
  flushTimer = null;
  if (pendingSocketLogs.length === 0) return;

  const io = getIO();
  if (!io) {
    pendingSocketLogs = [];
    return;
  }

  const batch = pendingSocketLogs;
  pendingSocketLogs = [];
  io.to("devops:ops").emit("devops:log-batch", batch);
}

function enqueueSocketLog(entry: LogSocketEntry) {
  pendingSocketLogs.push(entry);
  if (pendingSocketLogs.length > LOG_BATCH_MAX) {
    pendingSocketLogs = pendingSocketLogs.slice(-LOG_BATCH_MAX);
  }

  if (!flushTimer) {
    flushTimer = setTimeout(flushSocketLogs, LOG_BATCH_INTERVAL_MS);
    flushTimer.unref?.();
  }
}

// Emit log entries to Socket.IO without a custom transport
const socketEmit = format((info) => {
  try {
    enqueueSocketLog({
      level: info.level,
      message: info.message as string,
      timestamp: (info.timestamp as string) ?? new Date().toISOString(),
    });
  } catch { /* never block logging */ }
  return info;
});

const jsonFormat = format.printf(({ level, message, timestamp, ...meta }) => {
  const entry = {
    timestamp,
    level,
    message,
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
  };
  return JSON.stringify(entry);
});

export const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    socketEmit(),
    jsonFormat,
  ),
  transports: [new transports.Console()],
});
