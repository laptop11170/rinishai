import { NextRequest, NextResponse } from "next/server";
import { LLMConfig, Message } from "@/lib/types";
import { cookies } from "next/headers";
import { getSession } from "@/lib/sessions";
import { checkQuota, consumeTokens } from "@/lib/tokenQuota";

function getUserIdFromRequest(): string | null {
  // This is called from edge/node runtime, we read cookie directly
  // We'll use a simpler approach - pass userId in request body from frontend
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = body.messages as Message[];
    const settings = body.settings as LLMConfig;
    const userId = body.userId as string | undefined;

    // --- Quota check ---
    if (userId) {
      const quotaResult = await checkQuota(userId, 0);
      if (quotaResult.remaining >= 0 && !quotaResult.allowed) {
        const mins = Math.ceil((quotaResult.resetsAt - Date.now()) / 60000);
        return NextResponse.json(
          { error: `Token limit reached. Resets in ${mins} minute${mins !== 1 ? "s" : ""}.` },
          { status: 429 }
        );
      }
    }

    // --- API Key resolution for OpusMax ---
    let apiKey = settings.apiKey;
    if (settings.provider === "opusmax" && (!apiKey || apiKey.trim() === "")) {
      apiKey = process.env.OPUSMAX_API_KEY || "";
    }

    if (!apiKey || !settings.model) {
      return NextResponse.json(
        { error: "Please configure your LLM settings first. Click the gear icon to set up your API key and model." },
        { status: 400 }
      );
    }

    const resolvedSettings = { ...settings, apiKey };

    switch (resolvedSettings.provider) {
      case "anthropic":
        return handleAnthropic(resolvedSettings, messages);
      case "opusmax":
        return handleOpusMax(resolvedSettings, messages, userId);
      case "openai":
      default:
        return handleOpenAI(resolvedSettings, messages);
    }
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    );
  }
}

async function handleAnthropic(settings: LLMConfig, messages: Message[]) {
  const baseUrl = settings.baseUrl?.replace(/\/$/, "") || "https://api.anthropic.com";
  const url = `${baseUrl}/v1/messages`;

  const anthropicMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      if (m.contentBlocks && m.contentBlocks.length > 0) {
        return {
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.contentBlocks,
        };
      }
      return {
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      };
    });

  const systemPrompt = messages.find((m) => m.role === "system")?.content;

  const requestBody: Record<string, unknown> = {
    model: settings.model,
    messages: anthropicMessages,
    stream: true,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || JSON.stringify(errorData);
    } catch {
      const text = await response.text();
      if (text) errorMessage = text.slice(0, 500);
    }
    return NextResponse.json({ error: errorMessage }, { status: response.status });
  }

  return streamResponse(response, settings.model);
}

async function handleOpusMax(settings: LLMConfig, messages: Message[], userId?: string) {
  const url = "https://api.opusmax.pro/v1/messages";

  const anthropicMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      if (m.contentBlocks && m.contentBlocks.length > 0) {
        return {
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.contentBlocks,
        };
      }
      return {
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      };
    });

  const systemPrompt = messages.find((m) => m.role === "system")?.content;

  const requestBody: Record<string, unknown> = {
    model: settings.model,
    messages: anthropicMessages,
    stream: true,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  if (settings.extendedThinking) {
    requestBody.thinking = {
      type: "enabled",
      budget_tokens: 10000,
    };
    requestBody.max_tokens = 8192;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || JSON.stringify(errorData);
    } catch {
      const text = await response.text();
      if (text) errorMessage = text.slice(0, 500);
    }
    return NextResponse.json({ error: errorMessage }, { status: response.status });
  }

  return streamResponseWithQuota(response, settings.model, userId);
}

async function handleOpenAI(settings: LLMConfig, messages: Message[]) {
  const baseUrl = settings.baseUrl?.replace(/\/$/, "") || "";
  const url = baseUrl.includes("/v1") ? baseUrl : `${baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    }),
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch {
      const text = await response.text();
      if (text) errorMessage = text.slice(0, 500);
    }
    return NextResponse.json({ error: errorMessage }, { status: response.status });
  }

  return streamResponse(response, settings.model);
}

function streamResponse(response: Response, model?: string): Response {
  const stream = new ReadableStream({
    async start(controller) {
      if (model) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`event: model_name\ndata: ${model}\n\n`));
      }

      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (error) {
        console.error("Stream error:", error);
      } finally {
        try { reader.releaseLock(); } catch { /* ignore */ }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function streamResponseWithQuota(response: Response, model?: string, userId?: string): Response {
  const encoder = new TextEncoder();
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let usageEmitted = false;

  const stream = new ReadableStream({
    async start(controller) {
      if (model) {
        controller.enqueue(encoder.encode(`event: model_name\ndata: ${model}\n\n`));
      }

      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Track usage tokens from SSE data
          if (!usageEmitted && value) {
            const text = new TextDecoder().decode(value, { stream: true });
            const lines = text.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  // Parse usage from message_stop event
                  if (data.type === "message_delta" && data.usage) {
                    completionTokens = data.usage_tokens || data.usage.completion_tokens || 0;
                  }
                  if (data.type === "message_stop" && data.usage) {
                    promptTokens = data.usage.prompt_tokens || 0;
                    completionTokens = data.usage.completion_tokens || completionTokens;
                    totalTokens = promptTokens + completionTokens;
                  }
                } catch {
                  // Ignore parse errors for non-JSON lines
                }
              }
            }
          }

          controller.enqueue(value);
        }
      } catch (error) {
        console.error("Stream error:", error);
      } finally {
        // Consume tokens after stream completes
        if (userId && totalTokens > 0) {
          consumeTokens(userId, totalTokens).catch((err) =>
            console.error("Failed to consume tokens:", err)
          );
        }
        try { reader.releaseLock(); } catch { /* ignore */ }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
