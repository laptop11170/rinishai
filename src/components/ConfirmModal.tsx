"use client";

import { X, AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]" onClick={onCancel}>
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="bg-[var(--surface)] rounded-2xl border border-[var(--border-md)] shadow-xl w-full max-w-sm overflow-hidden"
          style={{ boxShadow: "var(--shadow-lg)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: destructive ? "rgba(239,68,68,0.1)" : "rgba(153,70,42,0.1)" }}
              >
                <AlertTriangle
                  className="w-5 h-5"
                  style={{ color: destructive ? "#ef4444" : "var(--primary)" }}
                />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold" style={{ color: "var(--text)" }}>
                  {title}
                </h3>
              </div>
            </div>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              {message}
            </p>
          </div>
          <div
            className="flex border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 text-[14px] font-medium transition-colors"
              style={{ color: "var(--text-2)" }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3.5 text-[14px] font-medium transition-colors border-l"
              style={{
                borderColor: "var(--border)",
                color: destructive ? "#ef4444" : "var(--primary)",
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}