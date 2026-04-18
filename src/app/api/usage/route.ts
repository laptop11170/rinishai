import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";
import { getSession } from "@/lib/sessions";

const DATA_DIR = path.join(process.cwd(), ".data", "users");

async function getUserBySession(): Promise<{ id: string; quotaLimitTokens?: number; quotaWindowHours?: number } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  const token = sessionCookie?.value;
  if (!token) return null;

  const session = getSession(token);
  const userId = session?.userId;
  if (!userId) return null;

  try {
    const filePath = path.join(DATA_DIR, "users.json");
    const data = await fs.readFile(filePath, "utf-8");
    const users = JSON.parse(data);
    return users.find((u: { id: string }) => u.id === userId) || null;
  } catch {
    return null;
  }
}

async function loadQuotas(): Promise<Record<string, { usedTokens: number; windowStart: number; limitTokens: number; windowHours: number }>> {
  try {
    const filePath = path.join(process.cwd(), ".data", "usage", "quotas.json");
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const user = await getUserBySession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quotaLimitTokens = 0, quotaWindowHours = 0 } = user;

    // No quota set
    if (quotaLimitTokens <= 0) {
      return NextResponse.json({
        hasQuota: false,
        usedTokens: 0,
        limitTokens: 0,
        windowHours: 0,
        resetsAt: 0,
      });
    }

    const quotas = await loadQuotas();
    const record = quotas[user.id];

    if (!record) {
      return NextResponse.json({
        hasQuota: true,
        usedTokens: 0,
        limitTokens: quotaLimitTokens,
        windowHours: quotaWindowHours,
        resetsAt: 0,
        remaining: quotaLimitTokens,
      });
    }

    const windowMs = quotaWindowHours * 60 * 60 * 1000;
    const windowEnd = record.windowStart + windowMs;
    const now = Date.now();

    // Window expired, usage will be reset
    if (now >= windowEnd) {
      return NextResponse.json({
        hasQuota: true,
        usedTokens: 0,
        limitTokens: quotaLimitTokens,
        windowHours: quotaWindowHours,
        resetsAt: 0,
        remaining: quotaLimitTokens,
      });
    }

    return NextResponse.json({
      hasQuota: true,
      usedTokens: record.usedTokens,
      limitTokens: quotaLimitTokens,
      windowHours: quotaWindowHours,
      resetsAt: windowEnd,
      remaining: Math.max(0, quotaLimitTokens - record.usedTokens),
    });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
