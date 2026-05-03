import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { logger } from "./utils/logger";
import { verifyAccessToken } from "./utils/jwt";

let _io: SocketIOServer | null = null;

export function initializeIO(server: http.Server): SocketIOServer {
  if (!_io) {
    _io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL ?? "http://localhost:8080",
        methods: ["GET", "POST"],
      },
    });

    _io.on('connection', (socket) => {
      logger.debug('User connected', { socketId: socket.id });

      // Authenticate socket connection
      const token = socket.handshake.auth.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = verifyAccessToken(token);
          socket.data.userId = decoded.id;
          socket.join(`user_${decoded.id}`);
          logger.debug('Socket authenticated', { socketId: socket.id, userId: decoded.id });
        } catch (error) {
          logger.warn('Socket authentication failed', { socketId: socket.id });
        }
      }

      socket.on('disconnect', () => {
        logger.debug('User disconnected', { socketId: socket.id });
      });

      socket.on('join', (userId: string) => {
        socket.join(`user_${userId}`);
      });
    });
  }
  return _io;
}

export function getIO(): SocketIOServer | null {
  return _io;
}
