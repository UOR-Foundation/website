/**
 * QuickLookModal — macOS-style Quick Look preview with arrow key navigation
 * and UOR identity section.
 */

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, ChevronLeft, ChevronRight, Fingerprint, ShieldCheck, Copy, Check, Table, BarChart3 } from "lucide-react";
import { getFileIcon } from "../lib/file-icons";
import type { ContextItem } from "@/modules/sovereign-vault/hooks/useContextManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/core/ui/dialog";
import ReactMarkdown from "react-markdown";
import { computeFileUorAddress, truncateAddress } from "../lib/file-identity";

interface Props {
  items: ContextItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
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

function UorIdentitySection({ item }: { item: ContextItem }) {
  const [address, setAddress] = useState<string | null>(item.uorAddress || null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (item.uorAddress) {
      setAddress(item.uorAddress);
    } else if (item.text) {
      computeFileUorAddress(item.text).then(setAddress).catch(() => {});
    }
  }, [item.text, item.uorAddress]);

  if (!address) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-t border-border/20 mt-4 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <Fingerprint className="w-3.5 h-3.5 text-primary/60" />
        <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">Content Identity</span>
        <ShieldCheck className="w-3 h-3 text-primary/60" />
        <span className="text-[10px] text-primary/60">Verified</span>
      </div>
      <div className="flex items-center gap-2">
        <code className="text-[11px] font-mono text-muted-foreground/50 bg-muted/30 px-2 py-1 rounded break-all flex-1">
          {truncateAddress(address, 16)}…{address.slice(-8)}
        </code>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-foreground transition-colors flex-shrink-0"
          title="Copy full address"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground/30 mt-1.5 italic">
        Permanent. Same content, same address — everywhere.
      </p>
    </div>
  );
}

function TabularPreview({ data }: { data: import("@/modules/sovereign-vault/lib/structured-extractor").StructuredData }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Stats bar */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
        <span className="flex items-center gap-1"><Table className="w-3.5 h-3.5" />{data.columns.length} columns</span>
        <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" />{data.rowCount.toLocaleString()} rows</span>
        <QualityDot score={data.qualityScore} />
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-border/20 max-h-[50vh]">
        <table className="text-[12px] w-full border-collapse">
          <thead>
            <tr className="bg-muted/40 sticky top-0">
              {data.columns.map((col, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium text-foreground/70 border-b border-border/20 whitespace-nowrap">
                  <span>{col}</span>
                  {data.dtypes[col] && (
                    <span className="ml-1.5 text-[9px] text-muted-foreground/40 font-normal">{data.dtypes[col]}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 50).map((row, ri) => (
              <tr key={ri} className="hover:bg-muted/20 transition-colors">
                {data.columns.map((_, ci) => (
                  <td key={ci} className="px-3 py-1.5 border-b border-border/10 text-foreground/80 whitespace-nowrap max-w-[200px] truncate">
                    {row[ci] || <span className="text-muted-foreground/25">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.rowCount > 50 && (
        <p className="text-[10px] text-muted-foreground/40 text-center">
          Showing 50 of {data.rowCount.toLocaleString()} rows
        </p>
      )}
    </div>
  );
}

function QualityDot({ score }: { score: number }) {
  const color = score >= 0.8 ? "hsl(140 60% 45%)" : score >= 0.5 ? "hsl(45 80% 50%)" : "hsl(0 65% 55%)";
  const label = score >= 0.8 ? "High" : score >= 0.5 ? "Medium" : "Low";
  return (
    <span className="flex items-center gap-1" title={`Quality: ${Math.round(score * 100)}%`}>
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label} quality</span>
    </span>
  );
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

  // Tabular data — render table preview
  if (item.structuredData && item.structuredData.columns.length > 0) {
    return <TabularPreview data={item.structuredData} />;
  }

  // Image placeholder
  if (isImagePlaceholder(text)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <p className="text-sm">Preview not available</p>
        <p className="text-xs text-muted-foreground/50">Metadata only</p>
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

export default function QuickLookModal({ items, currentIndex, onClose, onNavigate }: Props) {
  const item = items[currentIndex];
  const { icon: Icon, color, label } = getFileIcon(item.filename, item.source);
  const total = items.length;
  const pos = currentIndex + 1;

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, total, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext]);

  if (!item) return null;

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

          {/* Position indicator */}
          {total > 1 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-muted-foreground/50 tabular-nums min-w-[3rem] text-center">
                {pos} of {total}
              </span>
              <button
                onClick={goNext}
                disabled={currentIndex === total - 1}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground/50 font-medium uppercase tracking-wider flex-shrink-0">
            {label}
          </span>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 min-h-0">
          <PreviewContent item={item} />
          <UorIdentitySection item={item} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
