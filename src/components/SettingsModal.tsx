"use client";

import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Save, Key, Clock, Zap } from "lucide-react";
import { useChat } from "@/store/chatStore";
import { LLMConfig, DEFAULT_OPUSMAX_CONFIG, OPUSMAX_MODELS } from "@/lib/types";

const PROVIDER_OPTIONS = [
  { value: "anthropic", label: "Anthropic", icon: "🤖", description: "Official Anthropic API" },
  { value: "opusmax", label: "OpusMax", icon: "⚡", description: "Claude models via OpusMax" },
  { value: "openai", label: "OpenAI / Other", icon: "🔌", description: "OpenAI-compatible APIs" },
];

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
  ],
  openai: [
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
  ],
};

export default function SettingsModal() {
  const { state, dispatch } = useChat();
  const { settings, isSettingsOpen } = state;

  const [formData, setFormData] = useState<LLMConfig>(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{
    windowTokensUsed?: number;
    windowTokenLimit?: number;
    planName?: string;
    expiresAt?: string;
  } | null>(null);
  const [checkingKey, setCheckingKey] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Check OpusMax key status via proxy to avoid CORS
  const checkKeyStatus = async (apiKey: string) => {
    if (!apiKey || formData.provider !== "opusmax") return;
    setCheckingKey(true);
    try {
      const response = await fetch(`/api/key-status?key=${encodeURIComponent(apiKey)}`);
      if (response.ok) {
        const data = await response.json();
        setKeyStatus(data);
      }
    } catch {
      setKeyStatus(null);
    }
    setCheckingKey(false);
  };

  // Handle close action
  const handleClose = () => {
    dispatch({ type: "TOGGLE_SETTINGS" });
    setKeyStatus(null);
  };

  const handleSave = () => {
    dispatch({ type: "SET_SETTINGS", payload: formData });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (field: keyof LLMConfig, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "provider") {
        if (value === "anthropic") {
          updated.baseUrl = "https://api.anthropic.com";
        } else if (value === "opusmax") {
          updated.baseUrl = "https://api.opusmax.pro/v1";
        } else {
          updated.baseUrl = "";
        }
      }
      return updated;
    });
  };

  const handleApiKeyBlur = () => {
    if (formData.provider === "opusmax" && formData.apiKey) {
      checkKeyStatus(formData.apiKey);
    }
  };

  const modelSuggestions = MODEL_SUGGESTIONS[formData.provider] || [];

  // Calculate usage percentage for OpusMax
  const usagePercent = keyStatus?.windowTokenLimit
    ? Math.round((Number(keyStatus.windowTokensUsed) / Number(keyStatus.windowTokenLimit)) * 100)
    : 0;

  // Early return AFTER all hooks are called
  if (!isSettingsOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: "20px" }}
      >
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-[17px] md:text-xl font-semibold" style={{ color: "var(--text)" }}>LLM Settings</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg transition-colors"
            style={{ background: "transparent", color: "var(--text-3)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 md:space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDER_OPTIONS.map((provider) => (
                <button
                  key={provider.value}
                  onClick={() => handleChange("provider", provider.value)}
                  className={`p-2 md:p-3 rounded-lg border transition-all text-center`}
                  style={{
                    background: formData.provider === provider.value ? "rgba(153, 70, 42, 0.1)" : "var(--surface)",
                    borderColor: formData.provider === provider.value ? "var(--primary)" : "var(--border-md)",
                    color: formData.provider === provider.value ? "var(--primary)" : "var(--text-2)",
                  }}
                >
                  <span className="text-xl md:text-2xl mb-1 block">{provider.icon}</span>
                  <span className="font-medium text-[12px] md:text-sm">{provider.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium mb-2">
              API Key <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={formData.apiKey}
                onChange={(e) => handleChange("apiKey", e.target.value)}
                onBlur={handleApiKeyBlur}
                placeholder={formData.provider === "opusmax" ? "Enter OpusMax API key" : "sk-..."}
                className="w-full bg-[var(--surface)] border border-[var(--border-md)] rounded-xl px-4 py-3 pr-12 text-[14px] md:text-[15px] placeholder-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                style={{ color: "var(--text)" }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                style={{ color: "var(--text-3)" }}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* OpusMax key status */}
            {formData.provider === "opusmax" && formData.apiKey && (
              <div className="mt-3">
                {checkingKey ? (
                  <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-3)" }}>
                    <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    Checking key status...
                  </div>
                ) : keyStatus ? (
                  <div className="rounded-xl p-3 border" style={{ background: "var(--bg-warm)", borderColor: "var(--border-md)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] md:text-[12px]" style={{ color: "var(--text-3)" }}>Token Usage</span>
                      <span className="text-[11px] md:text-[12px]" style={{ color: "var(--text-2)" }}>
                        {Number(keyStatus.windowTokensUsed).toLocaleString()} / {Number(keyStatus.windowTokenLimit).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-md)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(usagePercent, 100)}%`,
                          background: usagePercent > 80 ? "#ef4444" : usagePercent > 50 ? "#eab308" : "var(--primary)"
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] md:text-[12px]" style={{ color: "var(--text-3)" }}>{keyStatus.planName} Plan</span>
                      {keyStatus.expiresAt && (
                        <span className="text-[11px] md:text-[12px] flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                          <Clock className="w-3 h-3" />
                          Expires: {new Date(keyStatus.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Model selection - only for Anthropic and OpenAI (OpusMax uses chat bar selector) */}
          {formData.provider !== "opusmax" && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Model <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange("model", e.target.value)}
                placeholder={
                  formData.provider === "anthropic"
                    ? "claude-sonnet-4-20250514"
                    : "gpt-4o"
                }
                className="w-full bg-[var(--surface)] border border-[var(--border-md)] rounded-xl px-4 py-3 text-[14px] md:text-[15px] placeholder-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                style={{ color: "var(--text)" }}
              />
              {modelSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[11px]" style={{ color: "var(--text-3)" }}>Suggestions:</span>
                  {modelSuggestions.map((model) => (
                    <button
                      key={model}
                      onClick={() => handleChange("model", model)}
                      className="text-[11px] px-2 py-1 rounded-lg transition-colors"
                      style={{ background: "var(--bg-warm)", color: "var(--text-2)", border: "1px solid var(--border-md)" }}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Base URL - only show for OpenAI/custom */}
          {formData.provider === "openai" && (
            <div>
              <label className="block text-sm font-medium mb-2">
                API Host
              </label>
              <input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => handleChange("baseUrl", e.target.value)}
                placeholder="https://api.openai.com"
                className="w-full bg-[var(--surface)] border border-[var(--border-md)] rounded-xl px-4 py-3 text-[14px] md:text-[15px] placeholder-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                style={{ color: "var(--text)" }}
              />
              <p className="text-[11px] md:text-[12px] mt-1" style={{ color: "var(--text-3)" }}>
                Leave empty for default OpenAI endpoint
              </p>
            </div>
          )}

          {/* Provider info */}
          {formData.provider === "opusmax" && (
            <div className="rounded-xl p-4 border" style={{ background: "rgba(153, 70, 42, 0.05)", borderColor: "rgba(153, 70, 42, 0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span className="font-medium text-[14px]" style={{ color: "var(--text)" }}>OpusMax</span>
              </div>
              <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
                Access Claude models through OpusMax proxy. All Anthropic Claude models
                are available with streaming support and extended thinking.
              </p>
              <p className="text-[12px] mt-2" style={{ color: "var(--text-3)" }}>
                Leave API key empty to use the admin-provided key, or enter your own to override.
              </p>
            </div>
          )}

          {formData.provider === "anthropic" && (
            <div className="rounded-xl p-4 border" style={{ background: "var(--bg-warm)", borderColor: "var(--border-md)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4" style={{ color: "var(--text-2)" }} />
                <span className="font-medium text-[14px]" style={{ color: "var(--text)" }}>Anthropic API</span>
              </div>
              <p className="text-[13px]" style={{ color: "var(--text-2)" }}>
                Using Anthropic&apos;s native API with full support for streaming,
                thinking, and all Claude features.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: "var(--border-md)" }}>
          <button onClick={handleClose} className="btn">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary flex items-center justify-center gap-2">
            {saved ? (
              <span>Saved!</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}