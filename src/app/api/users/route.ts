import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getSession } from "@/lib/sessions";
import { getUsers, createUser, getUserById } from "@/lib/users";
import { resetUsage } from "@/lib/tokenQuota";

async function getUserFromCookie(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<string | null> {
  const sessionCookie = cookieStore.get("session");
  const token = sessionCookie?.value;
  if (!token) return null;
  const session = await getSession(token);
  return session?.userId || null;
}

// GET /api/users - list all users (admin only)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = await getUserFromCookie(cookieStore);

    if (!userId || userId !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const users = await getUsers();

    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      createdAt: u.createdAt,
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
    const userId = await getUserFromCookie(cookieStore);

    if (!userId || userId !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const newUser = await createUser(username, password);

    return NextResponse.json({ success: true, user: { id: newUser.id, username: newUser.username, createdAt: newUser.createdAt } });
  } catch (error) {
    if (error instanceof Error && error.message === "Username already exists") {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

// PUT /api/users - update user (admin only)
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = await getUserFromCookie(cookieStore);

    if (!userId || userId !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { targetUserId, password, quotaLimitTokens, quotaWindowHours, resetUsage: shouldReset } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Update password if provided
    if (password) {
      const { prisma } = await import("@/lib/prisma");
      await prisma.user.update({
        where: { id: targetUserId },
        data: { passwordHash: await bcrypt.hash(password, 12) },
      });
    }

    // Update quota settings
    if (quotaLimitTokens !== undefined || quotaWindowHours !== undefined) {
      const { prisma } = await import("@/lib/prisma");
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          quotaLimit: quotaLimitTokens ?? null,
          quotaWindowHours: quotaWindowHours ?? null,
        },
      });
    }

    // Reset usage if requested
    if (shouldReset) {
      await resetUsage(targetUserId);
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
    const userId = await getUserFromCookie(cookieStore);

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

    const { deleteUser } = await import("@/lib/users");
    const success = await deleteUser(targetUserId);

    if (!success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
