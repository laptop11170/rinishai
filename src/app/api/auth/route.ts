import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { sessions, createSession, getSession, deleteSession, generateToken } from "@/lib/sessions";
import { validatePassword, createUser, getUserById } from "@/lib/users";

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
  return session?.userId || null;
}

// GET /api/auth - check session
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = getUserFromCookie(cookieStore);

    let username = null;
    if (userId) {
      const user = await getUserById(userId);
      username = user?.username || null;
    }

    return NextResponse.json({ userId: userId || null, username });
  } catch {
    return NextResponse.json({ userId: null, username: null });
  }
}

// POST /api/auth - login or register
export async function POST(request: Request) {
  try {
    const { action, username, password } = await request.json();

    if (action === "register") {
      // For small team deployments, always allow registration
      // To restrict, set ALLOW_REGISTRATION=false and delete existing users
      if (process.env.ALLOW_REGISTRATION === "false") {
        // Check if any users exist - if not, allow first user to register
        const usersDir = path.join(process.cwd(), ".data", "users");
        await ensureDir(usersDir);
        const usersFile = path.join(usersDir, "users.json");
        let existingUsers: unknown[] = [];
        try {
          const data = await fs.readFile(usersFile, "utf-8");
          existingUsers = JSON.parse(data);
        } catch {
          // No users file yet
        }
        if (existingUsers.length > 0) {
          return NextResponse.json({ error: "Registration disabled. Contact admin." }, { status: 403 });
        }
      }

      if (!username || !password) {
        return NextResponse.json({ error: "Username and password required" }, { status: 400 });
      }

      const user = await createUser(username, password);
      const token = generateToken();
      createSession(token, user.id);

      const response = NextResponse.json({ success: true, userId: user.id, username: user.username });
      response.cookies.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      return response;
    }

    // Login action (default)
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = await validatePassword(username, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = generateToken();
    createSession(token, user.id);

    const response = NextResponse.json({ success: true, userId: user.id, username: user.username });
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Auth error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Invalid request: " + message }, { status: 400 });
  }
}

// DELETE /api/auth - logout
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    const token = sessionCookie?.value;

    if (token) {
      deleteSession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("session", "", { maxAge: 0, path: "/" });
    return response;
  } catch {
    return NextResponse.json({ success: true });
  }
}