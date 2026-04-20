import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { getSession } from "@/lib/sessions";

// Use Railway persistent volume mount path, fallback to .data in cwd
const RAILWAY_VOLUME_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH || "";
const DATA_BASE_DIR = RAILWAY_VOLUME_PATH
  ? path.join(RAILWAY_VOLUME_PATH, ".data")
  : path.join(process.cwd(), ".data");

const DATA_DIR = path.join(DATA_BASE_DIR, "images");

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

// POST /api/images - save an image and return its path
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = getUserFromCookie(cookieStore);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageData, fileName } = await request.json();

    if (!imageData) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    await ensureDir(DATA_DIR);
    await ensureDir(path.join(DATA_DIR, userId));

    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const ext = fileName?.split(".").pop() || "png";
    const savedFileName = `${id}.${ext}`;
    const filePath = path.join(DATA_DIR, userId, savedFileName);

    // imageData is a base64 data URL, extract the base64 part
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    await fs.writeFile(filePath, buffer);

    // Return the relative path that can be used to serve the image
    return NextResponse.json({
      success: true,
      imageId: id,
      path: `/api/images/${userId}/${savedFileName}`
    });
  } catch (error) {
    console.error("Failed to save image:", error);
    return NextResponse.json({ error: "Failed to save image" }, { status: 500 });
  }
}
