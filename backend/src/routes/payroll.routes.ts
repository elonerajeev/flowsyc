import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { payrollService } from "../services/payroll.service";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { period } = req.query;
    const records = await payrollService.list(req.auth, period as string);
    res.json(records);
  }),
);

router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const { period } = req.body;
    if (!period) {
      res.status(400).json({ error: "Period is required (e.g., 2026-04)" });
      return;
    }
    const results = await payrollService.generate(period, req.auth);
    res.status(201).json(results);
  }),
);

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: "Status is required" });
      return;
    }
    const updated = await payrollService.updateStatus(Number(req.params.id), status, req.auth);
    res.json(updated);
  }),
);

export const payrollRouter = router;
