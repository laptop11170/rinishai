"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block my-4">
      <div className="code-block-header">
        <span className="code-block-language">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-[#3f3f46] transition-colors"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-[#a1a1aa]" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto">
        <code className={`language-${language || "plaintext"}`}>{code}</code>
      </pre>
    </div>
  );
}