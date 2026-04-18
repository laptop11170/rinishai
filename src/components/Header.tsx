"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, Settings, Plus, ChevronDown, Bot, Zap, Sparkles, Cpu, Key } from "lucide-react";
import { useChat } from "@/store/chatStore";
import { LLMConfig, OPUSMAX_MODELS } from "@/lib/types";

interface ModelOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  provider: "anthropic" | "openai" | "opusmax";
  beta?: boolean;
}

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    description: "Balanced performance",
    icon: <Bot className="w-4 h-4" />,
    provider: "anthropic",
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    description: "Most capable model",
    icon: <Sparkles className="w-4 h-4" />,
    provider: "anthropic",
  },
  {
    id: "claude-haiku-4-20250501",
    name: "Claude Haiku 4",
    description: "Fast, lightweight",
    icon: <Zap className="w-4 h-4" />,
    provider: "anthropic",
  },
  ...OPUSMAX_MODELS.map((m) => ({
    id: m.id,
    name: m.name + (m.beta ? " (Beta)" : ""),
    description: m.description,
    icon: <Key className="w-4 h-4" />,
    provider: "opusmax" as const,
    beta: m.beta,
  })),
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "OpenAI flagship",
    icon: <Cpu className="w-4 h-4" />,
    provider: "openai",
  },
];

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { dispatch, state, createNewConversation } = useChat();
  const { settings, conversations, currentConversationId } = state;
  const [showModelSelector, setShowModelSelector] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);
  const currentModel = MODEL_OPTIONS.find((m) => m.id === settings.model);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowModelSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleModelSelect = (model: ModelOption) => {
    const newSettings: LLMConfig = {
      ...settings,
      model: model.id,
      provider: model.provider,
    };
    dispatch({ type: "SET_SETTINGS", payload: newSettings });
    setShowModelSelector(false);
  };

  const getModelIcon = () => {
    if (settings.provider === "opusmax") {
      return <Key className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />;
    }
    const model = MODEL_OPTIONS.find((m) => m.id === settings.model);
    return model?.icon || <Bot className="w-3.5 h-3.5" />;
  };

  return (
    <header
      className="h-12 md:h-14 flex items-center justify-between px-3 md:px-6 border-b flex-shrink-0"
      style={{
        background: "rgba(247, 245, 242, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "var(--border)",
        position: "relative",
        zIndex: 60,
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg transition-colors active:scale-95"
          style={{ background: "transparent", color: "var(--text-2)" }}
          title="Toggle sidebar"
        >
          <Menu className="w-5 h-5 md:w-5 md:h-5" style={{ strokeWidth: 1.8 }} />
        </button>
        <span className="text-[13px] md:text-[14px] font-medium truncate max-w-[80px] sm:max-w-[120px] md:max-w-none" style={{ color: "var(--text)" }}>
          {currentConversation?.title || "New chat"}
        </span>
        <span
          className="text-[9px] md:text-[11px] px-2 md:px-3 py-1 rounded-full border hidden sm:inline-flex"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-md)",
            color: "var(--text-3)",
          }}
        >
          {currentModel?.name || "Model"}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => createNewConversation()}
          className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg transition-colors active:scale-95"
          style={{ background: "transparent", color: "var(--text-2)" }}
          title="New chat"
        >
          <Plus className="w-5 h-5 md:w-5 md:h-5" style={{ strokeWidth: 2 }} />
        </button>
        <button
          onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
          className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg transition-colors active:scale-95"
          style={{ background: "transparent", color: "var(--text-2)" }}
          title="Settings"
        >
          <Settings className="w-5 h-5 md:w-5 md:h-5" style={{ strokeWidth: 1.8 }} />
        </button>
      </div>
    </header>
  );
}
