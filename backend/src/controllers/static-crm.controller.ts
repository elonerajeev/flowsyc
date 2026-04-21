import type { Request, Response } from "express";

import { staticCrmService } from "../services/static-crm.service";

export const staticCrmController = {
  listCompanies: async (_req: Request, res: Response): Promise<void> => {
    const companies = await staticCrmService.listCompanies();
    res.status(200).json(companies);
  },

  getSalesMetrics: async (req: Request, res: Response): Promise<void> => {
    const access = req.auth;
    const metrics = await staticCrmService.getSalesMetrics(access);
    res.status(200).json(metrics);
  },

  listCommandActions: async (_req: Request, res: Response): Promise<void> => {
    const actions = await staticCrmService.listCommandActions();
    res.status(200).json(actions);
  },

  listThemePreviews: async (_req: Request, res: Response): Promise<void> => {
    const previews = await staticCrmService.listThemePreviews();
    res.status(200).json(previews);
  },
};
