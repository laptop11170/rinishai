import crypto from "crypto";
import { prisma } from "./prisma";

export interface Session {
  userId: string;
  expires: number;
}

const sessionCache = new Map<string, Session>();

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(token: string, userId: string, expiryMs: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
  const expiresAt = new Date(Date.now() + expiryMs);

  await prisma.session.create({
    data: {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      token,
      expiresAt,
    },
  });

  sessionCache.set(token, {
    userId,
    expires: expiresAt.getTime(),
  });
}

export async function getSession(token: string): Promise<Session | null> {
  // Check cache first
  const cached = sessionCache.get(token);
  if (cached) {
    if (Date.now() > cached.expires) {
      sessionCache.delete(token);
      await prisma.session.deleteMany({ where: { token } });
      return null;
    }
    return cached;
  }

  // Load from database
  const session = await prisma.session.findUnique({
    where: { token },
    select: { userId: true, expiresAt: true },
  });

  if (!session) return null;

  const sessionData: Session = {
    userId: session.userId,
    expires: session.expiresAt.getTime(),
  };

  if (Date.now() > sessionData.expires) {
    await prisma.session.delete({ where: { token } });
    return null;
  }

  sessionCache.set(token, sessionData);
  return sessionData;
}

export async function deleteSession(token: string): Promise<void> {
  sessionCache.delete(token);
  await prisma.session.deleteMany({ where: { token } });
}

export async function cleanExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  // Clean cache
  for (const [token, session] of sessionCache.entries()) {
    if (Date.now() > session.expires) {
      sessionCache.delete(token);
    }
  }
}
