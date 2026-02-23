/**
 * App Console — Deploy & Apps Page
 *
 * Developer-first entry point: paste a URL, deploy in one step.
 * Shows deployed apps with key metrics below.
 */

import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CanonicalIdBadge,
  ZoneBadge,
} from "../components/ConsoleUI";
import {
  ArrowRight, Loader2, Globe,
  QrCode, Copy, Check, Rocket, ShieldCheck,
  GitBranch, Upload, Package, Plus,
} from "lucide-react";
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

const DEPLOY_STEPS = [
  { icon: Upload, label: "Build", desc: "Import your code and create a content-addressed image — like docker build" },
  { icon: ShieldCheck, label: "Ship", desc: "Push to the UOR registry with a signed certificate — like docker push" },
  { icon: Rocket, label: "Run", desc: "Execute via WASM on any device — like docker run" },
];

const SOURCES = [
  { icon: GitBranch, label: "GitHub Repo" },
  { icon: Globe, label: "Live URL" },
  { icon: Package, label: "ZIP Upload" },
];

export default function AppConsoleApps() {
  const [importUrl, setImportUrl] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDeploy = () => {
    if (!importUrl.trim()) return;
    setDeploying(true);
    setDeployStep(0);
    setTimeout(() => setDeployStep(1), 900);
    setTimeout(() => setDeployStep(2), 1800);
    setTimeout(() => {
      setDeploying(false);
      setDeployStep(0);
      setImportUrl("");
    }, 2700);
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* ── Hero Deploy Section ───────────────────────────────────── */}
      <div className="rounded-2xl border border-border/40 bg-card/50 p-8">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: Hero illustration */}
          <div className="shrink-0">
            <img
              src={heroImage}
              alt="Deploy illustration"
              className="w-36 h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl"
            />
          </div>

          {/* Right: Deploy prompt */}
          <div className="flex-1 space-y-5 w-full">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Build, Ship, Run
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-lg">
                Paste a GitHub repo, live URL, or upload a ZIP — just like a Dockerfile.
                We <strong className="text-foreground">build</strong> a content-addressed image,
                <strong className="text-foreground"> push</strong> it to the UOR registry with a signed certificate, and
                <strong className="text-foreground"> run</strong> it via WASM — deploy once, run anywhere.
              </p>
            </div>

            {/* Source type pills */}
            <div className="flex items-center gap-2">
              {SOURCES.map((s) => {
                const isZip = s.label === "ZIP Upload";
                const pill = (
                  <span
                    key={s.label}
                    onClick={isZip ? () => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".zip,.tar.gz,.tgz";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) setImportUrl(`zip://${file.name}`);
                      };
                      input.click();
                    } : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      isZip
                        ? "bg-primary/10 text-primary border border-primary/30 cursor-pointer hover:bg-primary/20 hover:border-primary/50"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                    {isZip && <Upload className="h-3 w-3 ml-0.5" />}
                  </span>
                );
                return pill;
              })}
            </div>

            {/* Deploy input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDeploy()}
                  placeholder="https://github.com/you/your-app"
                  disabled={deploying}
                  className="w-full rounded-xl border border-border/60 bg-muted/20 py-3.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleDeploy}
                disabled={deploying || !importUrl.trim()}
                className="rounded-xl bg-primary hover:bg-primary/90 px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all disabled:opacity-40 flex items-center gap-2 shrink-0 shadow-md shadow-primary/20"
              >
                {deploying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                Deploy
              </button>
            </div>

            {/* Deploy progress steps */}
            {deploying && (
              <div className="flex items-center gap-1">
                {DEPLOY_STEPS.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-1">
                    <div
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                        i <= deployStep
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/30 text-muted-foreground/40"
                      }`}
                    >
                      <step.icon className="h-3.5 w-3.5" />
                      {step.label}
                    </div>
                    {i < DEPLOY_STEPS.length - 1 && (
                      <ArrowRight className={`h-3 w-3 transition-colors ${
                        i < deployStep ? "text-primary/60" : "text-muted-foreground/20"
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── How It Works (for empty state / first-time users) ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DEPLOY_STEPS.map((step, i) => (
          <div key={step.label} className="rounded-2xl border border-border/30 bg-card/30 p-6 space-y-2 text-center">
            <div className="mx-auto h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <step.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {step.label}
            </p>
            <p className="text-xs text-muted-foreground leading-snug">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Deployed Apps ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            Your Apps
          </h2>
          <span className="text-xs text-muted-foreground">{MOCK_APPS.length} deployed</span>
        </div>

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
              <div className="hidden sm:flex items-center gap-6 text-xs shrink-0">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Users</span>
                  <span className="font-medium text-foreground">{app.userCount}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Revenue</span>
                  <span className="font-medium text-green-500">
                    ${app.revenue.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => e.preventDefault()}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  title="QR Cartridge"
                >
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground/60">QR</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleCopy(app.canonicalId);
                  }}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  title="Copy canonical ID"
                >
                  {copiedId === app.canonicalId ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-[9px] text-muted-foreground/60">Copy</span>
                </button>
              </div>
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Runtime Info ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/30 bg-muted/10 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Streamed Runtime
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          Applications are rendered via WASM directly in the browser — compatible with desktop,
          mobile, and any device. Your app is content-addressed and streamed on demand, so every
          device resolves the same verified application without local installation.
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
