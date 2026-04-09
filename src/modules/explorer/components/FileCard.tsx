/**
 * FileCard — Renders a context item as a grid card or list row.
 */

import { Trash2 } from "lucide-react";
import { getFileIcon } from "../lib/file-icons";
import type { ContextItem } from "@/modules/sovereign-vault/hooks/useContextManager";
import type { ViewMode } from "./ExplorerToolbar";

interface Props {
  item: ContextItem;
  viewMode: ViewMode;
  onRemove: (id: string) => void;
  onSelect?: (id: string) => void;
}

export default function FileCard({ item, viewMode, onRemove, onSelect }: Props) {
  const { icon: Icon, color, label } = getFileIcon(item.filename, item.source);

  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors rounded-md cursor-pointer" onClick={() => onSelect?.(item.id)}>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base text-foreground/90 truncate leading-tight">{item.filename}</p>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground/60 font-medium uppercase tracking-wider flex-shrink-0">
          {label}
        </span>
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
    <div className="group relative flex flex-col items-center gap-2.5 p-5 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onSelect?.(item.id)}>
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

      {/* Source badge */}
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground/50 font-medium uppercase tracking-wider">
        {label}
      </span>

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
