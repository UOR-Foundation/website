/**
 * FileExplorerPage — Sovereign file explorer for the UOR OS desktop.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, ClipboardPaste, Globe, Lock, ShieldCheck } from "lucide-react";
import { useContextManager, type ContextItem } from "@/modules/sovereign-vault/hooks/useContextManager";
import ExplorerSidebar, { type SidebarFilter } from "../components/ExplorerSidebar";
import ExplorerToolbar, { type ViewMode } from "../components/ExplorerToolbar";
import FileCard from "../components/FileCard";
import QuickLookModal from "../components/QuickLookModal";
import { tagStore } from "../lib/tags";
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [, setTagTick] = useState(0); // force re-render on tag changes
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedItem = selectedItemId ? ctx.contextItems.find(i => i.id === selectedItemId) ?? null : null;

  // Subscribe to tag store changes
  useEffect(() => {
    return tagStore.subscribe(() => setTagTick(t => t + 1));
  }, []);

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

  const handleNewFolder = useCallback((name: string) => {
    ctx.addFolder(name);
    toast.success(`Created folder "${name}"`);
  }, [ctx]);

  const handlePasteText = useCallback(() => {
    const text = prompt("Paste your text:");
    if (text?.trim()) {
      ctx.addPaste(text.trim());
      toast.success("Text clip added");
    }
  }, [ctx]);

  const handleImportUrl = useCallback(async () => {
    const url = prompt("Enter a URL:");
    if (url?.trim()) {
      try {
        await ctx.addUrl(url.trim());
        toast.success("URL imported");
      } catch {
        toast.error("Failed to import URL");
      }
    }
  }, [ctx]);

  const filteredItems = filterItems(ctx.contextItems, filter).filter(item =>
    !searchQuery || item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-background text-foreground">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />

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
              <div className="flex flex-col items-center gap-3 text-primary/70">
                <Upload className="w-12 h-12" />
                <p className="text-base font-medium">Drop files here</p>
                <p className="text-sm text-primary/50">Your files stay private</p>
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <EmptyState
              onUpload={handleUpload}
              onPaste={handlePasteText}
              onImportUrl={handleImportUrl}
              hasItems={ctx.contextItems.length > 0}
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-1 p-4">
              {filteredItems.map(item => (
                <FileCard
                  key={item.id}
                  item={item}
                  viewMode="grid"
                  onRemove={ctx.remove}
                  onSelect={setSelectedItemId}
                  tags={tagStore.getTagsForItem(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col p-2">
              <div className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground/40 font-medium border-b border-border/20">
                <div className="w-9" />
                <span className="flex-1">Name</span>
                <span className="w-16 text-center">Type</span>
                <div className="w-9" />
              </div>
              {filteredItems.map(item => (
                <FileCard
                  key={item.id}
                  item={item}
                  viewMode="list"
                  onRemove={ctx.remove}
                  onSelect={setSelectedItemId}
                  tags={tagStore.getTagsForItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 text-[12px] text-muted-foreground/60">
          <span>{filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1.5">
            {ctx.isGuest ? (
              <>Local session · not synced</>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                Sovereign Vault · encrypted &amp; synced
              </>
            )}
          </span>
        </div>
      </div>

      {/* Quick Look modal */}
      {selectedItem && (
        <QuickLookModal item={selectedItem} onClose={() => setSelectedItemId(null)} />
      )}
    </div>
  );
}

function filterItems(items: ContextItem[], filter: SidebarFilter): ContextItem[] {
  // Handle tag filters
  if (typeof filter === "string" && filter.startsWith("tag:")) {
    const tagId = filter.slice(4);
    const taggedIds = new Set(tagStore.getItemsWithTag(tagId));
    return items.filter(i => taggedIds.has(i.id));
  }

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
    default:
      return items;
  }
}

function EmptyState({
  onUpload, onPaste, onImportUrl, hasItems,
}: {
  onUpload: () => void; onPaste: () => void; onImportUrl: () => void; hasItems: boolean;
}) {
  if (hasItems) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-base text-muted-foreground/40">No items match this filter</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center h-full p-8">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        <button
          onClick={onUpload}
          className="flex flex-col items-center gap-5 p-12 rounded-2xl border-2 border-dashed border-border/30 hover:border-primary/30 hover:bg-primary/[0.02] transition-colors cursor-pointer group w-full"
        >
          <div className="w-20 h-20 rounded-2xl bg-muted/40 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <ShieldCheck className="w-10 h-10 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-foreground/80 group-hover:text-foreground/90">
              This is your private space
            </p>
            <p className="text-sm text-muted-foreground/50 mt-1.5">
              Drop files or click to upload — everything here stays yours
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          <button
            onClick={onUpload}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border/30 text-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </button>
          <button
            onClick={onPaste}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border/30 text-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste Text
          </button>
          <button
            onClick={onImportUrl}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border/30 text-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <Globe className="w-4 h-4" />
            Import URL
          </button>
        </div>
      </div>
    </div>
  );
}
