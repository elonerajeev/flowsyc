import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { prisma } from "./config/prisma";
import { logger } from "./utils/logger";
import { verifyAccessToken } from "./utils/jwt";
import type { UserRole } from "./config/types";

let _io: SocketIOServer | null = null;

export type SocketAuthContext = {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
};

function getCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const segments = cookieHeader.split(";").map((segment) => segment.trim());
  for (const segment of segments) {
    if (segment.startsWith(`${name}=`)) {
      return segment.slice(name.length + 1);
    }
  }
  return null;
}

export function extractSocketToken(input: {
  authToken?: unknown;
  authorizationHeader?: unknown;
  cookieHeader?: unknown;
}): string | null {
  const authToken = typeof input.authToken === "string" ? input.authToken.trim() : "";
  if (authToken) return authToken;

  const authHeader = typeof input.authorizationHeader === "string" ? input.authorizationHeader.trim() : "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const cookieHeader = typeof input.cookieHeader === "string" ? input.cookieHeader : undefined;
  const cookieToken = getCookieValue(cookieHeader, "accessToken");
  if (cookieToken?.trim()) return cookieToken.trim();

  return null;
}

export function authenticateSocketToken(token: string): SocketAuthContext {
  const decoded = verifyAccessToken(token);
  if (!decoded.sub || !decoded.email || !decoded.role) {
    throw new Error("UNAUTHORIZED");
  }
  return {
    userId: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    organizationId: decoded.organizationId,
  };
}

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

    _io.use((socket, next) => {
      const token = extractSocketToken({
        authToken: socket.handshake.auth?.token,
        authorizationHeader: socket.handshake.headers?.authorization,
        cookieHeader: socket.handshake.headers?.cookie,
      });

      if (!token) {
        next(new Error("UNAUTHORIZED"));
        return;
      }

      try {
        const auth = authenticateSocketToken(token);
        socket.data.auth = auth;
        next();
      } catch {
        next(new Error("UNAUTHORIZED"));
      }
    });

    _io.on('connection', (socket) => {
      logger.debug('User connected', { socketId: socket.id });
      const auth = socket.data.auth as SocketAuthContext | undefined;
      if (!auth) {
        socket.disconnect(true);
        return;
      }

      socket.join(`user_${auth.userId}`);
      if (auth.role === "admin" || auth.role === "manager") {
        socket.join("devops:ops");
      }
      logger.debug('Socket authenticated', { socketId: socket.id, userId: auth.userId, role: auth.role });

      socket.on('disconnect', () => {
        logger.debug('User disconnected', { socketId: socket.id });
      });

      socket.on('join', (userId: string) => {
        if (userId === auth.userId) {
          socket.join(`user_${userId}`);
        }
      });

      socket.on("devops:logs:subscribe", async (sourceIdRaw: number | string) => {
        if (auth.role !== "admin" && auth.role !== "manager") return;
        const sourceId = Number(sourceIdRaw);
        if (!Number.isInteger(sourceId) || sourceId <= 0) return;
        try {
          const source = await prisma.devOpsLogSource.findFirst({
            where: {
              id: sourceId,
              deletedAt: null,
              ...(auth.organizationId ? { organizationId: auth.organizationId } : {}),
            },
            select: { id: true },
          });
          if (!source) return;

          socket.join(`devops:logs:${sourceId}`);
        } catch {
          // ignore transient DB errors for optional subscription
        }
      });

      socket.on("devops:logs:unsubscribe", (sourceIdRaw: number | string) => {
        if (auth.role !== "admin" && auth.role !== "manager") return;
        const sourceId = Number(sourceIdRaw);
        if (!Number.isInteger(sourceId) || sourceId <= 0) return;
        socket.leave(`devops:logs:${sourceId}`);
      });
    });
  }
  return _io;
}

export function getIO(): SocketIOServer | null {
  return _io;
}
