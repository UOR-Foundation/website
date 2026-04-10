import { Search, X, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  resultCount: number;
  onClose: () => void;
}

export default function SearchMessages({ query, onQueryChange, resultCount, onClose }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border-b border-white/[0.06]">
      <Search size={14} className="text-white/30 flex-shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search in conversation…"
        autoFocus
        className="flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/25"
      />
      {query && (
        <span className="text-[11px] text-white/30 flex-shrink-0">
          {resultCount} result{resultCount !== 1 ? "s" : ""}
        </span>
      )}
      <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}
