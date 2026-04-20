import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/sessions";
import { prisma } from "@/lib/prisma";

async function getUserFromCookie(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<string | null> {
  const sessionCookie = cookieStore.get("session");
  const token = sessionCookie?.value;

  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  return session.userId;
}

// GET /api/chats - load user's chats
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = await getUserFromCookie(cookieStore);

    if (!userId) {
      return NextResponse.json({ conversations: [], settings: null });
    }

    // Get all conversations for this user
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    // Get user settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { quotaLimit: true, quotaWindowHours: true },
    });

    const settings = user
      ? {
          provider: "opusmax",
          apiKey: "",
          baseUrl: "",
          model: "claude-opus-4-6",
          extendedThinking: false,
          quotaLimit: user.quotaLimit ?? undefined,
          quotaWindowHours: user.quotaWindowHours ?? undefined,
        }
      : null;

    // Convert to frontend format
    const conversationsData = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      messages: conv.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        contentBlocks: msg.contentBlocks,
        thinking: msg.thinking,
        attachedImages: msg.attachedImages,
        timestamp: Number(msg.timestamp),
      })),
      artifacts: conv.artifacts || {},
      toolCalls: {},
      createdAt: conv.createdAt.getTime(),
      updatedAt: conv.updatedAt.getTime(),
    }));

    return NextResponse.json({
      conversations: conversationsData,
      settings,
    });
  } catch (error) {
    console.error("Failed to load chats:", error);
    return NextResponse.json({ conversations: [], settings: null });
  }
}

// POST /api/chats - save/update user's chats
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = await getUserFromCookie(cookieStore);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversations, settings } = body;

    // Save conversations and messages
    if (conversations && Array.isArray(conversations)) {
      // Use a transaction to update all conversations
      await prisma.$transaction(async (tx) => {
        // Delete existing conversations (cascade deletes messages)
        await tx.conversation.deleteMany({
          where: { userId },
        });

        // Create new conversations with messages
        for (const conv of conversations) {
          await tx.conversation.create({
            data: {
              id: conv.id,
              userId,
              title: conv.title,
              artifacts: conv.artifacts || {},
              messages: {
                create: conv.messages.map((msg: any) => ({
                  id: msg.id,
                  role: msg.role,
                  content: msg.content,
                  contentBlocks: msg.contentBlocks,
                  thinking: msg.thinking,
                  attachedImages: msg.attachedImages,
                  timestamp: BigInt(msg.timestamp),
                })),
              },
            },
          });
        }
      });
    }

    // Save settings if provided
    if (settings) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          quotaLimit: settings.quotaLimit,
          quotaWindowHours: settings.quotaWindowHours,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save chats:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
