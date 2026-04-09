/**
 * VaultPanel — OS-style File Explorer for the Sovereign Vault
 * ═══════════════════════════════════════════════════════════
 *
 * Canonical file management surface for the UOR Virtual OS.
 * Features: folder hierarchy, breadcrumb navigation, grid/list toggle,
 * drag-drop import, context search, and unified workspace/folder management.
 *
 * Works for both guests (ephemeral) and signed-in users (persistent).
 */

import React, { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, File, X, Search, Loader2, Link2, Trash2, Info,
  FolderOpen, FolderPlus, Grid3X3, List, ChevronRight,
  FileText, Image, Table, Code, FileJson, Globe, MoreVertical, Plus,
} from "lucide-react";
import { useVault } from "../hooks/useVault";
import { toast } from "sonner";
import type { VaultDocument } from "../lib/types";

// ── Folder model (in-memory, mirrors guest-context patterns) ────────

interface VaultFolder {
  id: string;
  name: string;
  parentId: string | null; // null = root
  createdAt: number;
}

let folderStore: VaultFolder[] = [];
let folderId = 0;
// Map docId → folderId
let docFolderMap: Map<string, string> = new Map();

function createFolder(name: string, parentId: string | null): VaultFolder {
  const folder: VaultFolder = {
    id: `folder-${++folderId}`,
    name,
    parentId,
    createdAt: Date.now(),
  };
  folderStore = [...folderStore, folder];
  return folder;
}

function removeFolder(id: string) {
  // Remove folder and all children recursively
  const childIds = folderStore.filter(f => f.parentId === id).map(f => f.id);
  childIds.forEach(removeFolder);
  folderStore = folderStore.filter(f => f.id !== id);
  // Unmap docs from this folder
  const toRemove: string[] = [];
  docFolderMap.forEach((fId, docId) => { if (fId === id) toRemove.push(docId); });
  toRemove.forEach(docId => docFolderMap.delete(docId));
}

function moveDocToFolder(docId: string, folderId: string | null) {
  if (folderId) docFolderMap.set(docId, folderId);
  else docFolderMap.delete(docId);
}

// ── File type icon resolver ─────────────────────────────────────────

function getFileIcon(mime: string | null, filename: string | null) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (mime?.startsWith("image/") || ["png","jpg","jpeg","gif","svg","webp"].includes(ext || ""))
    return <Image className="w-4 h-4 text-pink-400" />;
  if (["json","jsonld"].includes(ext || "") || mime === "application/json")
    return <FileJson className="w-4 h-4 text-yellow-400" />;
  if (["csv","tsv","xlsx","xls"].includes(ext || ""))
    return <Table className="w-4 h-4 text-emerald-400" />;
  if (["js","ts","tsx","jsx","py","rs","go","html","css"].includes(ext || ""))
    return <Code className="w-4 h-4 text-blue-400" />;
  if (mime?.startsWith("text/html") || ext === "html")
    return <Globe className="w-4 h-4 text-cyan-400" />;
  if (["pdf","doc","docx","txt","md"].includes(ext || ""))
    return <FileText className="w-4 h-4 text-orange-400" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
}

