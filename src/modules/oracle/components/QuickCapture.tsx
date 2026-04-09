/**
 * QuickCapture — Zero-friction global thought capture.
 *
 * A floating frosted-glass pill summoned by Ring shortcut (Ctrl+. then Space).
 * Type a thought, hit Enter — it's captured to today's daily note
 * and indexed in the knowledge graph. No navigation required.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { singleProofHash } from "@/lib/uor-canonical";
import { localGraphStore } from "@/modules/knowledge-graph/local-store";
import { parseWikiLinks, hasWikiSyntax } from "@/modules/knowledge-graph/lib/wiki-links";
import { invalidateBacklinks } from "@/modules/knowledge-graph/backlinks";
import type { KGNode } from "@/modules/knowledge-graph/types";

const UOR_CONTEXT = "https://uor.foundation/contexts/uor-v1.jsonld";

interface Props {
  open: boolean;
  onClose: () => void;
}

async function dailyNoteAddress(dateStr: string): Promise<string> {
  const proof = await singleProofHash({
    "@context": UOR_CONTEXT,
    "@type": "vault:DailyNote",
    "schema:datePublished": dateStr,
  });
  return proof.ipv6Address["u:ipv6"];
}

export default function QuickCapture({ open, onClose }: Props) {
  const [value, setValue] = useState("");
  const [captured, setCaptured] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setCaptured(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleCapture = useCallback(async () => {
    const text = value.trim();
    if (!text) return;

    const dateStr = format(new Date(), "yyyy-MM-dd");
    const noteAddr = await dailyNoteAddress(dateStr);
    const now = Date.now();

    // Get or create daily note
    const existing = await localGraphStore.getNode(noteAddr);
    const blocks = (existing?.properties?.blocks as Array<{
      id: string; content: string; address: string; indent: number; createdAt: number;
    }>) || [];

    // Create new block
    const blockProof = await singleProofHash({
      "@context": UOR_CONTEXT,
      "@type": "vault:Block",
      "schema:isPartOf": dateStr,
      "schema:position": blocks.length,
      "schema:text": text,
    });

    blocks.push({
      id: crypto.randomUUID(),
      content: text,
      address: blockProof.ipv6Address["u:ipv6"],
      indent: 0,
      createdAt: now,
    });

    // Update daily note
    const node: KGNode = {
      uorAddress: noteAddr,
      label: `Daily Note — ${dateStr}`,
      nodeType: "daily-note",
      rdfType: "vault:DailyNote",
      properties: {
        date: dateStr,
        blocks,
        blockCount: blocks.length,
        wordCount: blocks.reduce((sum, b) => sum + b.content.split(/\s+/).filter(Boolean).length, 0),
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      syncState: "local",
    };

    await localGraphStore.putNode(node);

    // Parse and create wiki-link edges
    if (hasWikiSyntax(text)) {
      try {
        const parsed = await parseWikiLinks(text);
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
          await localGraphStore.putEdge(noteAddr, "schema:mentions", wl.address, "urn:uor:local");
          invalidateBacklinks(wl.address);
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
          await localGraphStore.putEdge(noteAddr, "schema:about", ht.address, "urn:uor:local");
          invalidateBacklinks(ht.address);
        }
      } catch {
        // Best-effort
      }
    }

    // Show confirmation
    setCaptured(true);
    setTimeout(() => {
      onClose();
    }, 600);
  }, [value, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCapture();
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [handleCapture, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-black/20"
            onClick={onClose}
          />

          {/* Capture pill */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[201] w-[560px] max-w-[90vw]"
          >
            <div
              className="rounded-2xl border border-border/40 shadow-2xl overflow-hidden"
              style={{
                background: "hsl(var(--background) / 0.85)",
                backdropFilter: "blur(24px) saturate(1.3)",
                WebkitBackdropFilter: "blur(24px) saturate(1.3)",
              }}
            >
              {captured ? (
                <div className="flex items-center justify-center gap-2 py-5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                  >
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </motion.div>
                  <span className="text-sm text-foreground/70">Captured to today's note</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Capture a thought… [[wiki-links]] and #hashtags auto-link"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/40"
                  />
                  <button
                    onClick={handleCapture}
                    disabled={!value.trim()}
                    className="text-xs text-primary font-medium hover:underline disabled:opacity-30 disabled:no-underline shrink-0"
                  >
                    Capture ↵
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
