import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./config/prisma";
import { logger } from "./utils/logger";
import { Server } from "socket.io";
import http from "http";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:8080",
    methods: ["GET", "POST"],
  },
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('User connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('User disconnected', { socketId: socket.id });
  });

  // Join user room for personalized updates
  socket.on('join', (userId: string) => {
    socket.join(`user_${userId}`);
  });

  // Join project room
  socket.on('joinProject', (projectId: number) => {
    socket.join(`project_${projectId}`);
  });

  // Join task room
  socket.on('joinTask', (taskId: number) => {
    socket.join(`task_${taskId}`);
  });
});

// Export io for use in services
export { io };

async function start() {
  await prisma.$connect();
  server.listen(env.PORT, () => {
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
