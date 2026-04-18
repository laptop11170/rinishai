"use client";

import { useRef, useEffect } from "react";
import { Square } from "lucide-react";
import MessageComponent from "./Message";
import { Conversation } from "@/lib/types";
import StreamingCursor from "./StreamingCursor";

interface MessageListProps {
  conversation: Conversation | null;
  isLoading: boolean;
  onStop?: () => void;
}

export default function MessageList({ conversation, isLoading, onStop }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, isLoading]);

  if (!conversation || conversation.messages.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center px-4"
        style={{ color: "var(--text-3)" }}
      >
        <div className="text-center">
          <img src="/logo.png" alt="Rinish AI" className="w-12 h-12 mx-auto mb-4 object-contain" />
          <h2 className="text-[17px] md:text-[17px] font-semibold mb-2" style={{ fontFamily: "var(--font-serif)", color: "var(--text)", letterSpacing: "-.01em" }}>
            Start a conversation
          </h2>
          <p className="text-[13px]">Configure your LLM settings and begin chatting</p>
        </div>
      </div>
    );
  }

  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const isStreaming = isLoading && lastMessage?.role === "assistant";

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10" style={{ paddingBottom: "180px" }}>
      <div className="max-w-[720px] mx-auto space-y-8 md:space-y-10">
        {conversation.messages.map((message, index) => (
          <div
            key={message.id}
            className="animate-msg-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <MessageComponent message={message} />
          </div>
        ))}

        {/* Streaming indicator with stop button */}
        {isStreaming && (
          <div className="flex items-start gap-3 animate-msg-in">
            <div
              className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(153,70,42,0.25)]"
              style={{ background: "var(--primary)" }}
            >
              <img src="/logo.png" alt="Rinish AI" className="w-[28px] h-[28px] rounded-[8px] object-contain" style={{ boxShadow: "0 2px 6px rgba(153,70,42,0.25)" }} />
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] border" style={{ background: "var(--surface)", borderColor: "var(--border-md)" }}>
              <StreamingCursor />
              {onStop && (
                <button
                  onClick={onStop}
                  className="p-1.5 rounded-[6px] transition-colors"
                  style={{ background: "transparent" }}
                  title="Stop generation"
                >
                  <Square className="w-4 h-4" style={{ color: "var(--text-3)" }} />
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}