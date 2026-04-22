import type { NextFunction, Request, Response } from "express";

import { logger } from "../utils/logger";

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
      timestamp: new Date().toISOString(),
    },
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    const meta = {
      method: req.method,
      path: req.originalUrl,
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
    };
    if (err.statusCode >= 500) {
      logger.error("Request failed", meta);
    } else {
      logger.warn("Request failed", meta);
    }
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  const internalMessage = "An unexpected error occurred";
  logger.error("Unhandled server error", {
    method: req.method,
    path: req.originalUrl,
    error: err instanceof Error ? err : new Error(String(err)),
  });
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: internalMessage,
      timestamp: new Date().toISOString(),
    },
  });
}
