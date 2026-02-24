/**
 * AppConsoleRunner — In-browser WASM sandbox viewer.
 *
 * Renders the deployed app inside a sandboxed iframe with a status bar
 * showing runtime metrics, execution traces, and lifecycle controls.
 * This is the "docker run" visual equivalent.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { runApp } from "@/modules/uor-sdk/runtime/wasm-loader";
import type { WasmAppInstance } from "@/modules/uor-sdk/runtime/wasm-loader";
import { canonicalToTriword, formatTriword } from "@/lib/uor-triword";
import { CanonicalIdBadge } from "../components/ConsoleUI";
import {
  ArrowLeft, Copy, Check, Cpu, Globe, ShieldCheck,
  Play, Square, RefreshCw, Maximize2, Minimize2,
  Terminal, Activity, Clock, Loader2, AlertTriangle,
} from "lucide-react";

type RunnerTab = "preview" | "traces" | "console";

export default function AppConsoleRunner() {
  const { canonicalId } = useParams<{ canonicalId: string }>();
  const navigate = useNavigate();
  const decodedId = canonicalId ? decodeURIComponent(canonicalId) : "";
  const mountRef = useRef<HTMLDivElement>(null);

  const [instance, setInstance] = useState<WasmAppInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RunnerTab>("preview");
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Boot the WASM instance
  useEffect(() => {
    if (!decodedId) return;

    // Retrieve the source URL stored during deploy
    const storedSourceUrl = sessionStorage.getItem(`uor:sourceUrl:${decodedId}`) || "";

    let cancelled = false;
    const boot = async () => {
      setLoading(true);
      setError(null);
      setConsoleLogs([]);
      addConsoleLog("[runtime] Resolving image from registry...");

      try {
        if (storedSourceUrl) {
          addConsoleLog(`[runtime] Source URL: ${storedSourceUrl}`);
        }
        addConsoleLog(`[runtime] Pulling image: ${decodedId.slice(0, 48)}...`);

        const inst = await runApp({
          imageRef: decodedId,
          sourceUrl: storedSourceUrl || undefined,
          mountTarget: mountRef.current ?? undefined,
          tracing: true,
        });

        if (cancelled) {
          inst.stop();
          return;
        }

        setInstance(inst);
        addConsoleLog(`[runtime] Instance started: ${inst.instanceId.slice(0, 40)}`);
        addConsoleLog(`[runtime] IPv6 endpoint: ${inst.ipv6}`);
        addConsoleLog(`[runtime] Status: ${inst.status}`);
        addConsoleLog(`[runtime] Live URL: ${inst.liveUrl}`);
        addConsoleLog("[runtime] WASM sandbox initialized — app is running.");
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to start runtime";
          setError(msg);
          addConsoleLog(`[error] ${msg}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, [decodedId]);

  // Uptime counter
  useEffect(() => {
    if (!instance || instance.status !== "running") return;
    const interval = setInterval(() => setUptimeSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [instance]);

  const addConsoleLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setConsoleLogs((prev) => [...prev, `[${ts}] ${msg}`]);
  }, []);

  const handleStop = useCallback(() => {
    if (instance) {
      instance.stop();
      setInstance((prev) => prev ? { ...prev, status: "stopped" } : null);
      addConsoleLog("[runtime] Instance stopped.");
    }
  }, [instance, addConsoleLog]);

  const handleRestart = useCallback(async () => {
    handleStop();
    setUptimeSeconds(0);
    setLoading(true);
    addConsoleLog("[runtime] Restarting...");
    const storedSourceUrl = sessionStorage.getItem(`uor:sourceUrl:${decodedId}`) || "";

    try {
      const inst = await runApp({
        imageRef: decodedId,
        sourceUrl: storedSourceUrl || undefined,
        mountTarget: mountRef.current ?? undefined,
        tracing: true,
      });
      setInstance(inst);
      addConsoleLog("[runtime] Restarted successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Restart failed";
      setError(msg);
      addConsoleLog(`[error] ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [decodedId, handleStop, addConsoleLog]);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(decodedId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [decodedId]);

  const formatUptime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const TABS: { key: RunnerTab; label: string; icon: typeof Cpu }[] = [
    { key: "preview", label: "Preview", icon: Globe },
    { key: "traces", label: "Traces", icon: Activity },
    { key: "console", label: "Console", icon: Terminal },
  ];

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-8rem)]">
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/40 bg-card/50 rounded-t-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/console/apps")}
            className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Back to apps"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">
                {formatTriword(canonicalToTriword(decodedId))}
              </span>
              <span className="text-xs text-muted-foreground">
                {instance ? "Running" : loading ? "Starting…" : "Stopped"}
              </span>
              {instance?.status === "running" && (
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="text-[10px] text-muted-foreground font-mono truncate max-w-[280px]">
                {decodedId.slice(0, 48)}…
              </code>
              <button onClick={handleCopyId} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-3 mr-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatUptime(uptimeSeconds)}
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5" />
              64 MB
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          </div>

          {instance?.status === "running" ? (
            <button
              onClick={handleStop}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleRestart}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </button>
          )}

          <button
            onClick={handleRestart}
            disabled={loading}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
            aria-label="Restart"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={() => setFullscreen((f) => !f)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Toggle fullscreen"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-5 py-1.5 border-b border-border/30 bg-muted/10">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className={`flex-1 relative bg-background/60 rounded-b-2xl overflow-hidden ${
        fullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}>
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Starting WASM Runtime</p>
              <p className="text-xs text-muted-foreground mt-1">
                Pulling image and initializing sandbox…
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="text-center max-w-md">
              <p className="text-sm font-semibold text-foreground">Runtime Error</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <button
                onClick={handleRestart}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Preview tab — WASM iframe mount */}
        <div
          className={`absolute inset-0 ${activeTab === "preview" ? "block" : "hidden"}`}
        >
          {/* The wasm-loader injects the iframe into this div */}
          <div
            ref={mountRef}
            className="w-full h-full"
            style={{ minHeight: "500px" }}
            data-uor-sandbox="true"
          />
        </div>

        {/* Traces tab */}
        <div className={`absolute inset-0 overflow-y-auto p-5 ${activeTab === "traces" ? "block" : "hidden"}`}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Execution traces — every runtime event is recorded by the RuntimeWitness for auditing.
            </p>
            {instance ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-border/40 bg-card/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-foreground font-medium mb-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Runtime Witness Active
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Witness ID</span>
                      <p className="font-mono text-foreground mt-0.5">{instance.instanceId.slice(0, 32)}…</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Image</span>
                      <p className="font-mono text-foreground mt-0.5">{instance.imageCanonicalId.slice(0, 32)}…</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Uptime</span>
                      <p className="font-mono text-foreground mt-0.5">{formatUptime(uptimeSeconds)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status</span>
                      <p className="font-mono text-primary mt-0.5">{instance.status}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60">No active instance — start the app to see traces.</p>
            )}
          </div>
        </div>

        {/* Console tab */}
        <div className={`absolute inset-0 overflow-y-auto ${activeTab === "console" ? "block" : "hidden"}`}>
          <div className="font-mono text-xs p-4 space-y-0.5 bg-background/80 min-h-full">
            {consoleLogs.map((log, i) => (
              <div key={i} className={`leading-relaxed ${
                log.includes("[error]") ? "text-destructive" : "text-foreground/70"
              }`}>
                {log}
              </div>
            ))}
            {consoleLogs.length === 0 && (
              <span className="text-muted-foreground/40">Waiting for runtime output…</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
