/**
 * RepoInput — GitHub URL input + ZIP drag-and-drop.
 *
 * Emits a File (ZIP) or string (GitHub URL) to the parent for ingestion.
 */

import { useState, useCallback, type DragEvent } from "react";
import { GitBranch, Upload, Loader2, AlertCircle } from "lucide-react";

interface RepoInputProps {
  onSubmitUrl: (url: string) => void;
  onSubmitZip: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export function RepoInput({ onSubmitUrl, onSubmitZip, isLoading, error }: RepoInputProps) {
  const [url, setUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    onSubmitUrl(url.trim());
  };

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (isLoading) return;

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".zip")) {
        onSubmitZip(file);
      }
    },
    [isLoading, onSubmitZip]
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".zip")) {
      onSubmitZip(file);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 animate-fade-in">
      {/* GitHub URL input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <GitBranch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/user/repo"
            disabled={isLoading}
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 transition-colors"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          />
        </div>
        <button
          type="submit"
          disabled={!url.trim() || isLoading}
          className="h-10 px-4 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Ingest"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span
          className="text-[10px] text-muted-foreground uppercase tracking-widest"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          or
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ZIP drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-dashed transition-colors cursor-pointer ${
          isDragging
            ? "border-primary/40 bg-primary/5"
            : "border-border hover:border-primary/20"
        } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
        onClick={() => document.getElementById("zip-input")?.click()}
      >
        <Upload size={20} className="text-muted-foreground" />
        <p
          className="text-xs text-muted-foreground"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          {isDragging ? "Drop ZIP file here" : "Drag & drop a ZIP file, or click to browse"}
        </p>
        <input
          id="zip-input"
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>{error}</span>
        </div>
      )}
    </div>
  );
}
