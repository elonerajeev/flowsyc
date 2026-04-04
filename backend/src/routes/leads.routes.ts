import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { leadsService } from "../services/leads.service";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const leads = await leadsService.list(req.auth);
    res.json(leads);
  }),
);

router.get(
  "/:id",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const lead = await leadsService.getById(Number(req.params.id), req.auth);
    res.json(lead);
  }),
);

router.post(
  "/",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const lead = await leadsService.create(req.body);
    res.status(201).json(lead);
  }),
);

router.patch(
  "/:id",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const lead = await leadsService.update(Number(req.params.id), req.body, req.auth);
    res.json(lead);
  }),
);

router.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    await leadsService.delete(Number(req.params.id), req.auth);
    res.status(204).end();
  }),
);

export const leadsRouter = router;