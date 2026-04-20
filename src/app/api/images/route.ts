import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/sessions";
import { prisma } from "@/lib/prisma";

// POST /api/images - save an image to database
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId;
    const { imageData, fileName } = await request.json();

    if (!imageData) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 });
    }

    // Extract base64 data and determine mime type
    const matches = imageData.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Save to database (store as base64 string)
    const image = await prisma.image.create({
      data: {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        fileName: fileName || `image_${Date.now()}.png`,
        mimeType,
        data: base64Data,
      },
    });

    return NextResponse.json({
      success: true,
      imageId: image.id,
      path: `/api/images/${image.id}`,
    });
  } catch (error) {
    console.error("Failed to save image:", error);
    return NextResponse.json({ error: "Failed to save image" }, { status: 500 });
  }
}
