import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/sessions";
import { getQuota } from "@/lib/tokenQuota";
import { getUserById } from "@/lib/users";

async function getUserBySession(): Promise<{ id: string; quotaLimitTokens?: number; quotaWindowHours?: number } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  const token = sessionCookie?.value;
  if (!token) return null;

  const session = await getSession(token);
  const userId = session?.userId;
  if (!userId) return null;

  return getUserById(userId);
}

export async function GET() {
  try {
    const user = await getUserBySession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quotaLimitTokens = 0, quotaWindowHours = 0 } = user;

    // No quota set
    if (!quotaLimitTokens || quotaLimitTokens <= 0) {
      return NextResponse.json({
        hasQuota: false,
        usedTokens: 0,
        limitTokens: 0,
        windowHours: 0,
        resetsAt: 0,
      });
    }

    const record = await getQuota(user.id);

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
