/**
 * FocusJournalOverlay — TLDR "What You Missed" Panel
 * ═══════════════════════════════════════════════════
 *
 * Appears when the user exits focus mode. Shows a compressed,
 * relevance-sorted summary of everything that was suppressed.
 *
 * UOR Alignment:
 *   This IS the compression witness — a morphism:Isometry that
 *   preserves essential signal properties while discarding noise.
 *   The information_loss_ratio is (noiseCount / totalSuppressed).
 *
 * Design: Aman-inspired — minimal, warm earth tones, serif headings,
 * slides in from right with a gentle blur backdrop.
 *
 * @module hologram-ui/components/FocusJournalOverlay
 */

import { useFocusJournal, type TLDR, type TLDRGroup, type JournalEntry } from "../hooks/useFocusJournal";

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

function RelevanceBar({ value }: { value: number }) {
  return (
    <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "hsla(38, 15%, 50%, 0.15)" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${value * 100}%`,
          background: value > 0.6
            ? "hsla(38, 45%, 55%, 0.8)"
            : value > 0.3
              ? "hsla(38, 25%, 55%, 0.5)"
              : "hsla(38, 10%, 55%, 0.3)",
        }}
      />
    </div>
  );
}

function EntryRow({ entry }: { entry: JournalEntry }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <RelevanceBar value={entry.relevance} />
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] leading-relaxed truncate"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            color: entry.isSignal
              ? "hsla(38, 15%, 85%, 0.85)"
              : "hsla(38, 10%, 65%, 0.4)",
          }}
        >
          {entry.message}
        </p>
      </div>
      <span
        className="text-[9px] tabular-nums shrink-0"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: "hsla(38, 10%, 65%, 0.3)",
        }}
      >
        {Math.round(entry.relevance * 100)}%
      </span>
    </div>
  );
}

function GroupSection({ group }: { group: TLDRGroup }) {
  // Show top 3 entries per group
  const shown = group.entries.slice(0, 3);
  const remaining = group.count - shown.length;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{group.icon}</span>
        <span
          className="text-[10px] tracking-[0.2em] uppercase"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            color: "hsla(38, 15%, 75%, 0.5)",
          }}
        >
          {group.label}
        </span>
        <span
          className="text-[9px] tabular-nums"
          style={{ color: "hsla(38, 10%, 65%, 0.3)" }}
        >
          {group.count}
        </span>
      </div>
      {shown.map((entry) => (
        <EntryRow key={entry.id} entry={entry} />
      ))}
      {remaining > 0 && (
        <p
          className="text-[9px] pl-[60px]"
          style={{ color: "hsla(38, 10%, 65%, 0.25)" }}
        >
          +{remaining} more
        </p>
      )}
    </div>
  );
}

function TLDRContent({ tldr, onDismiss }: { tldr: TLDR; onDismiss: () => void }) {
  const snrPercent = Math.round(tldr.snr * 100);

  return (
    <div
      className="fixed top-0 right-0 bottom-0 z-[9998] flex items-center justify-end animate-slide-in-right"
      style={{ pointerEvents: "auto" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={onDismiss}
        style={{
          background: "hsla(25, 10%, 4%, 0.4)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />

      {/* Panel */}
      <div
        className="relative h-full w-full max-w-sm overflow-y-auto"
        style={{
          background: "hsla(30, 8%, 8%, 0.95)",
          borderLeft: "1px solid hsla(38, 15%, 30%, 0.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2
                className="leading-tight"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 300,
                  fontSize: "clamp(20px, 2.5vw, 28px)",
                  color: "hsla(38, 15%, 88%, 0.9)",
                }}
              >
                While you were focused
              </h2>
              <button
                onClick={onDismiss}
                className="p-2 rounded-full transition-colors"
                style={{ color: "hsla(38, 10%, 65%, 0.4)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "hsla(38, 15%, 85%, 0.8)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "hsla(38, 10%, 65%, 0.4)")
                }
              >
                ✕
              </button>
            </div>

            {/* Stats bar */}
            <div
              className="flex items-center gap-4 py-3 px-4 rounded-lg"
              style={{
                background: "hsla(38, 12%, 15%, 0.3)",
                border: "1px solid hsla(38, 15%, 30%, 0.08)",
              }}
            >
              <div className="text-center">
                <p
                  className="text-[18px] tabular-nums"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: "hsla(38, 35%, 70%, 0.9)",
                    fontWeight: 300,
                  }}
                >
                  {formatDuration(tldr.duration)}
                </p>
                <p
                  className="text-[8px] tracking-[0.3em] uppercase mt-0.5"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    color: "hsla(38, 10%, 65%, 0.35)",
                  }}
                >
                  Focus time
                </p>
              </div>

              <div
                className="w-px h-8"
                style={{ background: "hsla(38, 15%, 40%, 0.12)" }}
              />

              <div className="text-center">
                <p
                  className="text-[18px] tabular-nums"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color: "hsla(38, 35%, 70%, 0.9)",
                    fontWeight: 300,
                  }}
                >
                  {tldr.totalSuppressed}
                </p>
                <p
                  className="text-[8px] tracking-[0.3em] uppercase mt-0.5"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    color: "hsla(38, 10%, 65%, 0.35)",
                  }}
                >
                  Suppressed
                </p>
              </div>

              <div
                className="w-px h-8"
                style={{ background: "hsla(38, 15%, 40%, 0.12)" }}
              />

              <div className="text-center">
                <p
                  className="text-[18px] tabular-nums"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    color:
                      snrPercent > 50
                        ? "hsla(38, 45%, 60%, 0.9)"
                        : "hsla(38, 15%, 60%, 0.7)",
                    fontWeight: 300,
                  }}
                >
                  {snrPercent}%
                </p>
                <p
                  className="text-[8px] tracking-[0.3em] uppercase mt-0.5"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    color: "hsla(38, 10%, 65%, 0.35)",
                  }}
                >
                  Signal
                </p>
              </div>
            </div>
          </div>

          {/* Highlights */}
          {tldr.highlights.length > 0 && (
            <div className="space-y-2">
              <p
                className="text-[9px] tracking-[0.3em] uppercase"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  color: "hsla(38, 25%, 60%, 0.5)",
                }}
              >
                Most relevant
              </p>
              {tldr.highlights.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="flex justify-center">
            <div
              className="w-8 h-px"
              style={{ background: "hsla(38, 15%, 40%, 0.15)" }}
            />
          </div>

          {/* Groups */}
          {tldr.groups.map((group) => (
            <GroupSection key={group.label} group={group} />
          ))}

          {/* Empty state */}
          {tldr.totalSuppressed === 0 && (
            <div className="text-center py-8">
              <p
                className="text-[13px]"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "hsla(38, 15%, 75%, 0.5)",
                  fontWeight: 300,
                }}
              >
                Nothing was missed.
                <br />
                Perfect stillness.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4">
            <button
              onClick={onDismiss}
              className="w-full py-3 text-center rounded transition-all duration-500"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: "11px",
                letterSpacing: "0.25em",
                textTransform: "uppercase" as const,
                color: "hsla(38, 15%, 75%, 0.5)",
                border: "1px solid hsla(38, 15%, 40%, 0.12)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "hsla(38, 15%, 40%, 0.08)";
                e.currentTarget.style.color = "hsla(38, 15%, 85%, 0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "hsla(38, 15%, 75%, 0.5)";
              }}
            >
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FocusJournalOverlay() {
  const { pendingTLDR, dismissTLDR } = useFocusJournal();

  if (!pendingTLDR) return null;

  return <TLDRContent tldr={pendingTLDR} onDismiss={dismissTLDR} />;
}
