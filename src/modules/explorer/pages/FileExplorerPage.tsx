/**
 * FileExplorerPage — Finder-inspired file explorer for the UOR OS desktop.
 * Sidebar + toolbar + grid/list content area with drag-and-drop.
 */

import { useState, useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { useContextManager, type ContextItem } from "@/modules/sovereign-vault/hooks/useContextManager";
import ExplorerSidebar, { type SidebarFilter } from "../components/ExplorerSidebar";
import ExplorerToolbar, { type ViewMode } from "../components/ExplorerToolbar";
import FileCard from "../components/FileCard";
import { toast } from "sonner";

const VIEW_KEY = "uor:explorer-view";

function loadViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "grid" || v === "list") return v;
  } catch {}
  return "grid";
}

export default function FileExplorerPage() {
  const ctx = useContextManager();
  const [filter, setFilter] = useState<SidebarFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleViewModeChange = useCallback((v: ViewMode) => {
    setViewMode(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  }, []);

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        await ctx.addFile(file);
        toast.success(`Added ${file.name}`);
      } catch {
        toast.error(`Failed to add ${file.name}`);
      }
    }
    e.target.value = "";
  }, [ctx]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      try {
        await ctx.addFile(file);
        toast.success(`Added ${file.name}`);
      } catch {
        toast.error(`Failed to add ${file.name}`);
      }
    }
  }, [ctx]);

  const handleNewFolder = useCallback(() => {
    const name = prompt("Folder name:");
    if (name?.trim()) {
      ctx.addFolder(name.trim());
      toast.success(`Created folder "${name.trim()}"`);
    }
  }, [ctx]);

  // Filter items
  const filteredItems = filterItems(ctx.contextItems, filter).filter(item =>
    !searchQuery || item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Sidebar */}
      <div className="border-r border-border/40 bg-muted/10 flex-shrink-0 overflow-y-auto">
        <ExplorerSidebar
          filter={filter}
          onFilterChange={setFilter}
          items={ctx.contextItems}
          isGuest={ctx.isGuest}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <ExplorerToolbar
          filter={filter}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUploadClick={handleUpload}
          onNewFolder={handleNewFolder}
        />

        {/* Content area with drag-and-drop */}
        <div
          className="flex-1 overflow-auto relative"
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Drop overlay */}
          {dragOver && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary/30 rounded-lg m-2 pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-primary/70">
                <Upload className="w-10 h-10" />
                <p className="text-sm font-medium">Drop files here</p>
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <EmptyState onUpload={handleUpload} hasItems={ctx.contextItems.length > 0} />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-1 p-4">
              {filteredItems.map(item => (
                <FileCard key={item.id} item={item} viewMode="grid" onRemove={ctx.remove} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col p-2">
              {/* List header */}
              <div className="flex items-center gap-3 px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-medium border-b border-border/20">
                <div className="w-8" />
                <span className="flex-1">Name</span>
                <span className="w-16 text-center">Type</span>
                <div className="w-8" />
              </div>
              {filteredItems.map(item => (
                <FileCard key={item.id} item={item} viewMode="list" onRemove={ctx.remove} />
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-border/30 text-[11px] text-muted-foreground/50">
          <span>{filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}</span>
          <span>{ctx.isGuest ? "Session · files cleared on refresh" : "Synced to vault"}</span>
        </div>
      </div>
    </div>
  );
}

function filterItems(items: ContextItem[], filter: SidebarFilter): ContextItem[] {
  switch (filter) {
    case "all":
    case "recents":
      return items;
    case "uploads":
      return items.filter(i => i.source === "file");
    case "pastes":
      return items.filter(i => i.source === "paste");
    case "urls":
      return items.filter(i => i.source === "url");
    case "workspaces":
      return items.filter(i => i.source === "workspace");
    case "folders":
      return items.filter(i => i.source === "folder");
  }
}

function EmptyState({ onUpload, hasItems }: { onUpload: () => void; hasItems: boolean }) {
  if (hasItems) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground/40">No items match this filter</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center h-full p-8">
      <button
        onClick={onUpload}
        className="flex flex-col items-center gap-4 p-10 rounded-2xl border-2 border-dashed border-border/30 hover:border-primary/30 hover:bg-primary/[0.02] transition-colors cursor-pointer group max-w-sm w-full"
      >
        <div className="w-16 h-16 rounded-2xl bg-muted/40 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
          <Upload className="w-7 h-7 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground/70 group-hover:text-foreground/90">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            PDF, TXT, MD, CSV, JSON, and more
          </p>
        </div>
      </button>
    </div>
  );
}