// ═══════════════════════════════════════════════════════════════
// ██ COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function VaultPanel() {
  const vault = useVault();
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof vault.search>>>([]);
  const [searching, setSearching] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<VaultFolder[]>(folderStore);
  const [, setTick] = useState(0);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showUrlBar, setShowUrlBar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFolderRef = useRef<HTMLInputElement>(null);

  const syncFolders = useCallback(() => {
    setFolders([...folderStore]);
    setTick(t => t + 1);
  }, []);

  // ── Breadcrumb trail ──
  const breadcrumb = useMemo(() => {
    const trail: VaultFolder[] = [];
    let id = currentFolderId;
    while (id) {
      const f = folderStore.find(f => f.id === id);
      if (f) { trail.unshift(f); id = f.parentId; } else break;
    }
    return trail;
  }, [currentFolderId, folders]);

  // ── Items in current folder ──
  const currentFolders = useMemo(
    () => folders.filter(f => f.parentId === currentFolderId),
    [folders, currentFolderId]
  );

  const currentDocs = useMemo(
    () => vault.documents.filter(doc => {
      const mapped = docFolderMap.get(doc.id);
      if (currentFolderId === null) return !mapped;
      return mapped === currentFolderId;
    }),
    [vault.documents, currentFolderId, folders]
  );

  // ── Handlers ──
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      const doc = await vault.importFile(file);
      if (doc && currentFolderId) moveDocToFolder(doc.id, currentFolderId);
      if (doc) toast.success(`Imported: ${doc.filename}`);
    }
    syncFolders();
  }, [vault, currentFolderId, syncFolders]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const doc = await vault.importFile(file);
      if (doc && currentFolderId) moveDocToFolder(doc.id, currentFolderId);
      if (doc) toast.success(`Imported: ${doc.filename}`);
    }
    e.target.value = "";
    syncFolders();
  }, [vault, currentFolderId, syncFolders]);

  const handleUrlImport = useCallback(async () => {
    if (!urlInput.trim()) return;
    const doc = await vault.importUrl(urlInput.trim());
    if (doc && currentFolderId) moveDocToFolder(doc.id, currentFolderId);
    if (doc) {
      toast.success(`Imported: ${doc.filename}`);
      setUrlInput("");
      setShowUrlBar(false);
    } else {
      toast.error("Failed to import URL");
    }
    syncFolders();
  }, [vault, urlInput, currentFolderId, syncFolders]);

  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName.trim(), currentFolderId);
    setNewFolderName("");
    setShowNewFolder(false);
    syncFolders();
  }, [newFolderName, currentFolderId, syncFolders]);

  const handleDeleteFolder = useCallback((fId: string) => {
    removeFolder(fId);
    syncFolders();
  }, [syncFolders]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await vault.search(searchQuery);
      setSearchResults(results);
    } finally { setSearching(false); }
  }, [vault, searchQuery]);

  const isEmpty = currentFolders.length === 0 && currentDocs.length === 0;

  return (
    <div className="flex flex-col h-full bg-background text-foreground select-none overflow-hidden">
      {/* Guest banner */}
      {vault.isGuest && (
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border-b border-accent/20 shrink-0">
          <Info className="w-3.5 h-3.5 text-accent-foreground/60 shrink-0" />
          <p className="text-xs text-accent-foreground/70">
            Guest mode — files are stored in memory and will be lost on refresh. Sign in to persist your vault.
          </p>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 shrink-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm min-w-0 flex-1 overflow-hidden">
          <button
            onClick={() => setCurrentFolderId(null)}
            className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
              currentFolderId === null
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {vault.isGuest ? "Files" : "Vault"}
          </button>
          {breadcrumb.map(f => (
            <React.Fragment key={f.id}>
              <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              <button
                onClick={() => setCurrentFolderId(f.id)}
                className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium transition-colors truncate max-w-[120px] ${
                  currentFolderId === f.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="w-32 focus:w-48 transition-all pl-7 pr-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          </div>

          <div className="w-px h-5 bg-border/50 mx-1" />

          {/* View toggle */}
          <button
            onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title={viewMode === "grid" ? "List view" : "Grid view"}
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </button>

          {/* New folder */}
          <button
            onClick={() => { setShowNewFolder(true); setTimeout(() => newFolderRef.current?.focus(), 50); }}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>

          {/* Import */}
          <button
            onClick={() => setShowUrlBar(!showUrlBar)}
            className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Import from URL"
          >
            <Link2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Files
          </button>
        </div>
      </div>

      {/* URL import bar */}
      <AnimatePresence>
        {showUrlBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/50 shrink-0"
          >
            <div className="flex gap-2 px-4 py-2">
              <div className="relative flex-1">
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="url"
                  placeholder="https://…"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleUrlImport()}
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={handleUrlImport}
                disabled={vault.importing || !urlInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Import
              </button>
              <button onClick={() => setShowUrlBar(false)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New folder input */}
      <AnimatePresence>
        {showNewFolder && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/50 shrink-0"
          >
            <div className="flex gap-2 px-4 py-2">
              <div className="relative flex-1">
                <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
                <input
                  ref={newFolderRef}
                  type="text"
                  placeholder="Folder name…"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") setShowNewFolder(false);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Create
              </button>
              <button onClick={() => setShowNewFolder(false)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

      {/* ── Search results overlay ── */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3 border-b border-border/50 space-y-2 max-h-48 overflow-y-auto shrink-0 bg-muted/10"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
              <button onClick={() => { setSearchResults([]); setSearchQuery(""); }} className="text-xs text-muted-foreground hover:text-foreground">
                Clear
              </button>
            </div>
            {searchResults.map((r, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20 border border-border/50">
                {getFileIcon(r.document.mime_type, r.document.filename)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{r.document.filename || "Untitled"}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{r.chunk.text.slice(0, 120)}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/50">{r.score.toFixed(2)}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content area ── */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden ${dragOver ? "bg-primary/5" : ""}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Loading state */}
        {vault.importing && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-primary bg-primary/5 border-b border-primary/10">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {vault.importStatus}
          </div>
        )}

        {isEmpty && !vault.importing ? (
          /* Empty state — drop zone */
          <div
            className="flex flex-col items-center justify-center h-full gap-4 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`p-6 rounded-2xl border-2 border-dashed transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border/60"
            }`}>
              <Upload className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                {currentFolderId ? "This folder is empty" : "Drop files here or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground/50">
                PDF, DOCX, TXT, MD, HTML, JSON, CSV, images
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3">
            {viewMode === "list" ? (
              /* ── List view ── */
              <div className="space-y-0.5">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 px-3 py-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                  <span>Name</span>
                  <span className="text-right">Size</span>
                  <span className="text-right">Modified</span>
                  <span />
                </div>

                {/* Folders first */}
                {currentFolders.map(f => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center px-3 py-2 rounded-lg hover:bg-muted/30 cursor-pointer group transition-colors"
                    onClick={() => setCurrentFolderId(f.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-sm text-foreground truncate">{f.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-right">—</span>
                    <span className="text-xs text-muted-foreground text-right">{formatDate(new Date(f.createdAt).toISOString())}</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}

                {/* Documents */}
                {currentDocs.map(doc => (
                  <FileRow
                    key={doc.id}
                    doc={doc}
                    onRemove={() => vault.remove(doc)}
                  />
                ))}
              </div>
            ) : (
              /* ── Grid view ── */
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                {currentFolders.map(f => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/30 cursor-pointer group transition-colors relative"
                    onClick={() => setCurrentFolderId(f.id)}
                  >
                    <FolderOpen className="w-10 h-10 text-amber-400" />
                    <span className="text-xs text-foreground text-center truncate w-full">{f.name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
                {currentDocs.map(doc => (
                  <FileGridItem
                    key={doc.id}
                    doc={doc}
                    onRemove={() => vault.remove(doc)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 text-[10px] text-muted-foreground/60 shrink-0">
        <span>
          {currentFolders.length} folder{currentFolders.length !== 1 ? "s" : ""}, {currentDocs.length} file{currentDocs.length !== 1 ? "s" : ""}
        </span>
        <span>
          {vault.isGuest ? "Ephemeral · Guest" : "Sovereign · Encrypted"}
        </span>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function FileRow({ doc, onRemove }: { doc: VaultDocument; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center px-3 py-2 rounded-lg hover:bg-muted/30 group transition-colors"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {getFileIcon(doc.mime_type, doc.filename)}
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate">{doc.filename || "Untitled"}</p>
          <p className="text-[10px] text-muted-foreground/50 font-mono truncate">{doc.cid.slice(0, 12)}…</p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-right">{formatSize(doc.size_bytes)}</span>
      <span className="text-xs text-muted-foreground text-right">{formatDate(doc.created_at)}</span>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

function FileGridItem({ doc, onRemove }: { doc: VaultDocument; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/30 group transition-colors relative"
    >
      <div className="w-10 h-10 flex items-center justify-center">
        {getFileIcon(doc.mime_type, doc.filename)}
      </div>
      <div className="text-center w-full">
        <p className="text-xs text-foreground truncate">{doc.filename || "Untitled"}</p>
        <p className="text-[10px] text-muted-foreground/50">{formatSize(doc.size_bytes)}</p>
      </div>
      <button
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
