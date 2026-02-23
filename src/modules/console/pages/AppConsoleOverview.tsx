/**
 * App Console — Overview Page (Trust Wallet-inspired)
 *
 * Clean stat cards with generous spacing, minimal borders,
 * and a professional dark-theme aesthetic.
 */

import {
  StatCard,
  ConsoleTable,
  CanonicalIdBadge,
  ZoneBadge,
  StatusBadge,
} from "../components/ConsoleUI";
import { Activity, Shield, Cpu, Users } from "lucide-react";

const MOCK_APPS = [
  { name: "my-saas-app", canonicalId: "urn:uor:derivation:sha256:a1b2c3d4e5f6071829abcdef01234567890abcdef01234567890abcdef012345", zone: "COHERENCE", deployedAt: "2026-02-22T14:00:00Z" },
  { name: "ai-chatbot", canonicalId: "urn:uor:derivation:sha256:deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb", zone: "DRIFT", deployedAt: "2026-02-21T10:30:00Z" },
  { name: "data-viz-tool", canonicalId: "urn:uor:derivation:sha256:0011223344556677889900aabbccddeeff00112233445566778899aabbccddeeff", zone: "COHERENCE", deployedAt: "2026-02-20T08:15:00Z" },
];

export default function AppConsoleOverview() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your infrastructure at a glance.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Apps</p>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">3</p>
          <p className="text-[11px] text-muted-foreground">Content-addressed</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Users</p>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">127</p>
          <p className="text-[11px] text-muted-foreground">Pod-certified</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Revenue</p>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cpu className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">$2.8k</p>
          <p className="text-[11px] text-muted-foreground">100% dev revenue</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Shield</p>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">0</p>
          <p className="text-[11px] text-muted-foreground">Active threats</p>
        </div>
      </div>

      {/* Density Chart */}
      <div className="rounded-2xl border border-border/40 bg-card/50 p-6">
        <p className="text-xs font-medium text-muted-foreground mb-4">
          Execution Density (24h)
        </p>
        <div className="flex items-end gap-1 h-20">
          {Array.from({ length: 24 }, (_, i) => {
            const h = 30 + Math.sin(i * 0.4) * 20 + Math.cos(i * 0.7) * 10;
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/60 hover:bg-primary transition-colors"
                style={{ height: `${Math.max(10, h)}%` }}
                title={`${String(i).padStart(2, "0")}:00`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground/60">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>Now</span>
        </div>
      </div>

      {/* Recent Deployments */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Recent Deployments
        </h2>
        <ConsoleTable
          columns={[
            {
              key: "name",
              label: "App",
              render: (v) => <span className="font-medium text-foreground">{String(v)}</span>,
            },
            {
              key: "canonicalId",
              label: "Canonical ID",
              render: (v) => <CanonicalIdBadge id={String(v)} />,
            },
            {
              key: "zone",
              label: "Zone",
              render: (v) => <ZoneBadge zone={String(v) as "COHERENCE" | "DRIFT" | "COLLAPSE"} />,
            },
            {
              key: "deployedAt",
              label: "Deployed",
              render: (v) => (
                <span className="text-xs text-muted-foreground">
                  {new Date(String(v)).toLocaleDateString()}
                </span>
              ),
            },
          ]}
          rows={MOCK_APPS}
        />
      </div>
    </div>
  );
}
