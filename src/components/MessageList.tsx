"use client";

import { useRef, useEffect } from "react";
import MessageComponent from "./Message";
import { Conversation } from "@/lib/types";
import StreamingCursor from "./StreamingCursor";

interface MessageListProps {
  conversation: Conversation | null;
  isLoading: boolean;
}

export default function MessageList({ conversation, isLoading }: MessageListProps) {
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

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}