"use client";

import { X, FileText, Image, FileSpreadsheet, File } from "lucide-react";
import { AttachedFile } from "@/lib/types";

interface FileChipProps {
  file: AttachedFile;
  onRemove: (id: string) => void;
}

const fileIcons: Record<string, React.ReactNode> = {
  "image/": <Image className="w-3.5 h-3.5" />,
  "text/": <FileText className="w-3.5 h-3.5" />,
  "application/pdf": <File className="w-3.5 h-3.5" />,
  "application/json": <FileSpreadsheet className="w-3.5 h-3.5" />,
};

export default function FileChip({ file, onRemove }: FileChipProps) {
  const getIcon = () => {
    for (const [type, icon] of Object.entries(fileIcons)) {
      if (file.type.startsWith(type)) {
        return icon;
      }
    }
    return <File className="w-3.5 h-3.5" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#27272a] rounded-lg text-xs">
      {getIcon()}
      <span className="max-w-[100px] truncate">{file.name}</span>
      <span className="text-[#71717a]">({formatSize(file.size)})</span>
      <button
        onClick={() => onRemove(file.id)}
        className="p-0.5 rounded hover:bg-[#3f3f46] transition-colors"
      >
        <X className="w-3 h-3 text-[#a1a1aa]" />
      </button>
    </div>
  );
}
