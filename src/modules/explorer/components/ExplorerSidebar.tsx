/**
 * ExplorerSidebar — Finder-style left sidebar with sovereign space identity and tag filters.
 */

import {
  Files, Clock, Upload, FolderOpen, Layers, Globe,
  ClipboardPaste, HardDrive, Lock, ShieldCheck,
} from "lucide-react";
import { DEFAULT_TAGS, tagStore } from "../lib/tags";
import type { ContextItem } from "@/modules/sovereign-vault/hooks/useContextManager";

export type SidebarFilter =
  | "all" | "recents" | "uploads" | "pastes" | "urls" | "workspaces" | "folders"
  | `tag:${string}`;

interface Props {
  filter: SidebarFilter;
  onFilterChange: (f: SidebarFilter) => void;
  items: ContextItem[];
  isGuest: boolean;
}

const FAVORITES = [
  { id: "all" as const, label: "All Files", icon: Files },
  { id: "recents" as const, label: "Recents", icon: Clock },
  { id: "uploads" as const, label: "Documents", icon: Upload },
] as const;

const SOURCES = [
  { id: "pastes" as const, label: "Text Clips", icon: ClipboardPaste },
  { id: "urls" as const, label: "Web Pages", icon: Globe },
] as const;

const ORGANIZE = [
  { id: "workspaces" as const, label: "Workspaces", icon: Layers },
  { id: "folders" as const, label: "Folders", icon: FolderOpen },
] as const;

function countFor(items: ContextItem[], filter: SidebarFilter): number {
  switch (filter) {
    case "all": return items.length;
    case "recents": return items.length;
    case "uploads": return items.filter(i => i.source === "file").length;
    case "pastes": return items.filter(i => i.source === "paste").length;
    case "urls": return items.filter(i => i.source === "url").length;
    case "workspaces": return items.filter(i => i.source === "workspace").length;
    case "folders": return items.filter(i => i.source === "folder").length;
    default: return 0;
  }
}

export default function ExplorerSidebar({ filter, onFilterChange, items, isGuest }: Props) {
  // Compute tag counts using items that exist
  const itemIds = new Set(items.map(i => i.id));
  const tagCounts = DEFAULT_TAGS.map(tag => ({
    ...tag,
    count: tagStore.getItemsWithTag(tag.id).filter(id => itemIds.has(id)).length,
  }));
  const hasAnyTags = tagCounts.some(t => t.count > 0);

  return (
    <div className="flex flex-col h-full py-3 select-none" style={{ width: 200 }}>
      {/* Sovereign header */}
      <div className="px-4 pb-3 mb-2 border-b border-primary/15">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="text-[15px] font-semibold text-foreground tracking-tight">Your Space</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Private &amp; sovereign</p>
      </div>

      {/* Favorites */}
      <SectionLabel>Favorites</SectionLabel>
      {FAVORITES.map(f => (
        <SidebarItem
          key={f.id}
          label={f.label}
          icon={f.icon}
          active={filter === f.id}
          count={countFor(items, f.id)}
          onClick={() => onFilterChange(f.id)}
        />
      ))}

      {/* Sources */}
      <SectionLabel className="mt-5">Sources</SectionLabel>
      {SOURCES.map(f => (
        <SidebarItem
          key={f.id}
          label={f.label}
          icon={f.icon}
          active={filter === f.id}
          count={countFor(items, f.id)}
          onClick={() => onFilterChange(f.id)}
        />
      ))}

      {/* Organize */}
      <SectionLabel className="mt-5">Organize</SectionLabel>
      {ORGANIZE.map(f => (
        <SidebarItem
          key={f.id}
          label={f.label}
          icon={f.icon}
          active={filter === f.id}
          count={countFor(items, f.id)}
          onClick={() => onFilterChange(f.id)}
        />
      ))}

      {/* Tags */}
      <SectionLabel className="mt-5">Tags</SectionLabel>
      {DEFAULT_TAGS.map(tag => (
        <button
          key={tag.id}
          onClick={() => onFilterChange(`tag:${tag.id}`)}
          className={`flex items-center gap-2.5 w-full px-4 py-1.5 text-left text-[14px] rounded-md transition-colors ${
            filter === `tag:${tag.id}`
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: tag.color }}
          />
          <span className="flex-1 truncate">{tag.label}</span>
          {tagCounts.find(t => t.id === tag.id)!.count > 0 && (
            <span className={`text-[11px] tabular-nums ${filter === `tag:${tag.id}` ? "text-primary/70" : "text-muted-foreground/50"}`}>
              {tagCounts.find(t => t.id === tag.id)!.count}
            </span>
          )}
        </button>
      ))}

      {/* Bottom: storage indicator */}
      <div className="mt-auto px-4 pt-4 border-t border-border/40">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          {isGuest ? (
            <>
              <HardDrive className="w-4 h-4" />
              <span>Local · Session Only</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-primary/70" />
              <span>Sovereign Vault · Encrypted</span>
            </>
          )}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/60 transition-all"
            style={{ width: `${Math.min(100, items.length * 8)}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-1.5">
          {items.length} item{items.length !== 1 ? "s" : ""} · Your files. Your control.
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 ${className}`}>
      {children}
    </p>
  );
}

function SidebarItem({
  label, icon: Icon, active, count, onClick,
}: {
  label: string; icon: React.ComponentType<any>; active: boolean; count: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-4 py-2 text-left text-[14px] rounded-md transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" style={{ opacity: active ? 1 : 0.6 }} />
      <span className="flex-1 truncate">{label}</span>
      {count > 0 && (
        <span className={`text-[11px] tabular-nums ${active ? "text-primary/70" : "text-muted-foreground/50"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
