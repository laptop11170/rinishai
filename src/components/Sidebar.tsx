"use client";

import { useState, useMemo, useEffect } from "react";
import { useChat } from "@/store/chatStore";
import { Plus, Trash2, MessageSquare, Search, X, LogOut, Settings } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenAdmin?: () => void;
}

export default function Sidebar({ isOpen = true, onClose, onOpenAdmin }: SidebarProps) {
  const { state, dispatch, createNewConversation, userId, username, logout } = useChat();
  const { conversations, currentConversationId, searchQuery } = state;
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [usage, setUsage] = useState<{ usedTokens: number; limitTokens: number; windowHours: number; resetsAt: number } | null>(null);

  useEffect(() => {
    if (!userId || username === "yadish") return;
    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/usage");
        if (res.ok) {
          const data = await res.json();
          if (data.hasQuota) {
            setUsage({
              usedTokens: data.usedTokens || 0,
              limitTokens: data.limitTokens || 0,
              windowHours: data.windowHours || 5,
              resetsAt: data.resetsAt || 0,
            });
          }
        }
      } catch {
        // Ignore
      }
    };
    fetchUsage();
    // Refresh usage every minute
    const interval = setInterval(fetchUsage, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  // Confirmation modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    destructive: false,
  });

  const handleNewChat = () => {
    // Check if current conversation has messages
    const currentConv = conversations.find((c) => c.id === currentConversationId);
    if (currentConv && currentConv.messages.length > 0) {
      setConfirmModal({
        isOpen: true,
        title: "Start new chat?",
        message: "This will create a new conversation. Your current chat will be saved.",
        destructive: false,
        onConfirm: () => {
          createNewConversation();
          onClose?.();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      createNewConversation();
      onClose?.();
    }
  };

  const handleSelectConversation = (id: string) => {
    dispatch({ type: "SELECT_CONVERSATION", payload: id });
    onClose?.();
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const conversation = conversations.find((c) => c.id === id);
    setConfirmModal({
      isOpen: true,
      title: "Delete chat?",
      message: `"${conversation?.title || "Untitled"}" will be permanently deleted. This cannot be undone.`,
      destructive: true,
      onConfirm: () => {
        dispatch({ type: "DELETE_CONVERSATION", payload: id });
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    dispatch({ type: "SET_SEARCH_QUERY", payload: value });
  };

  const clearSearch = () => {
    setLocalSearch("");
    dispatch({ type: "SET_SEARCH_QUERY", payload: "" });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getRelativeTime = (timestamp: number) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 5) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return formatDate(timestamp);
  };

  const filteredConversations = useMemo(() => {
    if (!localSearch.trim()) return conversations;
    const query = localSearch.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.messages.some((msg) => msg.role === "user" && msg.content.toLowerCase().includes(query))
    );
  }, [conversations, localSearch]);

  const groupedConversations = useMemo(() => {
    const groups = { today: [] as typeof conversations, yesterday: [] as typeof conversations, thisWeek: [] as typeof conversations, older: [] as typeof conversations };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

    filteredConversations.forEach((conv) => {
      const time = conv.updatedAt;
      if (time >= todayStart) groups.today.push(conv);
      else if (time >= yesterdayStart) groups.yesterday.push(conv);
      else if (time >= weekStart) groups.thisWeek.push(conv);
      else groups.older.push(conv);
    });

    return groups;
  }, [filteredConversations]);

  return (
    <>
      <div
        className="w-full h-full flex flex-col bg-[var(--bg)]"
        style={{ background: "var(--bg-warm)", zIndex: 200, position: "relative" }}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Rinish AI Logo" className="w-8 h-8 rounded-xl object-contain" />
              <span className="text-base font-semibold" style={{ fontFamily: "var(--font-serif)", color: "var(--text)", letterSpacing: "-.01em" }}>
                Rinish AI
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors lg:hidden"
              style={{ background: "transparent", color: "var(--text-3)" }}
            >
              <X className="w-5 h-5" style={{ strokeWidth: 2 }} />
            </button>
          </div>

          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-[13px] transition-all active:scale-[0.98]"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-md)",
              color: "var(--text)",
            }}
          >
            <Plus className="w-4 h-4" style={{ strokeWidth: 2.5 }} />
            New chat
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-3)", strokeWidth: 2 }} />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[var(--surface)] border border-[var(--border-md)] rounded-lg pl-9 pr-8 py-2 text-[13px] focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ color: "var(--text)" }}
            />
            {localSearch && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded" style={{ color: "var(--text-3)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4" style={{ color: "var(--text-3)" }}>
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-[13px]">{localSearch ? "No results" : "No chats yet"}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {["today", "yesterday", "thisWeek", "older"].map((group) => {
                const items = groupedConversations[group as keyof typeof groupedConversations];
                if (items.length === 0) return null;
                const labels: Record<string, string> = { today: "Today", yesterday: "Yesterday", thisWeek: "This week", older: "Older" };
                return (
                  <div key={group}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: "var(--text-3)" }}>
                      {labels[group]}
                    </div>
                    <div className="space-y-0.5">
                      {items.map((conversation) => (
                        <div
                          key={conversation.id}
                          onClick={() => handleSelectConversation(conversation.id)}
                          className="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all active:scale-[0.98]"
                          style={{
                            background: currentConversationId === conversation.id ? "var(--surface)" : "transparent",
                            boxShadow: currentConversationId === conversation.id ? "var(--shadow-xs)" : "none",
                          }}
                        >
                          {currentConversationId === conversation.id && (
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--primary)" }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] truncate" style={{ color: currentConversationId === conversation.id ? "var(--text)" : "var(--text-2)", fontWeight: currentConversationId === conversation.id ? 500 : 400 }}>
                              {conversation.title}
                            </div>
                            <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                              {getRelativeTime(conversation.updatedAt)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteConversation(conversation.id, e)}
                            className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all"
                            style={{ background: "transparent" }}
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)]">
          <div
            className="flex items-center gap-2.5 p-2.5 rounded-xl transition-colors"
            style={{ background: "var(--surface)" }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[#c45e3a] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">
              {username?.slice(0, 2).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>{username}</div>
              <div className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>Logged in</div>
              {usage && usage.limitTokens > 0 && (
                <div className="mt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                      {usage.usedTokens.toLocaleString()} / {usage.limitTokens.toLocaleString()} tokens
                    </span>
                    {usage.resetsAt > 0 && (
                      <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                        Resets {new Date(usage.resetsAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-md)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((usage.usedTokens / usage.limitTokens) * 100, 100)}%`,
                        background: (usage.usedTokens / usage.limitTokens) > 0.8 ? "#ef4444" : (usage.usedTokens / usage.limitTokens) > 0.5 ? "#eab308" : "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            {username === "yadish" && (
              <button
                onClick={onOpenAdmin}
                className="p-1.5 rounded hover:opacity-70 transition-opacity"
                style={{ background: "transparent" }}
                title="Admin Panel"
              >
                <Settings className="w-4 h-4" style={{ color: "var(--text-3)" }} />
              </button>
            )}
            <button
              onClick={logout}
              className="p-1.5 rounded hover:opacity-70 transition-opacity"
              style={{ background: "transparent" }}
              title="Logout"
            >
              <LogOut className="w-4 h-4" style={{ color: "var(--text-3)" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.destructive ? "Delete" : "Continue"}
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        destructive={confirmModal.destructive}
      />
    </>
  );
}