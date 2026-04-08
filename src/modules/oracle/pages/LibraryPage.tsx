/**
 * LibraryPage — Book Resonance Engine.
 * Ingest book summaries, select books, discover cross-domain invariants.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Sparkles, Zap, Loader2, BookOpen, ArrowLeft } from "lucide-react";
import Layout from "@/modules/core/components/Layout";
import BookGrid from "@/modules/oracle/components/BookGrid";
import ResonanceGraph from "@/modules/oracle/components/ResonanceGraph";
import InvariantCard from "@/modules/oracle/components/InvariantCard";
import {
  listBooks,
  ingestBooks,
  streamFuse,
  streamDiscover,
  parseInvariants,
  type BookSummary,
  type Invariant,
} from "@/modules/oracle/lib/stream-resonance";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type View = "grid" | "resonance";

export default function LibraryPage() {
  const [view, setView] = useState<View>("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sourceUrl, setSourceUrl] = useState("https://blas.com");
  const [ingesting, setIngesting] = useState(false);
  const [fusing, setFusing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [invariants, setInvariants] = useState<Invariant[]>([]);

  const { data: books = [], refetch, isLoading } = useQuery({
    queryKey: ["library-books"],
    queryFn: listBooks,
    staleTime: 60_000,
  });

  const toggleBook = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleIngest = async () => {
    if (!sourceUrl.trim()) return;
    setIngesting(true);
    try {
      const result = await ingestBooks(sourceUrl.trim());
      toast.success(`Ingested ${result.ingested} books`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Ingestion failed");
    } finally {
      setIngesting(false);
    }
  };

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
        const parsed = parseInvariants(accumulated);
        setInvariants(parsed);
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
        const parsed = parseInvariants(accumulated);
        setInvariants(parsed);
      },
      onError: (err) => {
        setDiscovering(false);
        toast.error(err);
      },
    });
  };

  const isProcessing = fusing || discovering;
  const selectedBooks = books.filter((b) => selectedIds.has(b.id));

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-black/50">
        {/* Hero */}
        <section className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-[var(--text-page-title)] font-display font-bold tracking-tight text-foreground">
              Book Resonance Engine
            </h1>
            <p className="mt-3 text-[var(--text-lead)] text-muted-foreground max-w-2xl mx-auto">
              Discover hidden invariant patterns that transcend domains.
              Select books to fuse, or let the engine auto-discover cross-domain resonances.
            </p>
          </motion.div>

          {/* Ingest bar */}
          {books.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-xl mx-auto mb-12"
            >
              <label className="text-xs text-muted-foreground mb-2 block">
                Point to a book summary source to populate the library
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://blas.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <button
                  onClick={handleIngest}
                  disabled={ingesting}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                >
                  {ingesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {ingesting ? "Ingesting…" : "Ingest"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Inline ingest for when books already exist */}
          {books.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {books.length} books · {selectedIds.size} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                {view === "resonance" && (
                  <button
                    onClick={() => setView("grid")}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back to Grid
                  </button>
                )}
                <button
                  onClick={handleDiscover}
                  disabled={isProcessing || books.length < 2}
                  className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-foreground hover:bg-white/10 disabled:opacity-40 transition-all flex items-center gap-2"
                >
                  {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
                  Auto-Discover
                </button>
                <button
                  onClick={handleFuse}
                  disabled={isProcessing || selectedIds.size < 2}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-2"
                >
                  {fusing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Fuse Selected ({selectedIds.size})
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Main content */}
        <section className="px-6 pb-24 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {view === "grid" && books.length > 0 && (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <BookGrid
                  books={books}
                  selectedIds={selectedIds}
                  onToggle={toggleBook}
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
                {/* Constellation */}
                {invariants.length > 0 && (
                  <ResonanceGraph
                    books={books}
                    invariants={invariants}
                  />
                )}

                {/* Streaming indicator */}
                {isProcessing && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Analyzing cross-domain patterns…</span>
                  </div>
                )}

                {/* Invariant cards */}
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

                {/* Raw stream (debug / loading) */}
                {isProcessing && streamedText && (
                  <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5 max-h-48 overflow-auto">
                    <pre className="text-[11px] text-white/40 font-mono whitespace-pre-wrap">{streamedText}</pre>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
