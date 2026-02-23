/**
 * App Console — Apps Page (Trust Wallet-inspired)
 *
 * Clean deployment cards with single-line deploy input,
 * spacious layout, and polished visual hierarchy.
 */

import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CanonicalIdBadge,
  ZoneBadge,
} from "../components/ConsoleUI";
import { ArrowRight, Loader2, Globe, Users, DollarSign, QrCode, Copy } from "lucide-react";
import heroImage from "@/assets/console-deploy-hero.png";

interface AppCard {
  name: string;
  canonicalId: string;
  zone: "COHERENCE" | "DRIFT" | "COLLAPSE";
  userCount: number;
  revenue: number;
  ipv6: string;
}

const MOCK_APPS: AppCard[] = [
  { name: "my-saas-app", canonicalId: "urn:uor:derivation:sha256:a1b2c3d4e5f6071829abcdef01234567890abcdef01234567890abcdef012345", zone: "COHERENCE", userCount: 89, revenue: 1842.40, ipv6: "fd00:75:6f72:a1b2::1" },
  { name: "ai-chatbot", canonicalId: "urn:uor:derivation:sha256:deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb", zone: "DRIFT", userCount: 34, revenue: 567.20, ipv6: "fd00:75:6f72:dead::1" },
  { name: "data-viz-tool", canonicalId: "urn:uor:derivation:sha256:0011223344556677889900aabbccddeeff00112233445566778899aabbccddeeff", zone: "COHERENCE", userCount: 4, revenue: 438.00, ipv6: "fd00:75:6f72:0011::1" },
];

export default function AppConsoleApps() {
  const [importUrl, setImportUrl] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployPhase, setDeployPhase] = useState("");

  const handleDeploy = () => {
    if (!importUrl.trim()) return;
    setDeploying(true);
    setDeployPhase("Computing canonical identity…");
    setTimeout(() => setDeployPhase("Pinning to IPFS…"), 800);
    setTimeout(() => setDeployPhase("Issuing certificate…"), 1600);
    setTimeout(() => {
      setDeploying(false);
      setDeployPhase("");
      setImportUrl("");
    }, 2400);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* ── Hero Deploy Section ───────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        {/* Left: Hero illustration */}
        <div className="shrink-0">
          <img
            src={heroImage}
            alt="Deploy illustration"
            className="w-40 h-40 lg:w-48 lg:h-48 object-contain drop-shadow-2xl"
          />
        </div>

        {/* Right: Deploy prompt */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Deploy in one line
            </h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed max-w-md">
              Paste a URL — GitHub repo, ZIP, or live app. We compute the canonical identity,
              pin to IPFS, and issue a content-addressed certificate. Your app is sovereign.
            </p>
          </div>

          {/* Single-line deploy input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDeploy()}
                placeholder="https://github.com/you/your-app"
                disabled={deploying}
                className="w-full rounded-xl border border-border/60 bg-muted/20 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleDeploy}
              disabled={deploying || !importUrl.trim()}
              className="rounded-xl bg-primary/90 hover:bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all disabled:opacity-40 flex items-center gap-2 shrink-0"
            >
              {deploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Deploy
            </button>
          </div>

          {/* Deploy progress */}
          {deploying && (
            <div className="flex items-center gap-2 text-xs text-primary animate-in fade-in duration-300">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {deployPhase}
            </div>
          )}
        </div>
      </div>

      {/* ── Deployed Apps ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Your Apps
        </h2>

        <div className="space-y-3">
          {MOCK_APPS.map((app) => (
            <NavLink
              key={app.canonicalId}
              to={`/console/app-detail/${encodeURIComponent(app.canonicalId)}`}
              className="group flex items-center gap-4 rounded-2xl border border-border/40 bg-card/50 p-5 hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
            >
              {/* App icon */}
              <div className="h-12 w-12 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <Globe className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>

              {/* App info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-foreground">
                    {app.name}
                  </span>
                  <ZoneBadge zone={app.zone} />
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <CanonicalIdBadge id={app.canonicalId} chars={24} />
                  <code className="text-[11px] text-muted-foreground/60 font-mono">
                    {app.ipv6}
                  </code>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-6 text-xs text-muted-foreground shrink-0">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{app.userCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    ${app.revenue.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Action icons */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => e.preventDefault()}
                  className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  title="QR Cartridge"
                >
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(app.canonicalId);
                  }}
                  className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  title="Copy canonical ID"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── WASM Runtime Info ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/30 bg-muted/10 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Streamed Runtime
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          Applications are rendered via WASM directly in the browser — compatible with desktop,
          mobile, and any device. The UOR runtime streams application state using content-addressed
          memory lookup, so your device accesses any application remotely without local processing overhead.
          The processor is used only for memory lookup to resolve and render applications.
        </p>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground/70 font-mono">
          <span>Runtime: WASM v1.0</span>
          <span>•</span>
          <span>Memory: Content-Addressed</span>
          <span>•</span>
          <span>Streaming: Active</span>
        </div>
      </div>
    </div>
  );
}
