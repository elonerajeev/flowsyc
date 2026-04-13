import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { leadsService } from "../services/leads.service";
import { asyncHandler } from "../utils/async-handler";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { createLeadSchema, updateLeadSchema, convertLeadSchema, leadQuerySchema } from "../validators/lead.schema";

const router = Router();

router.use(requireAuth);

// List leads with query params
router.get(
  "/",
  requireRole(["admin", "manager", "employee"]),
  validateQuery(leadQuerySchema),
  asyncHandler(async (req, res) => {
    const leads = await leadsService.list(req.auth, req.query);
    res.json({
      data: leads.leads,
      total: leads.total,
      page: leads.page,
      limit: leads.limit,
    });
  }),
);

// Get hot leads
router.get(
  "/filters/hot",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const minScore = Number(req.query.minScore) || 80;
    const leads = await leadsService.getHotLeads(minScore);
    res.json(leads);
  }),
);

// Bulk recalculate scores
router.post(
  "/bulk/recalculate-scores",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const result = await leadsService.bulkRecalculateScores();
    res.json(result);
  }),
);

// Get cold leads
router.get(
  "/filters/cold",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 14;
    const leads = await leadsService.getColdLeads(days);
    res.json(leads);
  }),
);

// Create lead
router.post(
  "/",
  requireRole(["admin", "manager"]),
  validateBody(createLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = await leadsService.create(req.body, req.auth);
    res.status(201).json(lead);
  }),
);

// Get single lead
router.get(
  "/:id",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const lead = await leadsService.getById(Number(req.params.id), req.auth);
    res.json(lead);
  }),
);

// Update lead
router.patch(
  "/:id",
  requireRole(["admin", "manager"]),
  validateBody(updateLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = await leadsService.update(Number(req.params.id), req.body, req.auth);
    res.json(lead);
  }),
);

// Delete lead
router.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    await leadsService.delete(Number(req.params.id), req.auth);
    res.status(204).end();
  }),
);

// Convert lead to client
router.post(
  "/:id/convert",
  requireRole(["admin", "manager"]),
  validateBody(convertLeadSchema),
  asyncHandler(async (req, res) => {
    const result = await leadsService.convertToClient(Number(req.params.id), req.body, req.auth);
    res.status(201).json(result);
  }),
);

// Recalculate lead score
router.post(
  "/:id/recalculate-score",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const result = await leadsService.recalculateScore(Number(req.params.id));
    res.json(result);
  }),
);

// Create follow-up sequence
router.post(
  "/:id/followup-sequence",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const result = await leadsService.createFollowUpSequence(Number(req.params.id), req.auth?.email || "system");
    res.json(result);
  }),
);

// Assign lead to best rep
router.post(
  "/:id/assign",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const result = await leadsService.assignToBestRep(Number(req.params.id));
    res.json(result);
  }),
);

export const leadsRouter = router;
