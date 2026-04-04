import type { Request, Response } from "express";

import { dashboardService } from "../services/dashboard.service";

export const dashboardController = {
  get: async (req: Request, res: Response): Promise<void> => {
    const dashboard = await dashboardService.get(req.auth);
    res.status(200).json(dashboard);
  },
};
