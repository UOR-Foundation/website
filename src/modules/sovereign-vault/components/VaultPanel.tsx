/**
 * VaultPanel — UI for the Sovereign Context Vault
 * ════════════════════════════════════════════════
 *
 * Drag-drop file zone, document list with CID badges,
 * tag management, and storage indicators.
 * Works for both guests (ephemeral) and signed-in users (persistent).
 */

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, X, Tag, Shield, Search, Loader2, Link2, Trash2, Info } from "lucide-react";
import { useVault } from "../hooks/useVault";
import { toast } from "sonner";

export default function VaultPanel() {
  const vault = useVault();
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof vault.search>>>([]);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      const doc = await vault.importFile(file);
      if (doc) toast.success(`Imported: ${doc.filename}`);
    }
  }, [vault]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const doc = await vault.importFile(file);
      if (doc) toast.success(`Imported: ${doc.filename}`);
    }
    e.target.value = "";
  }, [vault]);

  const handleUrlImport = useCallback(async () => {
    if (!urlInput.trim()) return;
    const doc = await vault.importUrl(urlInput.trim());
    if (doc) {
      toast.success(`Imported from URL: ${doc.filename}`);
      setUrlInput("");
    } else {
      toast.error("Failed to import URL");
    }
  }, [vault, urlInput]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await vault.search(searchQuery);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, [vault, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Guest banner */}
      {vault.isGuest && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
          <Info className="w-4 h-4 text-accent-foreground/60 shrink-0" />
          <p className="text-xs text-accent-foreground/70">
            Guest mode — files are stored in memory and will be lost on refresh. Sign in to persist your vault.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {vault.isGuest ? "File Explorer" : "Sovereign Vault"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {vault.count} document{vault.count !== 1 ? "s" : ""}
            {vault.isGuest ? " · Ephemeral session" : " · Zero-knowledge encrypted"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search your vault…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground font-medium">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </p>
            {searchResults.map((r, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-muted/30 border border-border space-y-1"
              >
                <div className="flex items-center gap-2">
                  <File className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {r.document.filename || "Untitled"}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    score: {r.score.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {r.chunk.text.slice(0, 200)}…
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
          ${dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/30"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        {vault.importing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">{vault.importStatus}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground/60">
              PDF, DOCX, TXT, MD, HTML, JSON, CSV, images
            </p>
          </div>
        )}
      </div>

      {/* URL Import */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="url"
            placeholder="Import from URL…"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleUrlImport()}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={handleUrlImport}
          disabled={vault.importing || !urlInput.trim()}
          className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          Import
        </button>
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {vault.documents.map(doc => (
          <motion.div
            key={doc.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border hover:bg-muted/30 transition-colors group"
          >
            <File className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {doc.filename || "Untitled"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                  {doc.cid.slice(0, 16)}…
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""}
                </span>
                {doc.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-[10px] text-primary">
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => vault.remove(doc)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}

        {vault.documents.length === 0 && !vault.importing && (
          <p className="text-center text-sm text-muted-foreground/60 py-4">
            No documents yet. Drop a file or import a URL to get started.
          </p>
        )}
      </div>
    </div>
  );
}
