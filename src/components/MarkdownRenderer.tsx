"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") || "text";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-language">{language}</span>
        <div className="flex gap-1">
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
      </div>
      <pre className="overflow-x-auto p-4">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

function ArtifactPreview({ code, language }: { code: string; language: string }) {
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // For HTML, create a blob URL for preview
  const getPreviewUrl = () => {
    if (language === "html") {
      return `data:text/html;charset=utf-8,${encodeURIComponent(code)}`;
    }
    return null;
  };

  const previewUrl = getPreviewUrl();

  return (
    <div className="mt-3 border border-[#8b5cf6] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[#8b5cf6]/10 border-b border-[#8b5cf6]/30">
        <span className="text-xs font-medium text-[#c4b5fd]">Artifact Preview</span>
        <div className="flex gap-1">
          {previewUrl && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-1.5 rounded hover:bg-[#3f3f46] transition-colors"
              title="Preview"
            >
              <ExternalLink className="w-4 h-4 text-[#a1a1aa]" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-[#3f3f46] transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-[#a1a1aa]" />
            )}
          </button>
        </div>
      </div>
      {showPreview && previewUrl && (
        <iframe
          src={previewUrl}
          className="w-full h-64 bg-white"
          title="Preview"
          sandbox="allow-scripts"
        />
      )}
    </div>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Check if content contains code blocks that should be treated as artifacts
  const hasArtifactPattern = content.includes("```html") ||
                             content.includes("```svg") ||
                             content.includes("```python") ||
                             content.includes("```react");

  return (
    <div className="markdown-content text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;
            const language = match ? match[1] : "";
            const code = String(children).replace(/\n$/, "");

            // Check if this is an artifact-worthy code block
            const artifactLanguages = ["html", "svg", "python", "react", "typescript", "javascript", "css"];

            if (isInline) {
              return (
                <code className="bg-[#27272a] px-1.5 py-0.5 rounded text-[#e4e4e7]" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div>
                <CodeBlock className={`language-${language}`}>{code}</CodeBlock>
                {artifactLanguages.includes(language) && code.length > 20 && (
                  <ArtifactPreview code={code} language={language} />
                )}
              </div>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8b5cf6] hover:text-[#7c3aed] underline"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse border border-[#27272a]">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-[#27272a] bg-[#27272a] px-3 py-2 text-left font-medium">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-[#27272a] px-3 py-2">{children}</td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}