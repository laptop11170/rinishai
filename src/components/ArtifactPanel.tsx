"use client";

import { X, Code, FileText, Table, FileJson, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useChat } from "@/store/chatStore";
import { Artifact, ArtifactType } from "@/lib/types";
import { useState, useEffect } from "react";

const artifactIcons: Record<ArtifactType, React.ReactNode> = {
  document: <FileText className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
  table: <Table className="w-4 h-4" />,
  html: <Code className="w-4 h-4" />,
  json: <FileJson className="w-4 h-4" />,
};

export default function ArtifactPanel() {
  const { state, setActiveArtifact, updateArtifact } = useChat();
  const { activeArtifactId, currentConversationId } = state;
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const conversation = state.conversations.find((c) => c.id === currentConversationId);
  const artifact = activeArtifactId && activeArtifactId !== "" ? conversation?.artifacts[activeArtifactId] : undefined;

  const artifactList = conversation ? Object.values(conversation.artifacts) : [];

  useEffect(() => {
    if (artifact) {
      setEditContent(artifact.content);
    }
  }, [artifact?.id]);

  if (!artifact) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    updateArtifact(artifact.id, {
      content: editContent,
      updatedAt: Date.now(),
    });
    setIsEditing(false);
  };

  return (
    <div className="w-full md:w-96 bg-[var(--surface)] border-l border-[var(--border-md)] flex flex-col h-full fixed md:relative right-0 top-0 bottom-0 z-30">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-md)]">
        <div className="flex items-center gap-2">
          {artifactIcons[artifact.type]}
          <span className="font-medium text-[13px] md:text-[14px]" style={{ color: "var(--text)" }}>{artifact.title || artifact.type}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded transition-colors"
            title="Copy content"
            style={{ background: "transparent", color: "var(--text-3)" }}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setActiveArtifact(null)}
            className="p-1.5 rounded transition-colors"
            title="Close panel"
            style={{ background: "transparent", color: "var(--text-3)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-64 md:h-96 rounded-xl p-3 text-[13px] md:text-[14px] resize-none focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              style={{
                background: "var(--bg-warm)",
                border: "1px solid var(--border-md)",
                color: "var(--text)",
                fontFamily: "var(--font-mono)"
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={{ background: "var(--primary)", color: "#fff" }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditContent(artifact.content);
                  setIsEditing(false);
                }}
                className="px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={{ background: "var(--border)", color: "var(--text-2)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <pre className="text-[13px] md:text-[14px] whitespace-pre-wrap break-words" style={{ fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>
            {artifact.content}
          </pre>
        )}
      </div>

      <div className="border-t border-[var(--border-md)] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] md:text-[12px]" style={{ color: "var(--text-3)" }}>Artifacts ({artifactList.length})</span>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-[11px] md:text-[12px] transition-colors"
            style={{ color: "var(--primary)" }}
          >
            {isEditing ? "Preview" : "Edit"}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {artifactList.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveArtifact(a.id)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] md:text-[12px] whitespace-nowrap transition-colors"
              style={{
                background: a.id === activeArtifactId ? "var(--primary)" : "var(--bg-warm)",
                color: a.id === activeArtifactId ? "#fff" : "var(--text-2)",
                border: "1px solid var(--border-md)"
              }}
            >
              {artifactIcons[a.type]}
              {a.title || a.type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
