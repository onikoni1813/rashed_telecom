import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // In serverless environments (Vercel), cap connections per container to prevent database pool exhaustion
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    if (!url.includes("connection_limit")) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}connection_limit=2&pool_timeout=15`;
    }
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const isAccelerate =
    process.env.DATABASE_URL?.startsWith("prisma://") ||
    Boolean(process.env.PRISMA_ACCELERATE_URL);

  const basePrisma = new PrismaClient({
    datasourceUrl: getDatabaseUrl(),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  if (isAccelerate) {
    return basePrisma.$extends(withAccelerate()) as unknown as PrismaClient;
  }
  return basePrisma;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// In serverless (Vercel) as well as development, keep client on globalThis to reuse across warm containers
globalForPrisma.prisma = prisma;
