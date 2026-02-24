import { useState, useCallback } from "react";
import { RefreshCw, Hash } from "lucide-react";

interface HashInputProps {
  hex: string;
  onHexChange: (hex: string) => void;
}

/** Generate a random 64-char hex string. */
function randomHex(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export function HashInput({ hex, onHexChange }: HashInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(hex);

  const commit = useCallback(() => {
    const clean = draft.replace(/[^0-9a-fA-F]/g, "").toLowerCase().padEnd(64, "0").slice(0, 64);
    onHexChange(clean);
    setDraft(clean);
    setEditing(false);
  }, [draft, onHexChange]);

  const randomize = useCallback(() => {
    const newHex = randomHex();
    onHexChange(newHex);
    setDraft(newHex);
  }, [onHexChange]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Hash className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Identity Hash (SHA-256)</span>
      </div>
      <div className="flex gap-2">
        {editing ? (
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === "Enter" && commit()}
            autoFocus
            maxLength={64}
            className="flex-1 font-mono text-xs bg-secondary border border-input rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter 64-character hex hash..."
          />
        ) : (
          <button
            onClick={() => { setDraft(hex); setEditing(true); }}
            className="flex-1 font-mono text-xs bg-secondary/50 border border-border rounded-lg px-3 py-2 text-left text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors truncate"
          >
            {hex}
          </button>
        )}
        <button
          onClick={randomize}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          title="Generate random identity"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Random</span>
        </button>
      </div>
    </div>
  );
}
