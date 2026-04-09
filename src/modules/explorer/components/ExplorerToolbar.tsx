/**
 * ExplorerToolbar — Top toolbar with breadcrumb, view toggle, search, and actions.
 */

import { LayoutGrid, List, Upload, FolderPlus, Search } from "lucide-react";
import type { SidebarFilter } from "./ExplorerSidebar";

export type ViewMode = "grid" | "list";

interface Props {
  filter: SidebarFilter;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onUploadClick: () => void;
  onNewFolder: () => void;
}

const FILTER_LABELS: Record<SidebarFilter, string> = {
  all: "All Files",
  recents: "Recents",
  uploads: "Documents",
  pastes: "Text Clips",
  urls: "Web Pages",
  workspaces: "Workspaces",
  folders: "Folders",
};

export default function ExplorerToolbar({
  filter, viewMode, onViewModeChange, searchQuery, onSearchChange,
  onUploadClick, onNewFolder,
}: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border/40 bg-muted/20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-muted-foreground/60 text-xs">Files</span>
        <span className="text-muted-foreground/40">›</span>
        <span className="font-medium text-foreground/90 truncate">{FILTER_LABELS[filter]}</span>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Search files…"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="h-7 w-40 pl-8 pr-3 text-xs rounded-md bg-muted/40 border border-border/30 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </div>

      {/* View toggle */}
      <div className="flex items-center rounded-md border border-border/30 overflow-hidden">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground/50 hover:text-foreground/70"}`}
          title="Grid view"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground/50 hover:text-foreground/70"}`}
          title="List view"
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Actions */}
      <button
        onClick={onNewFolder}
        className="h-7 px-2.5 text-xs rounded-md border border-border/30 text-foreground/70 hover:bg-muted/50 transition-colors flex items-center gap-1.5"
        title="New Folder"
      >
        <FolderPlus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">New Folder</span>
      </button>

      <button
        onClick={onUploadClick}
        className="h-7 px-3 text-xs rounded-md bg-primary/90 text-primary-foreground hover:bg-primary transition-colors flex items-center gap-1.5 font-medium"
        title="Upload files"
      >
        <Upload className="w-3.5 h-3.5" />
        <span>Upload</span>
      </button>
    </div>
  );
}
