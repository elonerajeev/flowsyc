import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./config/prisma";
import { logger } from "./utils/logger";
import { initializeIO, getIO } from "./socket";
import http from "http";
import { startAutomationCron, stopAutomationCron } from "./services/automation-engine";
import { startInboxScheduler, stopInboxScheduler } from "./services/inbox-scheduler.service";
import { purgeOldAuditLogs } from "./utils/audit";
import { monitoringService } from "./services/monitoring.service";
import cron from "node-cron";

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
});

process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught exception", { err: err.message, stack: err.stack });
  process.exit(1);
});

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.io
initializeIO(server);

async function start() {
  await prisma.$connect();
  purgeOldAuditLogs().catch(() => {}); // one-time cleanup on startup
  server.listen(env.PORT, () => {
    logger.info("Backend listening", {
      url: `http://localhost:${env.PORT}`,
      port: env.PORT,
      env: env.NODE_ENV,
    });
  });

  // Start automation cron job
  startAutomationCron();
  logger.info("Automation engine started");

  // Health checker — runs every 30s
  const healthCron = cron.schedule("*/30 * * * * *", () => {
    monitoringService.runAllChecks().catch((err) => logger.error("Health check cron error", { err }));
  });
  logger.info("Health checker started (30s interval)");

  // Start IMAP inbox background sync
  if (env.NODE_ENV !== "test") {
    startInboxScheduler();
  }

  async function gracefulShutdown(signal: string) {
    logger.info(`${signal} received, shutting down gracefully...`);
    
    // Stop automation cron
    stopAutomationCron();
    stopInboxScheduler();
    healthCron.stop();
    
    server.close(async () => {
      await prisma.$disconnect();
      logger.info("Prisma disconnected, process exiting.");
      process.exit(0);
    });
    setTimeout(() => {
      logger.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10000);
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  
  // Handle unhandled rejections
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason });
  });
  
  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err });
    process.exit(1);
  });
}

start().catch(async (error: unknown) => {
  logger.error("Failed to start backend", { error: error instanceof Error ? error : new Error(String(error)) });
  await prisma.$disconnect();
  process.exit(1);
});
