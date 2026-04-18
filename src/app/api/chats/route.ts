import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { getSession } from "@/lib/sessions";
import { getUserById } from "@/lib/users";

const DATA_DIR = path.join(process.cwd(), ".data", "chats");

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

function getUserFromCookie(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  const sessionCookie = cookieStore.get("session");
  const token = sessionCookie?.value;

  if (!token) return null;
  const session = getSession(token);
  if (!session) return null;
  return session.userId;
}

// GET /api/chats - load user's chats
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = getUserFromCookie(cookieStore);

    if (!userId) {
      return NextResponse.json({ conversations: [], settings: null });
    }

    await ensureDir(DATA_DIR);
    const filePath = path.join(DATA_DIR, `${userId}.json`);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(data);
      return NextResponse.json({
        conversations: parsed.conversations || [],
        settings: parsed.settings || null
      });
    } catch {
      return NextResponse.json({ conversations: [], settings: null });
    }
  } catch {
    return NextResponse.json({ conversations: [], settings: null });
  }
}

// POST /api/chats - save user's chats
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = getUserFromCookie(cookieStore);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user still exists
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { conversations, settings } = await request.json();

    await ensureDir(DATA_DIR);
    const filePath = path.join(DATA_DIR, `${userId}.json`);
    const data = JSON.stringify({ conversations, settings }, null, 2);

    await fs.writeFile(filePath, data, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save chat:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}