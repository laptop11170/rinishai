import { LLMConfig, StreamChunk, ContentBlock } from "./types";

export class LLMProvider {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async *sendMessage(
    messages: { role: string; content: string | ContentBlock[] }[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const url = this.config.provider === "anthropic"
      ? `${this.config.baseUrl}/v1/messages`
      : `${this.config.baseUrl}/v1/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.provider === "anthropic") {
      headers["x-api-key"] = this.config.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      headers["anthropic-dangerous-direct-browser-access"] = "true";
    } else {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      stream: true,
    };

    if (this.config.provider === "anthropic") {
      const systemMessage = messages.find(m => m.role === "system");
      if (systemMessage) {
        body.system = typeof systemMessage.content === "string" ? systemMessage.content : "";
        body.messages = messages.filter(m => m.role !== "system");
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              yield { type: "done" };
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (currentEvent === "content_block_delta") {
                if (parsed.delta?.type === "text_delta" && parsed.delta?.text) {
                  yield { type: "content", content: parsed.delta.text };
                }
                if (parsed.delta?.type === "thinking_delta" && parsed.delta?.thinking) {
                  yield { type: "thinking", content: parsed.delta.thinking };
                }
              } else if (parsed.choices?.[0]?.delta) {
                const delta = parsed.choices[0].delta;
                if (delta?.content) {
                  yield { type: "content", content: delta.content };
                }
                if (delta?.thinking) {
                  yield { type: "thinking", content: delta.thinking };
                }
              }
            } catch {
              // Skip malformed JSON
            }
            currentEvent = "";
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  updateConfig(config: LLMConfig) {
    this.config = config;
  }
}