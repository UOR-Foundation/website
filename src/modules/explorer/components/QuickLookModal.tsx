/**
 * QuickLookModal — macOS-style Quick Look preview for context items.
 */

import { useEffect, useCallback } from "react";
import { X, ExternalLink } from "lucide-react";
import { getFileIcon } from "../lib/file-icons";
import type { ContextItem } from "@/modules/sovereign-vault/hooks/useContextManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/core/ui/dialog";
import ReactMarkdown from "react-markdown";

interface Props {
  item: ContextItem;
  onClose: () => void;
}

function getLanguageHint(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    json: "json", js: "javascript", ts: "typescript", tsx: "tsx",
    jsx: "jsx", html: "html", css: "css", xml: "xml", md: "markdown",
    csv: "csv", py: "python", yml: "yaml", yaml: "yaml",
  };
  return map[ext] || "";
}

function isImagePlaceholder(text: string): boolean {
  return text.startsWith("[Image:") || text.startsWith("[image:");
}

function PreviewContent({ item }: { item: ContextItem }) {
  const text = item.text || "";

  // Folders / Workspaces — just show name
  if (item.source === "folder" || item.source === "workspace") {
    const { icon: Icon, color } = getFileIcon(item.filename, item.source);
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <Icon className="w-10 h-10" style={{ color }} />
        </div>
        <p className="text-muted-foreground text-sm">{item.source === "folder" ? "Folder" : "Workspace"}</p>
      </div>
    );
  }

  // Image placeholder
  if (isImagePlaceholder(text)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <p className="text-sm">Image preview not available</p>
        <p className="text-xs text-muted-foreground/50">File was added as metadata only</p>
      </div>
    );
  }

  // URL source — show link + scraped content
  if (item.source === "url") {
    const urlMatch = text.match(/^(https?:\/\/\S+)/);
    const url = urlMatch?.[1] || item.filename;
    const body = urlMatch ? text.slice(urlMatch[0].length).trim() : text;
    return (
      <div className="flex flex-col gap-4">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline break-all"
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          {url}
        </a>
        {body && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  // Markdown files
  const ext = item.filename.split(".").pop()?.toLowerCase();
  if (ext === "md" || ext === "mdx") {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }

  // Code / text / paste — monospace pre block
  const lang = getLanguageHint(item.filename);
  return (
    <pre className={`text-[13px] leading-relaxed font-mono whitespace-pre-wrap break-words text-foreground/85 ${lang ? `language-${lang}` : ""}`}>
      {text || <span className="text-muted-foreground/40 italic">No content</span>}
    </pre>
  );
}

export default function QuickLookModal({ item, onClose }: Props) {
  const { icon: Icon, color, label } = getFileIcon(item.filename, item.source);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[70vw] w-full max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden border-border/30 bg-background/95 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b border-border/20 flex-shrink-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}15` }}
          >
            <Icon className="w-[18px] h-[18px]" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-sm font-medium truncate">{item.filename}</DialogTitle>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground/50 font-medium uppercase tracking-wider flex-shrink-0">
            {label}
          </span>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 min-h-0">
          <PreviewContent item={item} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
