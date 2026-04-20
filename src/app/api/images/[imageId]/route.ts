import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/sessions";
import { prisma } from "@/lib/prisma";
import { cookies as nextCookies } from "next/headers";

interface Params {
  params: Promise<{
    imageId: string;
  }>;
}

// GET /api/images/[imageId] - serve an image from database
export async function GET(request: Request, { params }: Params) {
  try {
    const { imageId } = await params;

    // Security: validate image ID format
    if (!imageId || imageId.includes("..")) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    // Check authentication
    const cookieStore = await nextCookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get image from database
    const image = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Verify the image belongs to the user
    if (image.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Convert base64 back to binary
    const buffer = Buffer.from(image.data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Failed to serve image:", error);
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 });
  }
}
