/**
 * IngestionResults — Displays the parsed entities, relations, and UOR mappings
 * after a successful repository ingestion.
 */

import { FileCode, GitFork, Hash, Layers } from "lucide-react";
import type { IngestionResult } from "../lib/ingestion";
import type { UorMappingResult } from "../lib/uor-mapper";

interface IngestionResultsProps {
  ingestion: IngestionResult;
  mapping: UorMappingResult | null;
}

export function IngestionResults({ ingestion, mapping }: IngestionResultsProps) {
  const stats = [
    { icon: FileCode, label: "Files", value: ingestion.files.length },
    { icon: Layers, label: "Entities", value: ingestion.entities.length },
    { icon: GitFork, label: "Relations", value: ingestion.relations.length },
    { icon: Hash, label: "Lines", value: ingestion.totalLines.toLocaleString() },
  ];

  // Group entities by type
  const byType = new Map<string, number>();
  for (const e of ingestion.entities) {
    byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3
          className="text-lg font-light text-foreground"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {ingestion.repoName}
        </h3>
        {mapping && (
          <p
            className="text-[10px] font-mono text-muted-foreground"
            title={mapping.sessionProof.cid}
          >
            CID: {mapping.sessionProof.cid.slice(0, 24)}…
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 py-3 rounded-lg bg-card border border-border"
          >
            <Icon size={14} className="text-primary" />
            <span
              className="text-lg font-light text-foreground"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {value}
            </span>
            <span
              className="text-[10px] text-muted-foreground uppercase tracking-wider"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Entity breakdown */}
      <div className="space-y-2">
        <h4
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          Entity Breakdown
        </h4>
        <div className="flex flex-wrap gap-2">
          {Array.from(byType.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <span
                key={type}
                className="px-2.5 py-1 rounded-full bg-primary/8 text-primary text-xs"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                {type}: {count}
              </span>
            ))}
        </div>
      </div>

      {/* UOR Triples preview */}
      {mapping && mapping.triples.length > 0 && (
        <div className="space-y-2">
          <h4
            className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Sample Triples ({mapping.triples.length} total)
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {mapping.triples.slice(0, 8).map((t, i) => (
              <div
                key={i}
                className="flex items-baseline gap-2 text-[11px] font-mono text-muted-foreground py-1 px-2 rounded bg-muted/30"
              >
                <span className="text-foreground truncate max-w-[30%]" title={t.subject}>
                  {t.subject.split(":").pop()}
                </span>
                <span className="text-primary shrink-0">
                  {t.predicate.split(":").pop()}
                </span>
                <span className="text-foreground truncate max-w-[30%]" title={t.object}>
                  {t.object.split(":").pop()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
