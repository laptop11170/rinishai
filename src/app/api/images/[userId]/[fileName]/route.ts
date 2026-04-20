import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data", "images");

interface Params {
  params: Promise<{
    userId: string;
    fileName: string;
  }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { userId, fileName } = await params;

    // Security: prevent directory traversal
    if (fileName.includes("..") || userId.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const filePath = path.join(DATA_DIR, userId, fileName);

    try {
      const buffer = await fs.readFile(filePath);

      // Determine content type from extension
      const ext = fileName.split(".").pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
      };

      const contentType = contentTypes[ext || ""] || "application/octet-stream";

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000",
        },
      });
    } catch {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to serve image:", error);
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 });
  }
}
