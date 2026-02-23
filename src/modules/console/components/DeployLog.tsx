/**
 * DeployLog — Live scrolling log panel for the Build→Ship→Run pipeline.
 * Shows timestamped entries with a single copy-all button.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { Copy, Check, Terminal, X } from "lucide-react";

export interface LogEntry {
  timestamp: number;
  stage: string;
  message: string;
}

interface DeployLogProps {
  logs: LogEntry[];
  visible: boolean;
  onClose?: () => void;
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
    + "." + String(d.getMilliseconds()).padStart(3, "0");
}

function stageColor(stage: string): string {
  switch (stage) {
    case "import": return "text-blue-400";
    case "build": return "text-amber-400";
    case "ship": return "text-violet-400";
    case "run": return "text-emerald-400";
    case "complete": return "text-primary";
    case "error": return "text-destructive";
    default: return "text-muted-foreground";
  }
}

export default function DeployLog({ logs, visible, onClose }: DeployLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const handleCopy = useCallback(() => {
    const text = logs
      .map((l) => `[${formatTs(l.timestamp)}] [${l.stage.toUpperCase()}] ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [logs]);

  if (!visible || logs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Terminal className="h-4 w-4 text-primary" />
          Deploy Log
          <span className="text-xs text-muted-foreground font-normal ml-1">
            ({logs.length} {logs.length === 1 ? "entry" : "entries"})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Copy all logs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-primary" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy All
              </>
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Close log"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Log entries */}
      <div className="max-h-64 overflow-y-auto font-mono text-sm p-4 space-y-1 bg-background/40">
        {logs.map((entry, i) => (
          <div key={i} className="flex gap-3 leading-relaxed">
            <span className="text-muted-foreground/60 shrink-0 text-xs tabular-nums pt-0.5">
              {formatTs(entry.timestamp)}
            </span>
            <span className={`shrink-0 text-xs font-semibold uppercase w-16 pt-0.5 ${stageColor(entry.stage)}`}>
              {entry.stage}
            </span>
            <span className="text-foreground/80 break-all">
              {entry.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
