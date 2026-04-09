/**
 * PasteModal — Inline modal for pasting text content, replacing browser prompt().
 */

import { useState, useRef, useEffect } from "react";
import { ClipboardPaste } from "lucide-react";
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
  onSubmit: (text: string, label?: string) => void;
}

export default function PasteModal({ open, onClose, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setLabel("");
      setTimeout(() => textRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim(), label.trim() || undefined);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardPaste className="w-4 h-4 text-primary" />
            Paste Text
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your text here…"
            className="w-full h-40 px-3 py-2.5 text-sm rounded-lg bg-muted/30 border border-border/40 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none font-mono"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-full h-9 px-3 text-sm rounded-lg bg-muted/30 border border-border/40 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="h-9 px-4 text-sm rounded-md border border-border/40 text-foreground/70 hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="h-9 px-4 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Clip
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
