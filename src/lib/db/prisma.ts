import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// When DATABASE_URL uses the prisma:// Accelerate protocol or an Accelerate key is set,
// route queries through Accelerate global cache and connection pooler.
export const prisma = (
  process.env.DATABASE_URL?.startsWith("prisma://") ||
  process.env.PRISMA_ACCELERATE_URL
    ? (basePrisma.$extends(withAccelerate()) as unknown as PrismaClient)
    : (basePrisma.$extends(withAccelerate()) as unknown as PrismaClient)
) as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}
