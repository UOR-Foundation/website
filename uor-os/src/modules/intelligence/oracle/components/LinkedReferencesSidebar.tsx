/**
 * LinkedReferencesSidebar — Automatic backlink context surfacing.
 *
 * Shows all incoming references to a node, grouped by type,
 * with surrounding context. Roam's "Linked References" panel.
 */

import { useState, useEffect } from "react";
import { getBacklinks, type Backlink } from "@/modules/data/knowledge-graph/backlinks";
import { findUnlinkedReferences, type UnlinkedReference } from "@/modules/data/knowledge-graph/backlinks";
import { localGraphStore } from "@/modules/data/knowledge-graph/local-store";

interface Props {
  address: string;
  label?: string;
}

function groupByType(backlinks: Backlink[]): Record<string, Backlink[]> {
  const groups: Record<string, Backlink[]> = {};
  for (const bl of backlinks) {
    const key = bl.nodeType === "daily-note" ? "Daily Notes" :
                bl.nodeType === "file" ? "Documents" :
                bl.nodeType === "paste" ? "Pastes" :
                bl.nodeType === "url" ? "Web Pages" :
                "Other";
    (groups[key] ??= []).push(bl);
  }
  return groups;
}

function predicateLabel(pred: string): string {
  const map: Record<string, string> = {
    "schema:mentions": "mentions",
    "schema:about": "tagged",
    "schema:hasColumn": "has column",
    "schema:previousEntry": "previous",
    "schema:contactPoint": "contact",
    "schema:temporal": "date ref",
  };
  return map[pred] || pred.split(/[:/]/).pop() || pred;
}

export default function LinkedReferencesSidebar({ address, label }: Props) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [unlinked, setUnlinked] = useState<UnlinkedReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnlinked, setShowUnlinked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const bls = await getBacklinks(address);
      if (cancelled) return;
      setBacklinks(bls);
      setLoading(false);

      // Also fetch unlinked references if we have a label
      if (label) {
        const ul = await findUnlinkedReferences(label, address);
        if (!cancelled) setUnlinked(ul);
      } else {
        // Try to get label from node
        const node = await localGraphStore.getNode(address);
        if (node && !cancelled) {
          const ul = await findUnlinkedReferences(node.label, address);
          if (!cancelled) setUnlinked(ul);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [address, label]);

  const groups = groupByType(backlinks);
  const groupKeys = Object.keys(groups).sort();

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Linked References
        {backlinks.length > 0 && (
          <span className="ml-1.5 text-primary font-bold">{backlinks.length}</span>
        )}
      </h3>

      {loading && (
        <div className="text-xs text-muted-foreground/50 animate-pulse">Scanning graph…</div>
      )}

      {!loading && backlinks.length === 0 && (
        <p className="text-xs text-muted-foreground/40 italic">
          No references yet. Mention this in a daily note or document to create links.
        </p>
      )}

      {groupKeys.map(group => (
        <div key={group} className="mb-4">
          <h4 className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1.5">
            {group} ({groups[group].length})
          </h4>
          <div className="space-y-1.5">
            {groups[group].map((bl) => (
              <button
                key={`${bl.source}-${bl.predicate}`}
                className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                onClick={() => {
                  // Dispatch navigation event
                  window.dispatchEvent(new CustomEvent("uor:navigate-node", { detail: bl.source }));
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground truncate">
                    {bl.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground/40 shrink-0">
                    {predicateLabel(bl.predicate)}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground/50 mt-0.5">
                  {new Date(bl.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Unlinked References */}
      {unlinked.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border/30">
          <button
            onClick={() => setShowUnlinked(!showUnlinked)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mb-2"
          >
            <svg className={`w-3 h-3 transition-transform ${showUnlinked ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span className="font-medium uppercase tracking-wider">Unlinked References</span>
            <span className="text-primary font-bold">{unlinked.length}</span>
          </button>

          {showUnlinked && (
            <div className="space-y-1.5">
              {unlinked.map((ul) => (
                <div
                  key={ul.nodeAddress}
                  className="p-2 rounded-lg bg-muted/20 border border-dashed border-border/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/70 truncate">{ul.nodeLabel}</span>
                    <button
                      onClick={async () => {
                        // Create the link
                        await localGraphStore.putEdge(
                          ul.nodeAddress,
                          "schema:mentions",
                          address,
                          "urn:uor:local"
                        );
                        // Remove from unlinked
                        setUnlinked(prev => prev.filter(u => u.nodeAddress !== ul.nodeAddress));
                        // Add to backlinks
                        setBacklinks(prev => [...prev, {
                          source: ul.nodeAddress,
                          predicate: "schema:mentions",
                          label: ul.nodeLabel,
                          nodeType: ul.nodeType,
                          createdAt: Date.now(),
                        }]);
                      }}
                      className="text-[9px] text-primary hover:underline shrink-0 ml-2"
                    >
                      Link
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5 line-clamp-2">
                    {ul.contextSnippet}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
