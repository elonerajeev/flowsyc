import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { prisma } from "../config/prisma";
import { orgFilter } from "../utils/access-control";
import { AppError } from "../middleware/error.middleware";
import { createAlertSchema } from "../validators/devops-alert.schema";

export const devopsAlertsRouter = Router();
devopsAlertsRouter.use(requireAuth);

devopsAlertsRouter.get("/", requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
  const data = await prisma.devOpsAlert.findMany({
    where: orgFilter(req.auth),
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  res.json({ data });
}));

devopsAlertsRouter.post("/", requireRole(["admin", "manager"]), validateBody(createAlertSchema), asyncHandler(async (req, res) => {
  const data = await prisma.devOpsAlert.create({
    data: {
      ...req.body,
      organizationId: req.auth?.organizationId ?? null,
      createdBy: req.auth?.userId ?? req.auth?.email,
      updatedAt: new Date(),
    },
  });
  res.status(201).json({ data });
}));

devopsAlertsRouter.patch("/:id/resolve", requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string);
  const existing = await prisma.devOpsAlert.findFirst({ where: { id, ...orgFilter(req.auth) } });
  if (!existing) throw new AppError("Alert not found", 404, "NOT_FOUND");
  const data = await prisma.devOpsAlert.update({
    where: { id },
    data: { resolved: true, resolvedAt: new Date(), resolvedBy: req.auth?.email, updatedAt: new Date() },
  });
  res.json({ data });
}));

devopsAlertsRouter.delete("/:id", requireRole(["admin"]), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string);
  const existing = await prisma.devOpsAlert.findFirst({ where: { id, ...orgFilter(req.auth) } });
  if (!existing) throw new AppError("Alert not found", 404, "NOT_FOUND");
  await prisma.devOpsAlert.delete({ where: { id } });
  res.json({ message: "Alert deleted" });
}));
