/**
 * FileCard — Renders a context item as a grid card or list row, with tag dots,
 * right-click tag menu, relative timestamps, UOR badge, and selection state.
 */

import { Trash2, Tag, Fingerprint, Check } from "lucide-react";
import { getFileIcon } from "../lib/file-icons";
import { DEFAULT_TAGS } from "../lib/tags";
import TagMenu from "./TagMenu";
import type { ContextItem } from "@/modules/sovereign-vault/hooks/useContextManager";
import type { ViewMode } from "./ExplorerToolbar";
import { useState, useEffect } from "react";
import { computeFileUorAddress, truncateAddress } from "../lib/file-identity";

interface Props {
  item: ContextItem;
  viewMode: ViewMode;
  onRemove: (id: string) => void;
  onSelect?: (id: string) => void;
  tags?: string[];
  selected?: boolean;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
}

function TagDots({ tagIds }: { tagIds: string[] }) {
  if (tagIds.length === 0) return null;
  return (
    <div className="flex items-center gap-0.5">
      {tagIds.slice(0, 4).map((tid) => {
        const t = DEFAULT_TAGS.find((d) => d.id === tid);
        if (!t) return null;
        return (
          <div
            key={tid}
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: t.color }}
            title={t.label}
          />
        );
      })}
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileCard({ item, viewMode, onRemove, onSelect, tags = [], selected, onToggleSelect }: Props) {
  const { icon: Icon, color, label } = getFileIcon(item.filename, item.source);
  const [uorAddr, setUorAddr] = useState<string | null>(null);

  useEffect(() => {
    if (item.text) {
      computeFileUorAddress(item.text).then(setUorAddr).catch(() => {});
    }
  }, [item.text]);

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      onToggleSelect?.(item.id, e);
    } else {
      onSelect?.(item.id);
    }
  };

  if (viewMode === "list") {
    return (
      <div
        className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors rounded-md cursor-pointer ${selected ? "bg-primary/8 ring-1 ring-primary/20" : ""}`}
        onClick={handleClick}
      >
        {/* Selection checkbox */}
        {selected !== undefined && (
          <div
            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
              selected ? "bg-primary border-primary text-primary-foreground" : "border-border/40 opacity-0 group-hover:opacity-100"
            }`}
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(item.id, e); }}
          >
            {selected && <Check className="w-3 h-3" />}
          </div>
        )}

        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="text-base text-foreground/90 truncate leading-tight">{item.filename}</p>
          <TagDots tagIds={tags} />
        </div>

        {/* UOR address on hover */}
        {uorAddr && (
          <span className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-muted-foreground/40 flex items-center gap-1 transition-opacity flex-shrink-0" title={`UOR: ${uorAddr}`}>
            <Fingerprint className="w-3 h-3" />
            {truncateAddress(uorAddr)}
          </span>
        )}

        {/* Size */}
        {item.size > 0 && (
          <span className="text-[11px] text-muted-foreground/40 tabular-nums flex-shrink-0 w-16 text-right">
            {formatSize(item.size)}
          </span>
        )}

        {/* Timestamp */}
        {item.createdAt > 0 && (
          <span className="text-[11px] text-muted-foreground/40 tabular-nums flex-shrink-0 w-16 text-right">
            {formatRelativeTime(item.createdAt)}
          </span>
        )}

        <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground/60 font-medium uppercase tracking-wider flex-shrink-0">
          {label}
        </span>
        <TagMenu itemId={item.id} currentTags={tags}>
          <button
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-muted/60 text-muted-foreground/40 hover:text-foreground transition-all flex-shrink-0"
            title="Tags"
          >
            <Tag className="w-4 h-4" />
          </button>
        </TagMenu>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-all flex-shrink-0"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Grid card
  return (
    <div
      className={`group relative flex flex-col items-center gap-2.5 p-5 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer ${selected ? "bg-primary/8 ring-1 ring-primary/20" : ""}`}
      onClick={handleClick}
    >
      {/* Selection checkbox */}
      {selected !== undefined && (
        <div
          className={`absolute top-2 left-2 w-5 h-5 rounded flex items-center justify-center border transition-all z-10 ${
            selected ? "bg-primary border-primary text-primary-foreground" : "border-border/40 opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => { e.stopPropagation(); onToggleSelect?.(item.id, e); }}
        >
          {selected && <Check className="w-3 h-3" />}
        </div>
      )}

      {/* Tag dots at top-left */}
      {tags.length > 0 && (
        <div className="absolute top-2.5 left-2.5" style={{ top: selected !== undefined ? "2rem" : undefined }}>
          <TagDots tagIds={tags} />
        </div>
      )}

      {/* Icon */}
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
        style={{ background: `${color}12`, border: `1px solid ${color}20` }}
      >
        <Icon className="w-8 h-8" style={{ color }} />
      </div>

      {/* Name */}
      <p className="text-sm text-foreground/80 text-center leading-snug line-clamp-2 w-full max-w-[110px]">
        {item.filename}
      </p>

      {/* Source badge + timestamp */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground/50 font-medium uppercase tracking-wider">
          {label}
        </span>
        {item.createdAt > 0 && (
          <span className="text-[9px] text-muted-foreground/35 tabular-nums">
            {formatRelativeTime(item.createdAt)}
          </span>
        )}
      </div>

      {/* UOR badge on hover */}
      {uorAddr && (
        <span className="opacity-0 group-hover:opacity-100 text-[9px] font-mono text-muted-foreground/30 flex items-center gap-0.5 transition-opacity" title="Content identity — same content, same address everywhere">
          <Fingerprint className="w-2.5 h-2.5" />
          {truncateAddress(uorAddr)}
        </span>
      )}

      {/* Tag button */}
      <TagMenu itemId={item.id} currentTags={tags}>
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-foreground transition-all"
          title="Tags"
        >
          <Tag className="w-3.5 h-3.5" />
        </button>
      </TagMenu>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-all"
        title="Remove"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
