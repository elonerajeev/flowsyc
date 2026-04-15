import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
