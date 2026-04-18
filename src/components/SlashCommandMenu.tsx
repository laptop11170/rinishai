"use client";

import { useEffect, useRef } from "react";
import { SLASH_COMMANDS } from "@/lib/slash-commands";

interface SlashCommandMenuProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (command: string) => void;
  onClose: () => void;
}

export default function SlashCommandMenu({ query, position, onSelect, onClose }: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef(0);

  const filteredCommands = SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    selectedIndexRef.current = 0;
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndexRef.current = (selectedIndexRef.current + 1) % filteredCommands.length;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndexRef.current =
          (selectedIndexRef.current - 1 + filteredCommands.length) % filteredCommands.length;
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndexRef.current]) {
          onSelect(filteredCommands[selectedIndexRef.current].action(""));
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (filteredCommands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full mb-2 w-64 bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl overflow-hidden z-50"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-2 text-xs text-[#71717a] border-b border-[#27272a]">
        Commands
      </div>
      {filteredCommands.map((cmd, index) => (
        <button
          key={cmd.name}
          onClick={() => onSelect(cmd.action(""))}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
            index === selectedIndexRef.current
              ? "bg-[#8b5cf6] text-white"
              : "hover:bg-[#27272a] text-[#e4e4e7]"
          }`}
        >
          <span className="w-6 h-6 flex items-center justify-center bg-[#27272a] rounded text-xs">
            {cmd.icon}
          </span>
          <div>
            <div className="font-medium">/{cmd.name}</div>
            <div className={`text-xs ${index === selectedIndexRef.current ? "text-purple-200" : "text-[#71717a]"}`}>
              {cmd.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
