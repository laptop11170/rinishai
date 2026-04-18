"use client";

import { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";

interface ThinkingBlockProps {
  thinking: string;
}

export default function ThinkingBlock({ thinking }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thinking || thinking.trim().length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-[14px] overflow-hidden my-4"
      style={{
        background: "linear-gradient(135deg, var(--primary-xlt) 0%, var(--bg-warm) 100%)",
        border: "1px solid var(--border-md)",
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left flex items-center gap-2 px-4 py-3 transition-colors cursor-pointer"
        style={{ background: "rgba(153, 70, 42, 0.03)" }}
      >
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "var(--primary)", opacity: 0.8 }}
        >
          <Brain className="w-3 h-3 text-white" style={{ strokeWidth: 2.5 }} />
        </div>
        <span className="text-[12px] font-medium" style={{ color: "var(--primary)" }}>
          Thinking process
        </span>
        <span className="text-[11px] ml-1" style={{ color: "var(--text-3)" }}>
          {thinking.length > 50 ? thinking.slice(0, 50).trim() + "..." : thinking.slice(0, 50)}
        </span>
        <ChevronDown
          className="w-4 h-4 ml-auto"
          style={{
            color: "var(--text-3)",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>
      {isExpanded && (
        <div
          className="px-4 py-4"
          style={{
            fontSize: "13px",
            lineHeight: "1.7",
            color: "var(--text-2)",
            borderTop: "1px solid var(--border)",
            background: "rgba(255,255,255,0.5)",
          }}
        >
          {thinking}
        </div>
      )}
    </div>
  );
}