import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import BookCard from "./BookCard";
import type { BookSummary } from "@/modules/oracle/lib/stream-resonance";

interface Props {
  books: BookSummary[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export default function BookGrid({ books, selectedIds, onToggle }: Props) {
  const [search, setSearch] = useState("");
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return books;
    const q = search.toLowerCase();
    return books.filter(
      (b) => b.title.toLowerCase().includes(q) || b.domain.toLowerCase().includes(q)
    );
  }, [books, search]);

  const grouped = useMemo(() => {
    const map: Record<string, BookSummary[]> = {};
    for (const b of filtered) {
      const d = b.domain || "General";
      if (!map[d]) map[d] = [];
      map[d].push(b);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleDomain = (domain: string) => {
    setCollapsedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter books…"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Domain groups */}
      {grouped.map(([domain, domainBooks]) => {
        const isCollapsed = collapsedDomains.has(domain);
        const selectedInDomain = domainBooks.filter((b) => selectedIds.has(b.id)).length;

        return (
          <div key={domain}>
            <button
              onClick={() => toggleDomain(domain)}
              className="flex items-center gap-2 mb-3 text-sm font-semibold text-white/70 hover:text-white transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>{domain}</span>
              <span className="text-xs text-white/40">({domainBooks.length})</span>
              {selectedInDomain > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {selectedInDomain} selected
                </span>
              )}
            </button>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {domainBooks.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        selected={selectedIds.has(book.id)}
                        onToggle={onToggle}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-12">No books match your filter.</p>
      )}
    </div>
  );
}
