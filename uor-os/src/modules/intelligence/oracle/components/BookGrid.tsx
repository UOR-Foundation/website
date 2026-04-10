/**
 * BookGrid — Category-tabbed grid with search, matching the MediaPlayer aesthetic.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import BookCard from "./BookCard";
import type { CatalogBook, BookDomain } from "@/modules/intelligence/oracle/lib/book-catalog";
import { BOOK_DOMAINS, FEATURED_IDS } from "@/modules/intelligence/oracle/lib/book-catalog";

interface Props {
  books: CatalogBook[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onRead: (id: string) => void;
}

export default function BookGrid({ books, selectedIds, onToggle, onRead }: Props) {
  const [search, setSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState<BookDomain>("All");

  const filtered = useMemo(() => {
    let result = books;
    if (activeDomain !== "All") {
      result = result.filter((b) => b.domain === activeDomain);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.domain.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [books, search, activeDomain]);

  const featured = useMemo(() => {
    if (activeDomain !== "All" || search.trim()) return [];
    return books.filter((b) => FEATURED_IDS.includes(b.id));
  }, [books, activeDomain, search]);

  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = { All: books.length };
    for (const b of books) {
      counts[b.domain] = (counts[b.domain] || 0) + 1;
    }
    return counts;
  }, [books]);

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search books, authors, topics…"
          className="w-full pl-11 pr-4 py-3 rounded-full bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {BOOK_DOMAINS.map((domain) => {
          const count = domainCounts[domain] || 0;
          if (domain !== "All" && count === 0) return null;
          return (
            <button
              key={domain}
              onClick={() => setActiveDomain(domain)}
              className={`
                flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                ${activeDomain === domain
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-white/5"
                }
              `}
            >
              {domain}
              {count > 0 && <span className="ml-1.5 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Featured hero row */}
      <AnimatePresence>
        {featured.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4"
          >
            {featured.map((book) => (
              <motion.div
                key={book.id}
                whileHover={{ y: -4 }}
                onClick={() => onRead(book.id)}
                className="relative group cursor-pointer rounded-xl overflow-hidden h-52 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-primary/30 transition-colors"
              >
                <div className="absolute inset-0 flex">
                  <div className="w-36 h-full flex-shrink-0">
                    {book.cover_url && (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 p-5 flex flex-col justify-center">
                    <span className="text-[10px] uppercase tracking-widest text-primary/70 font-semibold">{book.domain}</span>
                    <h3 className="text-base font-display font-bold text-foreground mt-1 line-clamp-2">{book.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{book.author}</p>
                    <p className="text-xs text-white/50 mt-2 line-clamp-2">{book.summary}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {filtered.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            selected={selectedIds.has(book.id)}
            onToggle={onToggle}
            onRead={onRead}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-16">No books match your search.</p>
      )}
    </div>
  );
}
