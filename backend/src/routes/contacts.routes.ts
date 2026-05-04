import { Router, Request, Response } from "express";
import { contactsService, type ContactInput } from "../services/contacts.service";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

// GET /api/contacts - Get all contacts
router.get(
  "/",
  requireAuth,
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req: Request, res: Response) => {
    const contacts = await contactsService.list(req.auth);
    res.json({ data: contacts });
  })
);

// POST /api/contacts - Create new contact
router.post(
  "/",
  requireAuth,
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const contactData: ContactInput = req.body;
    const contact = await contactsService.create(contactData, req.auth);
    res.status(201).json(contact);
  })
);

// GET /api/contacts/:id - Get contact by ID
router.get(
  "/:id",
  requireAuth,
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const contact = await contactsService.getById(id, req.auth);
    res.json(contact);
  })
);

// PATCH /api/contacts/:id - Update contact
router.patch(
  "/:id",
  requireAuth,
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const updates: Partial<ContactInput> = req.body;
    const contact = await contactsService.update(id, updates, req.auth);
    res.json(contact);
  })
);

// DELETE /api/contacts/:id - Delete contact
router.delete(
  "/:id",
  requireAuth,
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    await contactsService.delete(id, req.auth);
    res.json({ success: true });
  })
);

export default router;