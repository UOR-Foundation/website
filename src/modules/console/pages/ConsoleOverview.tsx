/**
 * UNS Console — Overview Page (Trust Wallet-inspired)
 *
 * Clean, spacious overview with minimal visual noise.
 */

import {
  StatCard,
  ConsoleTable,
  CanonicalIdBadge,
  StatusBadge,
} from "../components/ConsoleUI";
import { Globe, Shield, Cpu, Database } from "lucide-react";

const MOCK_RECORDS = [
  { name: "api.example.uns", target: "urn:uor:derivation:sha256:f1a2b3c4d5e60718293a4b5c6d7e8f90", status: "active" },
  { name: "app.demo.uns", target: "urn:uor:derivation:sha256:0011223344556677889900aabbccddeeff", status: "active" },
  { name: "old.test.uns", target: "urn:uor:derivation:sha256:deadbeef00112233445566778899aabb", status: "expired" },
];

export default function ConsoleOverview() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">UNS node infrastructure status.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Records</p>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">42</p>
          <p className="text-[11px] text-muted-foreground">UNS name records</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Shield</p>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">1.2k</p>
          <p className="text-[11px] text-muted-foreground">Events (24h)</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Compute</p>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cpu className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">318</p>
          <p className="text-[11px] text-muted-foreground">Invocations</p>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Store</p>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">2.4k</p>
          <p className="text-[11px] text-muted-foreground">Objects</p>
        </div>
      </div>

      {/* Density Chart */}
      <div className="rounded-2xl border border-border/40 bg-card/50 p-6">
        <p className="text-xs font-medium text-muted-foreground mb-4">Partition Density (24h)</p>
        <div className="flex items-end gap-1 h-16">
          {Array.from({ length: 24 }, (_, i) => {
            const h = 20 + Math.sin(i * 0.5) * 15 + Math.cos(i * 0.3) * 8;
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/60 hover:bg-primary transition-colors"
                style={{ height: `${Math.max(8, h)}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground/60">
          <span>00:00</span><span>12:00</span><span>Now</span>
        </div>
      </div>

      {/* Recent Records */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Recent Records
        </h2>
        <ConsoleTable
          columns={[
            { key: "name", label: "Name", render: (v) => <span className="font-medium">{String(v)}</span> },
            { key: "target", label: "Target", render: (v) => <CanonicalIdBadge id={String(v)} /> },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
          ]}
          rows={MOCK_RECORDS}
        />
      </div>
    </div>
  );
}
