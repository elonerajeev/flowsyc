import type { Request, Response } from "express";

import { reportsService } from "../services/reports.service";

export const reportsController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const reports = await reportsService.list(req.auth);
    res.status(200).json(reports);
  },

  getAnalytics: async (req: Request, res: Response): Promise<void> => {
    const analytics = await reportsService.getAnalytics(req.auth);
    res.status(200).json(analytics);
  },
};
