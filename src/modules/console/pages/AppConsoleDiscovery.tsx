/**
 * App Console — Discovery Page (P13)
 *
 * Network overview, app leaderboard, H-score trends.
 */

import {
  StatCard,
  ConsoleTable,
  CanonicalIdBadge,
  ZoneBadge,
} from "../components/ConsoleUI";

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
  const meanH = MOCK_LEADERBOARD.reduce((s, a) => s + a.hScore, 0) / MOCK_LEADERBOARD.length;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Discovery — Network Overview</h2>

      {/* Zone distribution */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Apps" value={MOCK_LEADERBOARD.length} sub="On network" />
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">COHERENCE Zone</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{coherence}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">High-trust apps</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">DRIFT Zone</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">{drift}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Degrading quality</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">COLLAPSE Zone</p>
          <p className="mt-1 text-2xl font-semibold text-destructive">{collapse}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Quarantined</p>
        </div>
      </div>

      {/* H-score trend */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">H-Score Trend (Your Apps vs Network Mean)</p>
        <div className="flex items-end gap-2 h-20">
          {[0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 0].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t ${h === 0 ? "bg-emerald-500/70" : h <= 2 ? "bg-amber-500/70" : "bg-destructive/70"}`}
                style={{ height: `${Math.max(8, h * 20)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>12 months ago</span><span>Now</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Network mean H-score: {meanH.toFixed(1)}</p>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className="text-sm font-medium mb-2">App Leaderboard</h3>
        <ConsoleTable
          columns={[
            { key: "rank", label: "#", render: (v) => <span className="font-semibold text-foreground">{String(v)}</span> },
            { key: "name", label: "App", render: (v) => <span className="font-medium">{String(v)}</span> },
            { key: "canonicalId", label: "Canonical ID", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "zone", label: "Zone", render: (v) => <ZoneBadge zone={String(v) as "COHERENCE" | "DRIFT" | "COLLAPSE"} /> },
            { key: "discoveryRank", label: "Rank Score", render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
            { key: "hScore", label: "H-Score", render: (v) => (
              <span className={`font-mono text-xs ${Number(v) === 0 ? "text-emerald-600 dark:text-emerald-400" : Number(v) <= 4 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>
                {String(v)}
              </span>
            ) },
          ]}
          rows={MOCK_LEADERBOARD}
        />
      </div>
    </div>
  );
}
