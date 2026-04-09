/**
 * ExplorerToolbar — Top toolbar with breadcrumb, view toggle, sort, search, and actions.
 */

import { useState, useRef, useEffect } from "react";
import { LayoutGrid, List, Upload, FolderPlus, Search, X, ArrowUpDown } from "lucide-react";
import { DEFAULT_TAGS } from "../lib/tags";
import type { SidebarFilter } from "./ExplorerSidebar";

export type ViewMode = "grid" | "list";
export type SortField = "name" | "date" | "size" | "type";
export type SortDir = "asc" | "desc";

const FILTER_LABELS: Record<string, string> = {
  all: "All Files",
  recents: "Recents",
  uploads: "Documents",
  pastes: "Text Clips",
  urls: "Web Pages",
  workspaces: "Workspaces",
  folders: "Folders",
};

const SORT_LABELS: Record<SortField, string> = {
  date: "Date Added",
  name: "Name",
  size: "Size",
  type: "Type",
};

function getFilterLabel(filter: SidebarFilter): string {
  if (filter.startsWith("tag:")) {
    const tag = DEFAULT_TAGS.find(t => t.id === filter.slice(4));
    return tag ? `Tagged: ${tag.label}` : "Tagged";
  }
  return FILTER_LABELS[filter] || "All Files";
}

interface Props {
  filter: SidebarFilter;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onUploadClick: () => void;
  onNewFolder: (name: string) => void;
  sortField: SortField;
  sortDir: SortDir;
  onSortChange: (field: SortField) => void;
}

export default function ExplorerToolbar({
  filter, viewMode, onViewModeChange, searchQuery, onSearchChange,
  onUploadClick, onNewFolder, sortField, sortDir, onSortChange,
}: Props) {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (creatingFolder) folderInputRef.current?.focus();
  }, [creatingFolder]);

  useEffect(() => {
    if (!sortOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sortOpen]);

  const submitFolder = () => {
    if (folderName.trim()) {
      onNewFolder(folderName.trim());
    }
    setFolderName("");
    setCreatingFolder(false);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 bg-muted/20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-muted-foreground/60 text-sm">Files</span>
        <span className="text-muted-foreground/40">›</span>
        <span className="font-medium text-foreground/90 text-base truncate">{getFilterLabel(filter)}</span>
      </div>

      <div className="flex-1" />

      {/* Inline folder creation */}
      {creatingFolder && (
        <div className="flex items-center gap-1.5">
          <input
            ref={folderInputRef}
            type="text"
            placeholder="Folder name…"
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") submitFolder();
              if (e.key === "Escape") { setCreatingFolder(false); setFolderName(""); }
            }}
            className="h-8 w-36 px-3 text-sm rounded-md bg-muted/40 border border-border/40 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
          />
          <button
            onClick={submitFolder}
            className="h-8 px-2.5 text-sm rounded-md bg-primary/90 text-primary-foreground hover:bg-primary transition-colors font-medium"
          >
            Create
          </button>
          <button
            onClick={() => { setCreatingFolder(false); setFolderName(""); }}
            className="p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sort dropdown */}
      <div className="relative" ref={sortRef}>
        <button
          onClick={() => setSortOpen(!sortOpen)}
          className="h-8 px-2.5 text-sm rounded-md border border-border/30 text-foreground/70 hover:bg-muted/50 transition-colors flex items-center gap-1.5"
          title="Sort by"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[12px]">{SORT_LABELS[sortField]}</span>
          <span className="text-[10px] text-muted-foreground/50">{sortDir === "asc" ? "↑" : "↓"}</span>
        </button>
        {sortOpen && (
          <div className="absolute right-0 top-full mt-1 z-30 w-36 rounded-lg border border-border/40 bg-background/95 backdrop-blur-xl shadow-lg py-1">
            {(Object.keys(SORT_LABELS) as SortField[]).map(f => (
              <button
                key={f}
                onClick={() => { onSortChange(f); setSortOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                  sortField === f
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-muted/50"
                }`}
              >
                {SORT_LABELS[f]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Search files…"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="h-8 w-44 pl-9 pr-3 text-sm rounded-md bg-muted/40 border border-border/30 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
        />
      </div>

      {/* View toggle */}
      <div className="flex items-center rounded-md border border-border/30 overflow-hidden">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground/50 hover:text-foreground/70"}`}
          title="Grid view"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground/50 hover:text-foreground/70"}`}
          title="List view"
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      {!creatingFolder && (
        <button
          onClick={() => setCreatingFolder(true)}
          className="h-8 px-3 text-sm rounded-md border border-border/30 text-foreground/70 hover:bg-muted/50 transition-colors flex items-center gap-1.5"
          title="New Folder"
        >
          <FolderPlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Folder</span>
        </button>
      )}

      <button
        onClick={onUploadClick}
        className="h-8 px-3.5 text-sm rounded-md bg-primary/90 text-primary-foreground hover:bg-primary transition-colors flex items-center gap-1.5 font-medium"
        title="Upload files"
      >
        <Upload className="w-4 h-4" />
        <span>Upload</span>
      </button>
    </div>
  );
}
