/**
 * FileCard — Renders a context item as a grid card or list row, with tag dots and right-click tag menu.
 */

import { Trash2, Tag } from "lucide-react";
import { getFileIcon } from "../lib/file-icons";
import { DEFAULT_TAGS } from "../lib/tags";
import TagMenu from "./TagMenu";
import type { ContextItem } from "@/modules/sovereign-vault/hooks/useContextManager";
import type { ViewMode } from "./ExplorerToolbar";

interface Props {
  item: ContextItem;
  viewMode: ViewMode;
  onRemove: (id: string) => void;
  onSelect?: (id: string) => void;
  tags?: string[];
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

export default function FileCard({ item, viewMode, onRemove, onSelect, tags = [] }: Props) {
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
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="text-base text-foreground/90 truncate leading-tight">{item.filename}</p>
          <TagDots tagIds={tags} />
        </div>
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
    <div className="group relative flex flex-col items-center gap-2.5 p-5 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onSelect?.(item.id)}>
      {/* Tag dots at top-left */}
      {tags.length > 0 && (
        <div className="absolute top-2.5 left-2.5">
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

      {/* Source badge */}
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground/50 font-medium uppercase tracking-wider">
        {label}
      </span>

      {/* Tag button */}
      <TagMenu itemId={item.id} currentTags={tags}>
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground/30 hover:text-foreground transition-all"
          title="Tags"
          style={{ top: tags.length > 0 ? "1.75rem" : undefined }}
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
