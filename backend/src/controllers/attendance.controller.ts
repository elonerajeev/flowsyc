import type { Request, Response } from "express";

import { attendanceService } from "../services/attendance.service";
import { logAudit } from "../utils/audit";

export const attendanceController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const attendance = await attendanceService.list(req.auth);
    res.status(200).json(attendance);
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, checkIn, location } = req.body;
    const userId = req.auth!.userId;
    const result = await attendanceService.update(Number(id), { status, checkIn, location }, userId);
    await logAudit({
      userId,
      action: "update",
      entity: "Attendance",
      entityId: String(id),
      detail: `Updated attendance to ${status}`,
    });
    res.status(200).json(result);
  },
};
