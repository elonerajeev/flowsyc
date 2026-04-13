import { Server as SocketIOServer } from "socket.io";
import http from "http";

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
      console.log('User connected', { socketId: socket.id });

      socket.on('disconnect', () => {
        console.log('User disconnected', { socketId: socket.id });
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
