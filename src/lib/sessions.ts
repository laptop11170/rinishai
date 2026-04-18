import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

interface Session {
  userId: string;
  expires: number;
}

const SESSION_DIR = path.join(process.cwd(), ".data", "sessions");
const SESSION_FILE = path.join(SESSION_DIR, "sessions.json");

// In-memory session store
export const sessions = new Map<string, Session>();

async function loadSessions(): Promise<void> {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
    const data = await fs.readFile(SESSION_FILE, "utf-8");
    const saved: [string, Session][] = JSON.parse(data);
    for (const [token, session] of saved) {
      if (Date.now() < session.expires) {
        sessions.set(token, session);
      }
    }
  } catch {
    // No saved sessions or empty dir
  }
}

async function saveSessions(): Promise<void> {
  await fs.mkdir(SESSION_DIR, { recursive: true });
  const data = JSON.stringify([...sessions.entries()]);
  await fs.writeFile(SESSION_FILE, data, "utf-8");
}

// Load persisted sessions on module init
loadSessions();

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function createSession(token: string, userId: string, expiryMs: number = 30 * 24 * 60 * 60 * 1000): void {
  sessions.set(token, {
    userId,
    expires: Date.now() + expiryMs,
  });
  saveSessions().catch((err) => console.error("Failed to save sessions:", err));
}

export function getSession(token: string): Session | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expires) {
    sessions.delete(token);
    saveSessions().catch((err) => console.error("Failed to save sessions:", err));
    return null;
  }
  return session;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
  saveSessions().catch((err) => console.error("Failed to save sessions:", err));
}

export function cleanExpiredSessions(): void {
  const now = Date.now();
  let changed = false;
  for (const [token, session] of sessions.entries()) {
    if (now > session.expires) {
      sessions.delete(token);
      changed = true;
    }
  }
  if (changed) {
    saveSessions().catch((err) => console.error("Failed to save sessions:", err));
  }
}
