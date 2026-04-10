/**
 * VaultImportDialog — Modal for importing files and URLs
 */

import React, { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/modules/platform/core/ui/dialog";
import { Upload, Link2, Loader2, File } from "lucide-react";
import type { VaultHandle } from "../hooks/useVault";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vault: VaultHandle;
}

export default function VaultImportDialog({ open, onOpenChange, vault }: Props) {
  const [tab, setTab] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const doc = await vault.importFile(file);
      if (doc) toast.success(`Imported: ${doc.filename}`);
    }
    onOpenChange(false);
  }, [vault, onOpenChange]);

  const handleUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    const doc = await vault.importUrl(urlInput.trim());
    if (doc) {
      toast.success(`Imported: ${doc.filename}`);
      setUrlInput("");
      onOpenChange(false);
    }
  }, [vault, urlInput, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Import to Vault</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
          <button
            onClick={() => setTab("file")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              tab === "file" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Upload className="w-4 h-4" /> File
          </button>
          <button
            onClick={() => setTab("url")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              tab === "url" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Link2 className="w-4 h-4" /> URL
          </button>
        </div>

        {tab === "file" ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
            {vault.importing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">{vault.importStatus}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <File className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Drop files or click to browse</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="url"
              placeholder="https://example.com/article"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleUrl()}
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleUrl}
              disabled={vault.importing || !urlInput.trim()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {vault.importing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> {vault.importStatus}
                </span>
              ) : (
                "Import URL"
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
