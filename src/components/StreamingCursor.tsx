"use client";

export default function StreamingCursor() {
  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-block w-1.5 h-3.5 rounded-sm"
        style={{
          background: "var(--primary)",
          animation: "pulse 1s ease-in-out infinite"
        }}
      />
    </div>
  );
}