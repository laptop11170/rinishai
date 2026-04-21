import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: "yadish" },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash("Rini@1111", 12);
      await prisma.user.create({
        data: {
          id: `user_${Date.now()}`,
          username: "yadish",
          passwordHash,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Admin created" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}