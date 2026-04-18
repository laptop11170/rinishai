import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { getSession } from "@/lib/sessions";
import { getUsers } from "@/lib/users";

const DATA_DIR = path.join(process.cwd(), ".data", "users");

function getUserFromCookie(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
  const sessionCookie = cookieStore.get("session");
  const token = sessionCookie?.value;
  if (!token) return null;
  const session = getSession(token);
  return session?.userId || null;
}

interface StoredUser {
  id: string;
  username: string;
  passwordHash?: string;
  createdAt: number;
  role: string;
  quotaLimitTokens?: number;
  quotaWindowHours?: number;
}

async function getAllUsers(): Promise<StoredUser[]> {
  const filePath = path.join(DATA_DIR, "users.json");
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveUsers(users: StoredUser[]): Promise<void> {
  const filePath = path.join(DATA_DIR, "users.json");
  await fs.writeFile(filePath, JSON.stringify(users, null, 2), "utf-8");
}

// GET /api/users - list all users (admin only)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = getUserFromCookie(cookieStore);

    if (!userId || userId !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const users = await getAllUsers();
    // Don't send password hashes
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      createdAt: u.createdAt,
      role: u.role,
      quotaLimitTokens: u.quotaLimitTokens || 0,
      quotaWindowHours: u.quotaWindowHours || 0,
    }));

    return NextResponse.json({ users: safeUsers });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// POST /api/users - create user (admin only)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = getUserFromCookie(cookieStore);

    if (!userId || userId !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const users = await getAllUsers();

    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = {
      id: `user_${Date.now()}`,
      username,
      passwordHash,
      createdAt: Date.now(),
      role: "user"
    };

    users.push(newUser);
    await saveUsers(users);

    return NextResponse.json({ success: true, user: { id: newUser.id, username: newUser.username, createdAt: newUser.createdAt, role: newUser.role } });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// PUT /api/users - update user (admin only)
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = getUserFromCookie(cookieStore);

    if (!userId || userId !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { targetUserId, password, quotaLimitTokens, quotaWindowHours, resetUsage } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === targetUserId);

    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (password) {
      users[userIndex].passwordHash = await bcrypt.hash(password, 12);
    }

    if (quotaLimitTokens !== undefined || quotaWindowHours !== undefined) {
      users[userIndex].quotaLimitTokens = quotaLimitTokens ?? 0;
      users[userIndex].quotaWindowHours = quotaWindowHours ?? 0;
    }

    await saveUsers(users);

    // Reset usage if requested
    if (resetUsage) {
      const { resetUsage: resetFn } = await import("@/lib/tokenQuota");
      await resetFn(targetUserId);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// DELETE /api/users - delete user (admin only)
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = getUserFromCookie(cookieStore);

    if (!userId || userId !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (targetUserId === "admin") {
      return NextResponse.json({ error: "Cannot delete admin" }, { status: 400 });
    }

    let users = await getAllUsers();
    users = users.filter(u => u.id !== targetUserId);
    await saveUsers(users);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}