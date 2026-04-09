/**
 * ExplorerSidebar — Finder-style left sidebar with navigation categories.
 */

import {
  Files, Clock, Upload, FolderOpen, Layers, Globe,
  ClipboardPaste, FileText, HardDrive,
} from "lucide-react";
import type { ContextItem } from "@/modules/sovereign-vault/hooks/useContextManager";

export type SidebarFilter =
  | "all" | "recents" | "uploads" | "pastes" | "urls" | "workspaces" | "folders";

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
  }
}

export default function ExplorerSidebar({ filter, onFilterChange, items, isGuest }: Props) {
  return (
    <div className="flex flex-col h-full py-3 select-none" style={{ width: 180 }}>
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

      {/* Bottom: storage indicator */}
      <div className="mt-auto px-3 pt-4 border-t border-border/40">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <HardDrive className="w-3.5 h-3.5" />
          <span>{isGuest ? "Session storage" : "Cloud vault"}</span>
        </div>
        <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/60 transition-all"
            style={{ width: `${Math.min(100, items.length * 8)}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`px-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 ${className}`}>
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
      className={`flex items-center gap-2.5 w-full px-4 py-1.5 text-left text-[13px] rounded-md transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" style={{ opacity: active ? 1 : 0.6 }} />
      <span className="flex-1 truncate">{label}</span>
      {count > 0 && (
        <span className={`text-[10px] tabular-nums ${active ? "text-primary/70" : "text-muted-foreground/50"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
