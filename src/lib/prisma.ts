import { PrismaClient } from "@prisma/client";
import { isDatabaseConfigured } from "@/lib/env";

declare global {
  var __waterlinePrisma: PrismaClient | undefined;
}

export function getDb() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!global.__waterlinePrisma) {
    global.__waterlinePrisma = new PrismaClient();
  }

  return global.__waterlinePrisma;
}

export function dbOrThrow() {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return db;
}
