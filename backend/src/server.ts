import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./config/prisma";
import { logger } from "./utils/logger";

const app = createApp();

async function start() {
  await prisma.$connect();
  const server = app.listen(env.PORT, () => {
    logger.info("Backend listening", {
      url: `http://localhost:${env.PORT}`,
      port: env.PORT,
      env: env.NODE_ENV,
    });
  });

  async function gracefulShutdown(signal: string) {
    logger.info(`${signal} received, shutting down gracefully...`);
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
}

start().catch(async (error: unknown) => {
  logger.error("Failed to start backend", { error: error instanceof Error ? error : new Error(String(error)) });
  await prisma.$disconnect();
  process.exit(1);
});
