import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { apiRateLimiter } from "./middleware/rate-limit.middleware";
import { authRouter } from "./routes/auth.routes";
import { communicationRouter } from "./routes/communication.routes";
import { leadsRouter } from "./routes/leads.routes";
import { dealsRouter } from "./routes/deals.routes";
import { clientsRouter } from "./routes/clients.routes";
import { attendanceRouter } from "./routes/attendance.routes";
import { candidatesRouter } from "./routes/candidates.routes";
import { staticCrmRouter } from "./routes/static-crm.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { invoicesRouter } from "./routes/invoices.routes";
import { notesRouter } from "./routes/notes.routes";
import { preferencesRouter } from "./routes/preferences.routes";
import { hiringRouter } from "./routes/hiring.routes";
import { reportsRouter } from "./routes/reports.routes";
import { projectsRouter } from "./routes/projects.routes";
import { tasksRouter } from "./routes/tasks.routes";
import { calendarRouter } from "./routes/calendar.routes";
import { teamMembersRouter } from "./routes/team-members.routes";
import { payrollRouter } from "./routes/payroll.routes";
import { systemRouter } from "./routes/system.routes";
import { uploadRouter } from "./routes/upload.routes";
import { errorHandler, notFound } from "./middleware/error.middleware";
import { logger } from "./utils/logger";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(express.json({ limit: "1mb" }));
  app.use(
    morgan(env.NODE_ENV === "production" ? "combined" : "dev", {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
    }),
  );
  app.use(apiRateLimiter);

  app.get(["/health", "/api/health"], (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "focal-point-compass-backend",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api", communicationRouter);
  app.use("/api", staticCrmRouter);
  app.use("/api/leads", leadsRouter);
  app.use("/api/deals", dealsRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/attendance", attendanceRouter);
  app.use("/api/notes", notesRouter);
  app.use("/api/preferences", preferencesRouter);
  app.use("/api/hiring", hiringRouter);
  app.use("/api/candidates", candidatesRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/team-members", teamMembersRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/payroll", payrollRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/system", systemRouter);
  app.use("/api/upload", uploadRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
