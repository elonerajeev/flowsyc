import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { activityService, type LogActivityInput } from "../services/activity.service";
import { asyncHandler } from "../utils/async-handler";
import { createActivitySchema } from "../validators/activity.schema";

const router = Router();

router.use(requireAuth);

router.post(
  "/",
  validateBody(createActivitySchema),
  asyncHandler(async (req, res) => {
    const input: LogActivityInput = req.body;
    const activity = await activityService.log(req.auth, input);
    res.status(201).json({ data: activity });
  })
);

router.get(
  "/:entityType/:entityId",
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const activities = await activityService.list(
      req.params.entityType as "lead" | "client" | "deal",
      Number(req.params.entityId),
      limit
    );
    res.json({ data: activities });
  })
);

router.get(
  "/recent",
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const activities = await activityService.getRecent(limit, req.auth);
    res.json({ data: activities });
  })
);

export const activityRouter = router;
