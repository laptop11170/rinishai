import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check if we're in a runtime environment with DATABASE_URL
const hasDatabaseUrl = typeof process !== "undefined" && !!process.env.DATABASE_URL;

let prismaInstance: PrismaClient;

if (hasDatabaseUrl) {
  // Dynamic import for pg adapter only when DATABASE_URL is available
  const { Pool } = require("pg");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({ adapter });
} else {
  // Fallback for build time or when no database
  prismaInstance = new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? prismaInstance;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
