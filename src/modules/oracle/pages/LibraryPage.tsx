/**
 * LibraryPage — Immersive cinema-style book library with browse, reader, and resonance views.
 */

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Loader2, BookOpen, ArrowLeft, Library } from "lucide-react";

import BookGrid from "@/modules/oracle/components/BookGrid";
import BookReader from "@/modules/oracle/components/BookReader";
import ResonanceGraph from "@/modules/oracle/components/ResonanceGraph";
import InvariantCard from "@/modules/oracle/components/InvariantCard";
import {
  streamFuse,
  streamDiscover,
  parseInvariants,
  type Invariant,
} from "@/modules/oracle/lib/stream-resonance";
import { BOOK_CATALOG, type CatalogBook } from "@/modules/oracle/lib/book-catalog";
import { toast } from "sonner";

type View = "browse" | "reader" | "resonance";

export default function LibraryPage() {
  const [view, setView] = useState<View>("browse");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [fusing, setFusing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [invariants, setInvariants] = useState<Invariant[]>([]);

  const books = BOOK_CATALOG;

  const toggleBook = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openReader = useCallback((id: string) => {
    setActiveBookId(id);
    setView("reader");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const activeBook = useMemo(
    () => books.find((b) => b.id === activeBookId) || null,
    [books, activeBookId]
  );

  const relatedBooks = useMemo(() => {
    if (!activeBook) return [];
    return books.filter((b) => b.id !== activeBook.id && b.domain === activeBook.domain);
  }, [books, activeBook]);

  const handleFuse = async () => {
    if (selectedIds.size < 2) {
      toast.error("Select at least 2 books to fuse");
      return;
    }
    setFusing(true);
    setStreamedText("");
    setInvariants([]);
    setView("resonance");

    let accumulated = "";
    await streamFuse({
      bookIds: Array.from(selectedIds),
      onDelta: (text) => {
        accumulated += text;
        setStreamedText(accumulated);
      },
      onDone: () => {
        setFusing(false);
        setInvariants(parseInvariants(accumulated));
      },
      onError: (err) => {
        setFusing(false);
        toast.error(err);
      },
    });
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setStreamedText("");
    setInvariants([]);
    setView("resonance");

    let accumulated = "";
    await streamDiscover({
      onDelta: (text) => {
        accumulated += text;
        setStreamedText(accumulated);
      },
      onDone: () => {
        setDiscovering(false);
        setInvariants(parseInvariants(accumulated));
      },
      onError: (err) => {
        setDiscovering(false);
        toast.error(err);
      },
    });
  };

  const isProcessing = fusing || discovering;

  // Convert CatalogBook[] → BookSummary[] for ResonanceGraph compatibility
  const bookSummaries = useMemo(() => books.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    domain: b.domain,
    cover_url: b.cover_url,
    source_url: b.source_url,
    tags: b.tags,
    created_at: "",
  })), [books]);

  return (
    <>
      <div className="min-h-screen" style={{ background: "hsl(220 15% 6%)" }}>
        {/* Header */}
        <section className="pt-6 pb-8 px-6 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Library className="w-6 h-6 text-primary" />
                <span className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold">
                  Sovereign Library
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground">
                Book Resonance Engine
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg">
                {books.length} books spanning {new Set(books.map((b) => b.domain)).size} domains.
                Browse, read, or discover cross-domain patterns.
              </p>
            </div>

            {view !== "reader" && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {view === "resonance" && (
                  <button
                    onClick={() => setView("browse")}
                    className="px-4 py-2.5 rounded-full text-xs font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Library
                  </button>
                )}
                <button
                  onClick={handleDiscover}
                  disabled={isProcessing || books.length < 2}
                  className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-foreground hover:bg-white/10 disabled:opacity-40 transition-all flex items-center gap-2"
                >
                  {discovering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
                  Auto-Discover
                </button>
                <button
                  onClick={handleFuse}
                  disabled={isProcessing || selectedIds.size < 2}
                  className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-2"
                >
                  {fusing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Fuse ({selectedIds.size})
                </button>
              </div>
            )}
          </motion.div>

          {selectedIds.size > 0 && view === "browse" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-primary/60" />
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected for fusion</span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-primary/60 hover:text-primary ml-2 transition-colors"
              >
                Clear
              </button>
            </motion.div>
          )}
        </section>

        {/* Main content */}
        <section className="px-6 pb-24 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {view === "browse" && (
              <motion.div
                key="browse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <BookGrid
                  books={books}
                  selectedIds={selectedIds}
                  onToggle={toggleBook}
                  onRead={openReader}
                />
              </motion.div>
            )}

            {view === "reader" && activeBook && (
              <motion.div
                key="reader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <BookReader
                  book={activeBook}
                  relatedBooks={relatedBooks}
                  onBack={() => setView("browse")}
                  onSelectBook={openReader}
                />
              </motion.div>
            )}

            {view === "resonance" && (
              <motion.div
                key="resonance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {invariants.length > 0 && (
                  <ResonanceGraph books={bookSummaries} invariants={invariants} />
                )}

                {isProcessing && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Analyzing cross-domain patterns…</span>
                  </div>
                )}

                {invariants.length > 0 && (
                  <div>
                    <h2 className="text-lg font-display font-semibold mb-4 text-foreground">
                      Discovered Invariants
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {invariants.map((inv, i) => (
                        <InvariantCard key={inv.name + i} invariant={inv} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {isProcessing && streamedText && (
                  <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 max-h-48 overflow-auto">
                    <pre className="text-[11px] text-white/40 font-mono whitespace-pre-wrap">{streamedText}</pre>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </>
  );
}
