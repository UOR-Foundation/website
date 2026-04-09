/**
 * DailyNotes — Roam-inspired temporal entry point.
 *
 * Every day has a page. You open it and write. The graph builds itself.
 * Each block is individually content-addressed via singleProofHash.
 * Wiki-links [[topic]] and #hashtags create graph edges in real-time.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { format, subDays, addDays } from "date-fns";
import { singleProofHash } from "@/lib/uor-canonical";
import { localGraphStore } from "@/modules/knowledge-graph/local-store";
import { parseWikiLinks, hasWikiSyntax } from "@/modules/knowledge-graph/lib/wiki-links";
import { invalidateBacklinks } from "@/modules/knowledge-graph/backlinks";
import LinkedReferencesSidebar from "./LinkedReferencesSidebar";
import ResurfacingSuggestions from "./ResurfacingSuggestions";
import type { KGNode, KGEdge } from "@/modules/knowledge-graph/types";

// ── Constants ───────────────────────────────────────────────────────────────

const UOR_CONTEXT = "https://uor.foundation/contexts/uor-v1.jsonld";

interface Block {
  id: string;
  content: string;
  address: string;
  indent: number;
  createdAt: number;
}

// ── Daily note address (deterministic) ──────────────────────────────────────

async function dailyNoteAddress(dateStr: string): Promise<string> {
  const proof = await singleProofHash({
    "@context": UOR_CONTEXT,
    "@type": "vault:DailyNote",
    "schema:datePublished": dateStr,
  });
  return proof.ipv6Address["u:ipv6"];
}

async function blockAddress(dateStr: string, index: number, content: string): Promise<string> {
  const proof = await singleProofHash({
    "@context": UOR_CONTEXT,
    "@type": "vault:Block",
    "schema:isPartOf": dateStr,
    "schema:position": index,
    "schema:text": content.trim() || `block-${index}`,
  });
  return proof.ipv6Address["u:ipv6"];
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DailyNotes() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [noteAddress, setNoteAddress] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateStr = useMemo(() => format(currentDate, "yyyy-MM-dd"), [currentDate]);
  const displayDate = useMemo(() => format(currentDate, "EEEE, MMMM d, yyyy"), [currentDate]);
  const isToday = useMemo(() => format(new Date(), "yyyy-MM-dd") === dateStr, [dateStr]);

  // ── Load or create daily note ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    (async () => {
      const addr = await dailyNoteAddress(dateStr);
      if (cancelled) return;
      setNoteAddress(addr);

      const existing = await localGraphStore.getNode(addr);
      if (cancelled) return;

      if (existing && existing.properties?.blocks) {
        setBlocks(existing.properties.blocks as Block[]);
      } else {
        // Create first empty block
        const firstAddr = await blockAddress(dateStr, 0, "");
        if (cancelled) return;
        setBlocks([{
          id: crypto.randomUUID(),
          content: "",
          address: firstAddr,
          indent: 0,
          createdAt: Date.now(),
        }]);
      }
      setLoaded(true);
    })();

    return () => { cancelled = true; };
  }, [dateStr]);

  // ── Persist to graph (debounced) ──────────────────────────────────────

  const persistToGraph = useCallback(async (updatedBlocks: Block[]) => {
    if (!noteAddress) return;
    setSaving(true);

    const now = Date.now();
    const node: KGNode = {
      uorAddress: noteAddress,
      label: `Daily Note — ${dateStr}`,
      nodeType: "daily-note",
      rdfType: "vault:DailyNote",
      properties: {
        date: dateStr,
        blocks: updatedBlocks,
        blockCount: updatedBlocks.length,
        wordCount: updatedBlocks.reduce((sum, b) => sum + b.content.split(/\s+/).filter(Boolean).length, 0),
      },
      createdAt: now,
      updatedAt: now,
      syncState: "local",
    };

    await localGraphStore.putNode(node);

    // Link to previous day's note
    const prevDateStr = format(subDays(currentDate, 1), "yyyy-MM-dd");
    const prevAddr = await dailyNoteAddress(prevDateStr);
    const prevEdge: KGEdge = {
      id: `${noteAddress}|schema:previousEntry|${prevAddr}`,
      subject: noteAddress,
      predicate: "schema:previousEntry",
      object: prevAddr,
      graphIri: "urn:uor:local",
      createdAt: now,
      syncState: "local",
    };
    await localGraphStore.putEdge(prevEdge.subject, prevEdge.predicate, prevEdge.object, prevEdge.graphIri);

    // Parse wiki-links and hashtags from all blocks
    const fullText = updatedBlocks.map(b => b.content).join("\n");
    if (hasWikiSyntax(fullText)) {
      try {
        const parsed = await parseWikiLinks(fullText);
        const edges: KGEdge[] = [];

        for (const wl of parsed.wikiLinks) {
          await localGraphStore.putNode({
            uorAddress: wl.address,
            label: wl.label,
            nodeType: "entity",
            rdfType: "schema:Thing",
            properties: { wikiPage: true, value: wl.label },
            createdAt: now,
            updatedAt: now,
            syncState: "local",
          });
          const edge: KGEdge = {
            id: `${noteAddress}|schema:mentions|${wl.address}`,
            subject: noteAddress,
            predicate: "schema:mentions",
            object: wl.address,
            graphIri: "urn:uor:local",
            createdAt: now,
            syncState: "local",
          };
          await localGraphStore.putEdge(edge.subject, edge.predicate, edge.object, edge.graphIri);
          edges.push(edge);
        }

        for (const ht of parsed.hashtags) {
          await localGraphStore.putNode({
            uorAddress: ht.address,
            label: ht.label,
            nodeType: "entity",
            rdfType: "schema:DefinedTerm",
            properties: { topic: true, tag: ht.tag },
            createdAt: now,
            updatedAt: now,
            syncState: "local",
          });
          const edge: KGEdge = {
            id: `${noteAddress}|schema:about|${ht.address}`,
            subject: noteAddress,
            predicate: "schema:about",
            object: ht.address,
            graphIri: "urn:uor:local",
            createdAt: now,
            syncState: "local",
          };
          await localGraphStore.putEdge(edge.subject, edge.predicate, edge.object, edge.graphIri);
          edges.push(edge);
        }

        for (const edge of edges) {
          invalidateBacklinks(edge.object);
        }
      } catch {
        // Best-effort
      }
    }

    setSaving(false);
  }, [noteAddress, dateStr, currentDate]);

  const debouncedPersist = useCallback((updatedBlocks: Block[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => persistToGraph(updatedBlocks), 800);
  }, [persistToGraph]);

  // ── Block editing ─────────────────────────────────────────────────────

  const updateBlock = useCallback((blockId: string, content: string) => {
    setBlocks(prev => {
      const updated = prev.map(b => b.id === blockId ? { ...b, content } : b);
      debouncedPersist(updated);
      return updated;
    });
  }, [debouncedPersist]);

  const addBlockAfter = useCallback(async (afterId: string) => {
    const idx = blocks.findIndex(b => b.id === afterId);
    const newId = crypto.randomUUID();
    const addr = await blockAddress(dateStr, idx + 1, "");
    const newBlock: Block = {
      id: newId,
      content: "",
      address: addr,
      indent: blocks[idx]?.indent || 0,
      createdAt: Date.now(),
    };
    setBlocks(prev => {
      const updated = [...prev];
      updated.splice(idx + 1, 0, newBlock);
      debouncedPersist(updated);
      return updated;
    });
    // Focus new block after render
    requestAnimationFrame(() => {
      inputRefs.current.get(newId)?.focus();
    });
  }, [blocks, dateStr, debouncedPersist]);

  const removeBlock = useCallback((blockId: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(b => b.id === blockId);
      const updated = prev.filter(b => b.id !== blockId);
      debouncedPersist(updated);
      // Focus previous block
      const focusIdx = Math.max(0, idx - 1);
      requestAnimationFrame(() => {
        const focusId = updated[focusIdx]?.id;
        if (focusId) inputRefs.current.get(focusId)?.focus();
      });
      return updated;
    });
  }, [debouncedPersist]);

  const indentBlock = useCallback((blockId: string, delta: number) => {
    setBlocks(prev => {
      const updated = prev.map(b =>
        b.id === blockId ? { ...b, indent: Math.max(0, Math.min(4, b.indent + delta)) } : b
      );
      debouncedPersist(updated);
      return updated;
    });
  }, [debouncedPersist]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addBlockAfter(blockId);
    } else if (e.key === "Backspace") {
      const block = blocks.find(b => b.id === blockId);
      if (block?.content === "") {
        e.preventDefault();
        removeBlock(blockId);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      indentBlock(blockId, e.shiftKey ? -1 : 1);
    }
  }, [addBlockAfter, removeBlock, indentBlock, blocks]);

  // ── Render wiki-links inline ──────────────────────────────────────────

  const renderContent = (content: string) => {
    if (!content) return <span className="text-muted-foreground/40 italic">Type here...</span>;
    // Highlight [[wiki-links]] and #hashtags
    const parts = content.split(/(\[\[[^\]]+\]\]|#[a-zA-Z][\w-]{1,48})/g);
    return parts.map((part, i) => {
      if (part.startsWith("[[") && part.endsWith("]]")) {
        return (
          <span key={i} className="text-primary font-medium bg-primary/10 rounded px-0.5">
            {part}
          </span>
        );
      }
      if (part.startsWith("#") && part.length > 1) {
        return (
          <span key={i} className="text-accent-foreground/80 bg-accent/20 rounded px-0.5">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // ── Navigation ────────────────────────────────────────────────────────

  const goToday = useCallback(() => setCurrentDate(new Date()), []);
  const goPrev = useCallback(() => setCurrentDate(d => subDays(d, 1)), []);
  const goNext = useCallback(() => setCurrentDate(d => addDays(d, 1)), []);

  // ── UI ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* Main editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Date header */}
          <div className="flex items-center gap-3 mb-8">
            <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">{displayDate}</h1>
              {isToday && (
                <span className="text-xs text-primary font-medium">Today</span>
              )}
            </div>
            <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            {!isToday && (
              <button onClick={goToday} className="text-xs text-primary hover:underline ml-2">Today</button>
            )}
            {saving && (
              <span className="text-[10px] text-muted-foreground animate-pulse">saving…</span>
            )}
          </div>

          {/* Blocks */}
          {loaded && (
            <div className="space-y-0.5">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-start group"
                  style={{ paddingLeft: `${block.indent * 24}px` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-[11px] mr-2 shrink-0 group-hover:bg-primary/50 transition-colors" />
                  <textarea
                    ref={(el) => {
                      if (el) inputRefs.current.set(block.id, el);
                      else inputRefs.current.delete(block.id);
                    }}
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, block.id)}
                    placeholder="Type here... Use [[wiki-links]] and #hashtags"
                    className="flex-1 bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/30 py-1.5 min-h-[32px]"
                    rows={1}
                    style={{ height: "auto" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Resurfacing suggestions */}
          <div className="mt-12">
            <ResurfacingSuggestions />
          </div>
        </div>
      </div>

      {/* Linked References sidebar */}
      {noteAddress && (
        <div className="w-80 border-l border-border/50 overflow-y-auto shrink-0">
          <LinkedReferencesSidebar address={noteAddress} />
        </div>
      )}
    </div>
  );
}
