import { createLogger, format, transports } from "winston";
import { getIO } from "../socket";

// Emit log entries to Socket.IO without a custom transport
const socketEmit = format((info) => {
  try {
    const io = getIO();
    if (io) {
      io.emit("devops:log", {
        level: info.level,
        message: info.message as string,
        timestamp: (info.timestamp as string) ?? new Date().toISOString(),
      });
    }
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
