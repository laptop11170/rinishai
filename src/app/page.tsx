"use client";

import { useState, useEffect } from "react";
import ChatContainer from "@/components/ChatContainer";
import Login from "@/components/Login";
import { ChatProvider } from "@/store/chatStore";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Create default admin if not exists
        await fetch("/api/setup", { method: "POST" });

        // Check if user is authenticated
        const res = await fetch("/api/auth");
        if (res.ok) {
          const data = await res.json();
          if (data.userId) {
            setUserId(data.userId);
            setUsername(data.username || data.userId);
          }
        }
      } catch {
        // Continue to login
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  const handleLogin = (loggedInUserId: string, loggedInUsername: string) => {
    setUserId(loggedInUserId);
    setUsername(loggedInUsername);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ChatProvider userId={userId} username={username}>
      <ChatContainer />
    </ChatProvider>
  );
}