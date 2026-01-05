import { PrismaClient } from "@prisma/client";

const datasourceUrl = process.env.DATABASE_URL;
if (!datasourceUrl) {
  throw new Error("DATABASE_URL is not set");
}

export const prisma = new PrismaClient({
  // Prisma 7 requires datasourceUrl; casting to satisfy current typings.
  datasourceUrl,
} as any);
