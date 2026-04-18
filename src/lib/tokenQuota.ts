import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data", "usage");

export interface QuotaRecord {
  userId: string;
  usedTokens: number;
  windowStart: number;
  limitTokens: number;
  windowHours: number;
}

interface QuotaStore {
  [userId: string]: QuotaRecord;
}

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

async function loadQuotas(): Promise<QuotaStore> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, "quotas.json");
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveQuotas(quotas: QuotaStore): Promise<void> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, "quotas.json");
  await fs.writeFile(filePath, JSON.stringify(quotas, null, 2), "utf-8");
}

function getWindowMs(windowHours: number): number {
  return windowHours * 60 * 60 * 1000;
}

export async function getQuota(userId: string): Promise<QuotaRecord | null> {
  const quotas = await loadQuotas();
  return quotas[userId] || null;
}

export async function createQuota(userId: string, limitTokens: number, windowHours: number): Promise<QuotaRecord> {
  const quotas = await loadQuotas();
  const record: QuotaRecord = {
    userId,
    usedTokens: 0,
    windowStart: Date.now(),
    limitTokens,
    windowHours,
  };
  quotas[userId] = record;
  await saveQuotas(quotas);
  return record;
}

export async function checkQuota(userId: string, tokensNeeded: number): Promise<{
  allowed: boolean;
  remaining: number;
  resetsAt: number;
}> {
  const quotas = await loadQuotas();
  const record = quotas[userId];

  if (!record || record.limitTokens <= 0) {
    return { allowed: true, remaining: -1, resetsAt: 0 };
  }

  const windowMs = getWindowMs(record.windowHours);
  const windowEnd = record.windowStart + windowMs;
  const now = Date.now();

  if (now >= windowEnd) {
    return { allowed: true, remaining: record.limitTokens, resetsAt: 0 };
  }

  const remaining = record.limitTokens - record.usedTokens;
  return {
    allowed: remaining >= tokensNeeded,
    remaining: Math.max(0, remaining - tokensNeeded),
    resetsAt: windowEnd,
  };
}

export async function consumeTokens(userId: string, tokensUsed: number): Promise<QuotaRecord | null> {
  if (tokensUsed <= 0) return null;

  const quotas = await loadQuotas();
  const record = quotas[userId];

  if (!record || record.limitTokens <= 0) return record || null;

  const windowMs = getWindowMs(record.windowHours);
  const windowEnd = record.windowStart + windowMs;
  const now = Date.now();

  if (now >= windowEnd) {
    record.usedTokens = tokensUsed;
    record.windowStart = now;
  } else {
    record.usedTokens += tokensUsed;
  }

  quotas[userId] = record;
  await saveQuotas(quotas);
  return record;
}

export async function resetUsage(userId: string): Promise<void> {
  const quotas = await loadQuotas();
  if (quotas[userId]) {
    quotas[userId].usedTokens = 0;
    quotas[userId].windowStart = Date.now();
    await saveQuotas(quotas);
  }
}

export async function deleteQuota(userId: string): Promise<void> {
  const quotas = await loadQuotas();
  delete quotas[userId];
  await saveQuotas(quotas);
}
