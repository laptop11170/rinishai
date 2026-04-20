"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Upload, Paperclip, Globe, BrainCircuit, Terminal, Sparkles, ChevronDown } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useChat } from "@/store/chatStore";
import { AttachedFile, LLMConfig, OPUSMAX_MODELS } from "@/lib/types";
import FileChip from "./FileChip";

const OPUSMAX_MODEL_OPTIONS = OPUSMAX_MODELS.map((m) => ({
  id: m.id,
  name: m.name.replace("Claude ", ""),
  icon: <Sparkles className="w-3 h-3" />,
  beta: m.beta,
}));

interface ChatInputProps {
  onSend: (message: string, options?: { extendedThinking?: boolean; webSearch?: boolean }) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state, dispatch, attachFile, removeFile, setActiveMode, stopGeneration } = useChat();
  const { attachedFiles, activeMode, settings } = state;

  // Get current model options (always OpusMax since selector only shows for OpusMax)
  const getModelOptions = () => OPUSMAX_MODEL_OPTIONS;

  const getCurrentModelName = () => {
    const model = OPUSMAX_MODELS.find((m) => m.id === settings.model);
    return model?.name.replace("Claude ", "") || "Select Model";
  };

  const getCurrentModelIcon = () => {
    return <Sparkles className="w-3 h-3" />;
  };

  // Close model selector on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(e.target as Node)) {
        setShowModelSelector(false);
        setDropdownPosition(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleModelSelect = (modelId: string) => {
    const newSettings: LLMConfig = { ...settings, model: modelId };
    dispatch({ type: "SET_SETTINGS", payload: newSettings });
    setShowModelSelector(false);
    setDropdownPosition(null);
  };

  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const toggleModelDropdown = (e: React.MouseEvent) => {
    if (!showModelSelector) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const dropdownHeight = 240; // Approximate height of dropdown
      const dropdownWidth = 260;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let top = rect.bottom + 8; // Below button with gap
      let left = rect.left;

      // Flip to above if not enough space below
      if (top + dropdownHeight > viewportHeight - 20) {
        top = rect.top - dropdownHeight - 8;
      }

      // Ensure doesn't go off right edge
      if (left + dropdownWidth > viewportWidth - 20) {
        left = viewportWidth - dropdownWidth - 20;
      }

      // Ensure doesn't go off left edge
      if (left < 20) {
        left = 20;
      }

      setDropdownPosition({ top, left });
    } else {
      setDropdownPosition(null);
    }
    setShowModelSelector(!showModelSelector);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [message]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachedFile: AttachedFile = {
          id: uuidv4(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result as string,
        };
        attachFile(attachedFile);
      };
      reader.readAsDataURL(file);
    });
  }, [attachFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim() && !isLoading) {
      // Determine options based on active mode
      const options: { extendedThinking?: boolean; webSearch?: boolean } = {};

      if (activeMode === "deepResearch") {
        options.extendedThinking = true;
      } else if (activeMode === "webSearch") {
        options.webSearch = true;
      }

      onSend(message.trim(), options);

      // Reset after sending
      setMessage("");
      setActiveMode("none");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleModeToggle = (mode: "deepResearch" | "webSearch" | "code") => {
    if (activeMode === mode) {
      setActiveMode("none");
    } else {
      setActiveMode(mode);
    }
  };

  const getChipStyle = (mode: "deepResearch" | "webSearch" | "code") => {
    const isActive = activeMode === mode;
    return {
      background: isActive ? "var(--primary-xlt)" : "transparent",
      borderColor: isActive ? "rgba(153,70,42,0.2)" : "var(--border-md)",
      color: isActive ? "var(--primary)" : "var(--text-2)",
    };
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-4 md:pb-6"
      style={{ background: "linear-gradient(to top, var(--bg) 70%, transparent)", pointerEvents: "none", zIndex: 50 }}
    >
      {/* Input Box */}
      <div
        className="max-w-[720px] mx-auto overflow-hidden"
        style={{
          pointerEvents: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border-md)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          transition: "box-shadow 0.2s, border-color 0.2s",
        }}
      >
        {/* Attached Files */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 md:p-4 border-b" style={{ borderColor: "var(--border)" }}>
            {attachedFiles.map((file) => (
              <FileChip key={file.id} file={file} onRemove={removeFile} />
            ))}
          </div>
        )}

        {/* Drag Overlay */}
        {isDragOver && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-[32px]"
            style={{ background: "rgba(153, 70, 42, 0.1)", border: "2px dashed var(--primary)" }}
          >
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--primary)" }} />
              <span className="text-sm" style={{ color: "var(--primary)" }}>Drop files to attach</span>
            </div>
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-end gap-2 p-3 md:p-4 pb-3">
          {/* Attach Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-[38px] h-[38px] md:w-[34px] md:h-[34px] flex items-center justify-center rounded-[10px] border transition-colors flex-shrink-0"
            style={{
              background: "transparent",
              borderColor: "var(--border-md)",
              color: "var(--text-3)",
            }}
            title="Attach files"
          >
            <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" style={{ stroke: "currentColor", strokeWidth: 1.8, fill: "none" }}>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              activeMode === "deepResearch"
                ? "Ask a deep research question..."
                : activeMode === "webSearch"
                ? "Search the web..."
                : activeMode === "code"
                ? "Describe code to generate..."
                : "Ask Rinish AI about anything…"
            }
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] md:text-[15px] leading-[1.6] placeholder-[var(--text-3)]"
            style={{ color: "var(--text)", minHeight: "24px", maxHeight: "160px" }}
          />

          {/* Send / Stop Button */}
          <button
            type="submit"
            onClick={() => {
              if (isLoading) {
                stopGeneration();
              } else {
                handleSubmit();
              }
            }}
            disabled={!message.trim() && !isLoading}
            className="w-[40px] h-[40px] md:w-[36px] md:h-[36px] flex items-center justify-center rounded-[11px] border-none transition-all flex-shrink-0"
            style={{
              background: isLoading ? "var(--error, #ef4444)" : (message.trim() ? "var(--primary)" : "var(--border)"),
              boxShadow: isLoading ? "0 2px 8px rgba(239,68,68,0.3)" : (message.trim() ? "0 2px 8px rgba(153,70,42,0.3)" : "none"),
              color: "#fff",
              alignSelf: "flex-end",
              marginBottom: "1px",
              cursor: (message.trim() || isLoading) ? "pointer" : "not-allowed",
            }}
            title={isLoading ? "Stop generating" : "Send message"}
          >
            {isLoading ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ stroke: "#fff", strokeWidth: 2.5, fill: "none" }}>
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ stroke: "#fff", strokeWidth: 2.2, fill: "none" }}>
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 md:px-4 pb-3 gap-2">
          {/* Left side: Mode chips */}
          <div className="flex flex-wrap gap-1.5 items-center w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
            {/* Web Search Chip */}
            <button
              onClick={() => handleModeToggle("webSearch")}
              className="flex items-center gap-1.5 px-2 py-1.5 md:py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-all border flex-shrink-0"
              style={getChipStyle("webSearch")}
              title="Web Search"
            >
              <Globe className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ strokeWidth: 2 }} />
              <span>Search</span>
            </button>

            {/* Deep Research Chip */}
            <button
              onClick={() => handleModeToggle("deepResearch")}
              className="flex items-center gap-1.5 px-2 py-1.5 md:py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-all border flex-shrink-0"
              style={getChipStyle("deepResearch")}
              title="Deep Research - Enable extended thinking"
            >
              <BrainCircuit className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ strokeWidth: 2 }} />
              <span>Deep</span>
            </button>

            {/* Code Chip */}
            <button
              onClick={() => handleModeToggle("code")}
              className="flex items-center gap-1.5 px-2 py-1.5 md:py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-all border flex-shrink-0"
              style={getChipStyle("code")}
              title="Code - Generate code and create artifact"
            >
              <Terminal className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ strokeWidth: 2 }} />
              <span>Code</span>
            </button>

            {/* Model Selector Chip - Only for OpusMax, right after Code */}
            {settings.provider === "opusmax" && (
              <div ref={modelSelectorRef} className="relative">
                <button
                  onClick={toggleModelDropdown}
                  className="flex items-center gap-1.5 px-2 py-1.5 md:py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium transition-all border flex-shrink-0"
                  style={{
                    background: showModelSelector ? "var(--primary-xlt)" : "transparent",
                    borderColor: showModelSelector ? "rgba(153,70,42,0.2)" : "var(--border-md)",
                    color: showModelSelector ? "var(--primary)" : "var(--text-2)",
                  }}
                  title="Select model"
                >
                  <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ strokeWidth: 2 }} />
                  <span>{getCurrentModelName()}</span>
                  <ChevronDown className="w-3 h-3" style={{ strokeWidth: 2, opacity: 0.6 }} />
                </button>

                {/* Model Dropdown - Floating dropdown that positions itself */}
                {showModelSelector && dropdownPosition && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-[99]"
                      onClick={() => { setShowModelSelector(false); setDropdownPosition(null); }}
                    />
                    {/* Dropdown panel - positioned below the button */}
                    <div
                      className="fixed bg-[var(--surface)] border border-[var(--border-md)] rounded-xl shadow-xl z-[100] w-[260px] overflow-hidden"
                      style={{
                        boxShadow: "var(--shadow-lg)",
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                      }}
                    >
                      {/* Header */}
                      <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" style={{ color: "var(--primary)" }} />
                          <span className="font-semibold text-[13px]" style={{ color: "var(--text)" }}>Select Model</span>
                        </div>
                      </div>
                      {/* Model options */}
                      <div className="p-1.5">
                        {getModelOptions().map((model) => (
                          <button
                            key={model.id}
                            onClick={() => handleModelSelect(model.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] transition-colors hover:bg-[var(--bg-warm)]"
                            style={{
                              background: settings.model === model.id ? "var(--primary-xlt)" : "transparent",
                            }}
                          >
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                              style={{
                                background: settings.model === model.id ? "var(--primary)" : "var(--bg-warm)",
                              }}
                            >
                              <Sparkles className="w-3.5 h-3.5" style={{ color: settings.model === model.id ? "#fff" : "var(--text-3)" }} />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span style={{ color: settings.model === model.id ? "var(--primary)" : "var(--text)", fontWeight: settings.model === model.id ? 600 : 500 }}>
                                  {model.name}
                                </span>
                                {model.beta && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(234,179,8,0.2)", color: "#eab308" }}>Beta</span>
                                )}
                              </div>
                            </div>
                            {settings.model === model.id && (
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--primary)" }} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right side: disclaimer */}
          <div className="hidden sm:flex items-center flex-shrink-0">
            <span className="text-[10px] md:text-[11px]" style={{ color: "var(--text-3)" }}>
              Rinish AI can make mistakes.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}