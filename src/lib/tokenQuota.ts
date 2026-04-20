import { prisma } from "./prisma";

export interface QuotaRecord {
  userId: string;
  usedTokens: number;
  windowStart: number;
  limitTokens: number;
  windowHours: number;
}

function getWindowMs(windowHours: number): number {
  return windowHours * 60 * 60 * 1000;
}

export async function getQuota(userId: string): Promise<QuotaRecord | null> {
  const record = await prisma.tokenQuota.findUnique({
    where: { userId },
  });

  if (!record) return null;

  return {
    userId: record.userId,
    usedTokens: Number(record.usedTokens),
    windowStart: Number(record.windowStart),
    limitTokens: Number(record.limitTokens),
    windowHours: record.windowHours,
  };
}

export async function createQuota(userId: string, limitTokens: number, windowHours: number): Promise<QuotaRecord> {
  const record = await prisma.tokenQuota.create({
    data: {
      userId,
      usedTokens: 0,
      windowStart: BigInt(Date.now()),
      limitTokens: BigInt(limitTokens),
      windowHours,
    },
  });

  return {
    userId: record.userId,
    usedTokens: Number(record.usedTokens),
    windowStart: Number(record.windowStart),
    limitTokens: Number(record.limitTokens),
    windowHours: record.windowHours,
  };
}

export async function checkQuota(userId: string, tokensNeeded: number): Promise<{
  allowed: boolean;
  remaining: number;
  resetsAt: number;
}> {
  const record = await getQuota(userId);

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

  const record = await getQuota(userId);
  if (!record || record.limitTokens <= 0) return record;

  const windowMs = getWindowMs(record.windowHours);
  const windowEnd = record.windowStart + windowMs;
  const now = Date.now();

  let newUsedTokens: number;
  let newWindowStart: number;

  if (now >= windowEnd) {
    newUsedTokens = tokensUsed;
    newWindowStart = now;
  } else {
    newUsedTokens = record.usedTokens + tokensUsed;
    newWindowStart = record.windowStart;
  }

  const updated = await prisma.tokenQuota.update({
    where: { userId },
    data: {
      usedTokens: BigInt(newUsedTokens),
      windowStart: BigInt(newWindowStart),
    },
  });

  return {
    userId: updated.userId,
    usedTokens: Number(updated.usedTokens),
    windowStart: Number(updated.windowStart),
    limitTokens: Number(updated.limitTokens),
    windowHours: updated.windowHours,
  };
}

export async function resetUsage(userId: string): Promise<void> {
  await prisma.tokenQuota.update({
    where: { userId },
    data: {
      usedTokens: 0,
      windowStart: BigInt(Date.now()),
    },
  });
}

export async function deleteQuota(userId: string): Promise<void> {
  await prisma.tokenQuota.delete({
    where: { userId },
  }).catch(() => {});
}
