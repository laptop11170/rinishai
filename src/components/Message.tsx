"use client";

import { useState } from "react";
import { Copy, Check, FileCode2, ThumbsUp, ThumbsDown, RotateCw } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import ThinkingBlock from "./ThinkingBlock";
import StreamingCursor from "./StreamingCursor";
import { Message } from "@/lib/types";
import { useChat } from "@/store/chatStore";

interface MessageProps {
  message: Message;
}

export default function MessageComponent({ message }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const { state, addArtifact, setActiveArtifact } = useChat();
  const { currentConversationId, activeModelName, settings } = state;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateArtifact = () => {
    if (!currentConversationId) return;

    // Extract code blocks from markdown
    const codeBlocks: { language: string; code: string }[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      codeBlocks.push({
        language: match[1] || "text",
        code: match[2].trim(),
      });
    }

    if (codeBlocks.length === 0) {
      addArtifact({
        id: `artifact-${Date.now()}`,
        type: "document",
        title: "Generated Document",
        content: message.content,
        metadata: {},
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      codeBlocks.forEach((block, index) => {
        addArtifact({
          id: `artifact-${Date.now()}-${index}`,
          type: "code",
          title: `Code ${index + 1}`,
          content: block.code,
          language: block.language,
          metadata: {},
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });
    }
  };

  const isUser = message.role === "user";
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const getRelativeTime = () => {
    const now = new Date();
    const msgTime = new Date(message.timestamp);
    const diffMs = now.getTime() - msgTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    return formattedTime;
  };

  const isStreaming = !message.content && !isUser;

  if (isUser) {
    return (
      <div className="flex justify-end animate-msg-in">
        <div
          className="max-w-[85%] md:max-w-[74%] rounded-[16px_16px_6px_16px] md:rounded-[22px_22px_8px_22px] px-4 md:px-5 py-3 md:py-4"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-md)",
            boxShadow: "var(--shadow-xs)",
            color: "var(--text)",
          }}
        >
          {message.attachedImages && message.attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.attachedImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.data}
                    alt={img.name}
                    className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                    style={{ border: "1px solid var(--border)" }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs truncate max-w-[180px] px-2">{img.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {message.content && (
            <p className="text-[14px] md:text-[15px] leading-[1.6]" style={{ color: "var(--text)" }}>
              {message.content}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-msg-in">
      {/* AI Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(153,70,42,0.25)]"
          style={{ background: "var(--primary)" }}
        >
          <svg viewBox="0 0 20 20" className="w-[14px] h-[14px] fill-white">
            <path d="M10 2C6.13 2 3 5.13 3 9c0 2.1 1.3 3.8 2.5 5 .7.7 1.1 1.3 1.1 2v1c0 .55.45 1 1 1h4.8c.55 0 1-.45 1-1v-1c0-.7.4-1.3 1.1-2C15.7 12.8 17 11.1 17 9c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
        <span className="text-[13px] font-semibold" style={{ color: "var(--text)", letterSpacing: "-.01em" }}>
          Rinish AI
        </span>
        {message.role === "assistant" && activeModelName && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded border"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-3)" }}
          >
            {activeModelName}
          </span>
        )}
        <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
          {getRelativeTime()}
        </span>
      </div>

      {/* Thinking Block */}
      {message.thinking && (
        <ThinkingBlock thinking={message.thinking} />
      )}

      {/* Message Content */}
      <div className="pl-[38px]">
        {isStreaming ? (
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--text-3)" }}>Thinking</span>
            <StreamingCursor />
          </div>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </div>

      {/* Message Actions */}
      {!isStreaming && (
        <div className="flex items-center gap-0.5 pl-[38px]">
          <button
            onClick={handleCopy}
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border-none transition-colors"
            style={{ background: "transparent", color: "var(--text-3)" }}
            title="Copy response"
          >
            {copied ? (
              <Check className="w-[14px] h-[14px]" style={{ color: "#22c55e" }} />
            ) : (
              <Copy className="w-[14px] h-[14px]" style={{ strokeWidth: 1.8 }} />
            )}
          </button>
          <button
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border-none transition-colors"
            style={{ background: "transparent", color: "var(--text-3)" }}
            title="Good response"
          >
            <ThumbsUp className="w-[14px] h-[14px]" style={{ strokeWidth: 1.8 }} />
          </button>
          <button
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border-none transition-colors"
            style={{ background: "transparent", color: "var(--text-3)" }}
            title="Poor response"
          >
            <ThumbsDown className="w-[14px] h-[14px]" style={{ strokeWidth: 1.8 }} />
          </button>
          <button
            onClick={handleCreateArtifact}
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border-none transition-colors"
            style={{ background: "transparent", color: "var(--text-3)" }}
            title="Open in artifact"
          >
            <FileCode2 className="w-[14px] h-[14px]" style={{ strokeWidth: 1.8 }} />
          </button>
          <button
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] border-none transition-colors"
            style={{ background: "transparent", color: "var(--text-3)" }}
            title="Regenerate"
          >
            <RotateCw className="w-[14px] h-[14px]" style={{ strokeWidth: 1.8 }} />
          </button>
        </div>
      )}
    </div>
  );
}