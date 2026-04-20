"use client";

import { useState } from "react";
import { useChat } from "@/store/chatStore";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import SettingsModal from "./SettingsModal";
import ArtifactPanel from "./ArtifactPanel";
import AdminPanel from "./AdminPanel";

export default function ChatContainer() {
  const { state, dispatch, sendMessage, setActiveMode, userId } = useChat();
  const { conversations, currentConversationId, isLoading, activeArtifactId, activeMode, isSidebarOpen } = state;
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const currentConversation = conversations.find((c) => c.id === currentConversationId) || null;

  const handleSend = (content: string, options?: { extendedThinking?: boolean; webSearch?: boolean }) => {
    if (activeMode === "code" && !content.startsWith("[CODE_REQUEST]")) {
      content = `[CODE_REQUEST] ${content}`;
    }
    sendMessage(content, options);
  };

  const toggleSidebar = () => {
    dispatch({ type: "TOGGLE_SIDEBAR" });
  };

  return (
    <>
      <div className="ambient-orb hidden lg:block" />

      <div className="h-screen flex overflow-hidden" style={{ background: "var(--bg)", position: "relative", zIndex: 1 }}>
        {/* Mobile Sidebar Overlay */}
        <div
          className={`fixed inset-0 z-[99] transition-opacity duration-300 lg:hidden ${
            isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={toggleSidebar}
        />

        {/* Sidebar - Always present but transforms on mobile */}
        <div
          className={`fixed lg:relative z-[100] h-full transition-transform duration-300 ease-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
          style={{ width: "280px" }}
        >
          <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar} onOpenAdmin={() => setShowAdminPanel(true)} />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Header onToggleSidebar={toggleSidebar} />

          <MessageList
            conversation={currentConversation}
            isLoading={isLoading}
          />

          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>

        {activeArtifactId && <ArtifactPanel />}

        <SettingsModal />

        {userId === "admin" && showAdminPanel && (
          <AdminPanel isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} />
        )}
      </div>
    </>
  );
}
