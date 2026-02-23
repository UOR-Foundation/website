/**
 * App Console — Discovery Page (Trust Wallet-inspired)
 *
 * Network overview with spacious cards and leaderboard.
 */

import {
  ConsoleTable,
  CanonicalIdBadge,
  ZoneBadge,
} from "../components/ConsoleUI";
import { Globe, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

const MOCK_LEADERBOARD = [
  { rank: 1, name: "defi-dashboard", canonicalId: "urn:uor:derivation:sha256:leader001aabbccddeeff001122334455667788", zone: "COHERENCE" as const, discoveryRank: 135, hScore: 0 },
  { rank: 2, name: "my-saas-app", canonicalId: "urn:uor:derivation:sha256:a1b2c3d4e5f6071829abcdef01234567890ab", zone: "COHERENCE" as const, discoveryRank: 115, hScore: 0 },
  { rank: 3, name: "ai-chatbot", canonicalId: "urn:uor:derivation:sha256:deadbeef00112233445566778899aabbccdd", zone: "DRIFT" as const, discoveryRank: 62, hScore: 3 },
  { rank: 4, name: "old-api", canonicalId: "urn:uor:derivation:sha256:collapse001aabbccddeeff001122334455667788", zone: "COLLAPSE" as const, discoveryRank: 5, hScore: 7 },
];

export default function AppConsoleDiscovery() {
  const coherence = MOCK_LEADERBOARD.filter((a) => a.zone === "COHERENCE").length;
  const drift = MOCK_LEADERBOARD.filter((a) => a.zone === "DRIFT").length;
  const collapse = MOCK_LEADERBOARD.filter((a) => a.zone === "COLLAPSE").length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Discovery</h1>
        <p className="mt-1 text-sm text-muted-foreground">Network-wide app reputation and observer zones.</p>
      </div>

      {/* Zone cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Coherence</p>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{coherence}</p>
          <p className="text-[11px] text-muted-foreground">High-trust apps</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Drift</p>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{drift}</p>
          <p className="text-[11px] text-muted-foreground">Quality degrading</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Collapse</p>
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          </div>
          <p className="text-3xl font-bold text-destructive">{collapse}</p>
          <p className="text-[11px] text-muted-foreground">Quarantined</p>
        </div>
      </div>

      {/* H-Score Trend */}
      <div className="rounded-2xl border border-border/40 bg-card/50 p-6">
        <p className="text-xs font-medium text-muted-foreground mb-4">H-Score Trend (12 months)</p>
        <div className="flex items-end gap-2 h-20">
          {[0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 0].map((h, i) => (
            <div key={i} className="flex-1">
              <div
                className={`w-full rounded-t transition-colors ${
                  h === 0
                    ? "bg-emerald-500/60"
                    : h <= 2
                    ? "bg-amber-500/60"
                    : "bg-destructive/60"
                }`}
                style={{ height: `${Math.max(8, h * 25)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground/60">
          <span>12mo ago</span><span>Now</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Leaderboard
        </h2>
        <ConsoleTable
          columns={[
            { key: "rank", label: "#", render: (v) => <span className="font-bold text-foreground">{String(v)}</span> },
            { key: "name", label: "App", render: (v) => <span className="font-medium">{String(v)}</span> },
            { key: "canonicalId", label: "ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "zone", label: "Zone", render: (v) => <ZoneBadge zone={String(v) as "COHERENCE" | "DRIFT" | "COLLAPSE"} /> },
            { key: "discoveryRank", label: "Score", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
            {
              key: "hScore",
              label: "H-Score",
              render: (v) => (
                <span
                  className={`font-mono text-xs ${
                    Number(v) === 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : Number(v) <= 4
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-destructive"
                  }`}
                >
                  {String(v)}
                </span>
              ),
            },
          ]}
          rows={MOCK_LEADERBOARD}
        />
      </div>
    </div>
  );
}
