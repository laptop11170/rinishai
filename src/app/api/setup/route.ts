import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory may already exist
  }
}

export async function POST() {
  try {
    const usersDir = path.join(process.cwd(), ".data", "users");
    await ensureDir(usersDir);
    const usersFile = path.join(usersDir, "users.json");

    // Check if admin already exists
    let existingUsers: { id: string; username: string; passwordHash: string; createdAt: number; role: string }[] = [];
    try {
      const data = await fs.readFile(usersFile, "utf-8");
      existingUsers = JSON.parse(data);
    } catch {
      existingUsers = [];
    }

    // Only create if no admin exists
    if (!existingUsers.find(u => u.role === "admin")) {
      const passwordHash = await bcrypt.hash("Rini@1111", 12);
      const adminUser = {
        id: "admin",
        username: "yadish",
        passwordHash,
        createdAt: Date.now(),
        role: "admin"
      };
      existingUsers.push(adminUser);
      await fs.writeFile(usersFile, JSON.stringify(existingUsers, null, 2), "utf-8");
    }

    return NextResponse.json({ success: true, message: "Admin created" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}