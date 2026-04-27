import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { dealsService } from "../services/deals.service";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const deals = await dealsService.list(req.auth);
    res.json(deals);
  }),
);

router.get(
  "/:id",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const deal = await dealsService.getById(Number(req.params.id), req.auth);
    res.json(deal);
  }),
);

router.post(
  "/",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const deal = await dealsService.create(req.body, req.auth);
    res.status(201).json(deal);
  }),
);

router.post(
  "/:id/gtm-sync",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const result = await dealsService.syncLifecycle(Number(req.params.id), req.auth);
    res.json(result);
  }),
);

router.patch(
  "/:id",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const deal = await dealsService.update(Number(req.params.id), req.body, req.auth);
    res.json(deal);
  }),
);

router.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    await dealsService.delete(Number(req.params.id), req.auth);
    res.status(204).end();
  }),
);

export const dealsRouter = router;
