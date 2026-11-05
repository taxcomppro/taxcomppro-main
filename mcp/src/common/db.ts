import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Search potential .env locations
dotenv.config();

if (!process.env.DATABASE_URL) {
  const searchPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(process.cwd(), "..", "taxcomppro-web-main", ".env"),
    path.resolve(__dirname, "..", "..", ".env"),
    path.resolve(__dirname, "..", "..", "..", ".env"),
    path.resolve(__dirname, "..", "..", "..", "taxcomppro-web-main", ".env"),
  ];

  for (const envPath of searchPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      if (process.env.DATABASE_URL) break;
    }
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[TaxComPro MCP] Warning: DATABASE_URL is not set. Please set DATABASE_URL or run from TaxComPro workspace.");
}

const pool = new Pool({
  connectionString: connectionString || undefined,
  max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 30_000,
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[TaxComPro MCP] Database connection check failed:", error);
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}
