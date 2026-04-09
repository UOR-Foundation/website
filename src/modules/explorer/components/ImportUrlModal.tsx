/**
 * ImportUrlModal — Inline modal for importing a URL, replacing browser prompt().
 */

import { useState, useRef, useEffect } from "react";
import { Globe, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/modules/core/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void>;
}

export default function ImportUrlModal({ open, onClose, onSubmit }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUrl("");
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4 text-primary" />
            Import URL
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full h-10 px-3 text-sm rounded-lg bg-muted/30 border border-border/40 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleSubmit();
            }}
            disabled={loading}
          />
          <p className="text-[11px] text-muted-foreground/50 mt-2">
            The page content will be extracted and stored locally.
          </p>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-9 px-4 text-sm rounded-md border border-border/40 text-foreground/70 hover:bg-muted/50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url.trim() || loading}
            className="h-9 px-4 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? "Importing…" : "Import"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
