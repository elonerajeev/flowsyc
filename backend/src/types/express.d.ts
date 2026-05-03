import type { UserRole } from "../config/types";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
        role: UserRole;
        organizationId?: string;
      };
    }
  }
}

export {};
