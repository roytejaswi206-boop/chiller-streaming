import { PrismaClient } from "@prisma/client";

// Ensure fallback DATABASE_URL exists to prevent PrismaClientInitializationError
// when running on serverless environments where DATABASE_URL is not yet defined
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.NODE_ENV === "production"
      ? "file:/tmp/chiller-prod.db"
      : "file:./prisma/dev.db";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
