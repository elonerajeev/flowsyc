import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { logger } from "./utils/logger";

let _io: SocketIOServer | null = null;

export function initializeIO(server: http.Server): SocketIOServer {
  if (!_io) {
    _io = new SocketIOServer(server, {
      cors: {
        origin: [
          process.env.FRONTEND_URL ?? "http://localhost:8080",
          "https://flowsyc-svuj.vercel.app",
          "https://flowsyc.com",
        ],
        methods: ["GET", "POST"],
      },
    });
  }
  return _io;
}

export function getIO(): SocketIOServer | null {
  return _io;
}
