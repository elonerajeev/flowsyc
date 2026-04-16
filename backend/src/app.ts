import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { apiRateLimiter } from "./middleware/rate-limit.middleware";

interface MetricsModule {
  metricsMiddleware?: express.RequestHandler;
  prometheusRegistry?: {
    contentType: string;
    metrics: () => Promise<string>;
  };
}

let metricsMiddleware: express.RequestHandler | null = null;
let prometheusRegistry: { contentType: string; metrics: () => Promise<string> } | null = null;

if (process.env.NODE_ENV !== "test") {
  try {
    const metricsModule = require("./middleware/metrics.middleware") as MetricsModule;
    const metricsUtils = require("./utils/metrics") as MetricsModule;
    metricsMiddleware = metricsModule.metricsMiddleware || null;
    prometheusRegistry = metricsUtils.prometheusRegistry || null;
  } catch {
    // Metrics not available
  }
}
import { attachmentsRouter } from "./routes/attachments.routes";
import { authRouter } from "./routes/auth.routes";
import { commentsRouter } from "./routes/comments.routes";
import { communicationRouter } from "./routes/communication.routes";
import contactsRouter from "./routes/contacts.routes";
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
import { teamsRouter } from "./routes/teams.routes";
import { payrollRouter } from "./routes/payroll.routes";
import { systemRouter } from "./routes/system.routes";
import { uploadRouter } from "./routes/upload.routes";
import { automationRouter } from "./routes/automation.routes";
import { meetingRouter } from "./routes/meeting.routes";
import { activityRouter } from "./routes/activity.routes";
import { csvImportRouter } from "./routes/csv-import.routes";
import { errorHandler, notFound } from "./middleware/error.middleware";
import { logger } from "./utils/logger";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
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

  if (metricsMiddleware) {
    app.use(metricsMiddleware);
    
    if (prometheusRegistry) {
      app.get(["/metrics", "/api/metrics"], async (_req: express.Request, res: express.Response) => {
        res.set("Content-Type", prometheusRegistry.contentType);
        res.status(200).send(await prometheusRegistry.metrics());
      });
    }
  }

  app.use(apiRateLimiter);

  app.get(["/health", "/api/health"], (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "focal-point-compass-backend",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/attachments", attachmentsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/contacts", contactsRouter);
  app.use("/api/leads", leadsRouter);
  app.use("/api/deals", dealsRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api", communicationRouter);
  app.use("/api", staticCrmRouter);
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
  app.use("/api/teams", teamsRouter);
  app.use("/api/invoices", invoicesRouter);
  app.use("/api/payroll", payrollRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/system", systemRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/automation", automationRouter);
  app.use("/api/meetings", meetingRouter);
  app.use("/api/activities", activityRouter);
  app.use("/api/csv-import", csvImportRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
