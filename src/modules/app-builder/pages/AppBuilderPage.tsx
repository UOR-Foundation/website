/**
 * App Builder — Docker-Style Build, Run, Ship Pipeline
 * ═════════════════════════════════════════════════════════
 *
 * Build  → Uorfile → content-addressed image (docker build)
 * Run    → container lifecycle management     (docker run)
 * Ship   → registry push + deployment snapshot (docker push)
 *
 * @version 1.0.0
 */

import { useState, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/modules/core/ui/tabs";
import { ScrollArea } from "@/modules/core/ui/scroll-area";
import {
  Hammer, Play, Rocket, FileText, Download, Square, RotateCcw,
  ChevronDown, ChevronUp, Layers, Box, Tag, CheckCircle2,
  Loader2, Eye, Trash2,
} from "lucide-react";
import { buildAppImage } from "@/modules/uor-sdk/runtime/image-builder";
import type { ImageBuildResult } from "@/modules/uor-sdk/runtime/image-builder";
import type { AppFile } from "@/modules/uor-sdk/import-adapter";
// Lazy-loaded to avoid PWA Rollup resolution failure
let _containerMod: typeof import("@/modules/app-builder/runtime/container") | null = null;
async function getContainerMod() {
  if (!_containerMod) {
    _containerMod = await import("@/modules/app-builder/runtime/container");
  }
  return _containerMod;
}
type UorContainer = import("@/modules/app-builder/runtime/container").UorContainer;
type ContainerInspection = import("@/modules/app-builder/runtime/container").ContainerInspection;
import { shipApp } from "@/modules/uor-sdk/runtime/registry-ship";
import type { ShipResult } from "@/modules/uor-sdk/runtime/registry-ship";
import type { AppManifest } from "@/modules/uor-sdk/app-identity";

// ── Audit Log ──────────────────────────────────────────────────────────────

type AuditPhase = "BUILD" | "RUN" | "SHIP" | "SYSTEM";

interface AuditEntry {
  ts: string;
  phase: AuditPhase;
  message: string;
  canonicalId?: string;
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

// ── Default Uorfile Template ───────────────────────────────────────────────

const DEFAULT_UORFILE = `# Uorfile — Docker-compatible build spec
# Edit this file just like a Dockerfile

FROM scratch

LABEL app.name="my-app"
LABEL app.version="1.0.0"
LABEL app.tech="react,typescript"

WORKDIR /app

ENV NODE_ENV="production"

COPY src/index.tsx /app/src/index.tsx
COPY src/App.tsx /app/src/App.tsx

EXPOSE 3000
ENTRYPOINT ["serve", "/app/src/index.tsx"]
`;

// ── Styled button ──────────────────────────────────────────────────────────

function Btn({
  children, onClick, disabled, variant = "default", className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
  className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-border bg-transparent hover:bg-muted",
    ghost: "bg-transparent hover:bg-muted",
    destructive: "text-destructive hover:bg-destructive/10",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AppBuilderPage() {
  const [tab, setTab] = useState("build");
  const [uorfile, setUorfile] = useState(DEFAULT_UORFILE);
  const [buildResult, setBuildResult] = useState<ImageBuildResult | null>(null);
  const [building, setBuilding] = useState(false);
  const [containers, setContainers] = useState<UorContainer[]>([]);
  const [inspection, setInspection] = useState<ContainerInspection | null>(null);
  const [shipResult, setShipResult] = useState<ShipResult | null>(null);
  const [shipping, setShipping] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [appName, setAppName] = useState("my-app");
  const [appVersion, setAppVersion] = useState("1.0.0");
  const logEndRef = useRef<HTMLDivElement>(null);

  const log = useCallback((phase: AuditPhase, message: string, canonicalId?: string) => {
    setAuditLog((prev) => [...prev, { ts: timestamp(), phase, message, canonicalId }]);
  }, []);

  // ── BUILD ──────────────────────────────────────────────────────────────

  const handleBuild = useCallback(async () => {
    setBuilding(true);
    log("BUILD", "Parsing Uorfile…");

    try {
      const copyLines = uorfile.split("\n").filter((l) => l.trim().startsWith("COPY"));
      const files: AppFile[] = copyLines.map((line) => {
        const parts = line.trim().split(/\s+/);
        const srcPath = parts[1] || "src/index.tsx";
        const content = `// ${srcPath}\nexport default {};`;
        return { path: srcPath, bytes: new TextEncoder().encode(content), mimeType: "text/typescript" };
      });

      log("BUILD", `${files.length} source files detected`);

      const techMatch = uorfile.match(/LABEL\s+app\.tech="([^"]+)"/);
      const tech = techMatch ? techMatch[1].split(",") : ["typescript"];
      const epMatch = uorfile.match(/ENTRYPOINT\s+\["[^"]*",\s*"([^"]+)"\]/);
      const entrypoint = epMatch ? epMatch[1].replace("/app/", "") : files[0]?.path || "src/index.tsx";

      const result = await buildAppImage(files, {
        name: appName, version: appVersion, tech, entrypoint,
        builderCanonicalId: "uor:builder:app-builder-v1",
        env: { NODE_ENV: "production" },
      });

      setBuildResult(result);
      log("BUILD", `Image built successfully`, result.image.canonicalId);
      log("BUILD", `${result.image.layers.length} layers · ${result.image.sizeBytes} bytes`);
      result.fileLayers.forEach((fl) => {
        log("BUILD", `Layer: ${fl.path}`, fl.layerCanonicalId);
      });

      // ── Emit to Knowledge Graph ──
      try {
        const { localGraphStore } = await import("@/modules/knowledge-graph");
        const now = Date.now();
        await localGraphStore.putNode({
          uorAddress: result.image.canonicalId,
          label: `${appName}:${appVersion}`,
          nodeType: "image",
          properties: { layers: result.image.layers.length, sizeBytes: result.image.sizeBytes },
          createdAt: now, updatedAt: now, syncState: "local" as const,
        });
        for (const fl of result.fileLayers) {
          await localGraphStore.putEdge(
            result.image.canonicalId, "uor:containsLayer", fl.layerCanonicalId,
            "uor:graph:app-builder",
          );
        }
        log("BUILD", "Emitted image node to knowledge graph");
      } catch { /* graph emission is best-effort */ }
    } catch (err: any) {
      log("BUILD", `Build failed: ${err.message}`);
    } finally {
      setBuilding(false);
    }
  }, [uorfile, appName, appVersion, log]);

  // ── RUN ────────────────────────────────────────────────────────────────

  const refreshContainers = useCallback(async () => {
    const mod = await getContainerMod();
    setContainers(mod.listContainers());
  }, []);

  const handleCreateAndStart = useCallback(async () => {
    if (!buildResult) { log("RUN", "No image built"); return; }
    try {
      const mod = await getContainerMod();
      const container = await mod.createContainer({
        name: `${appName}-${Date.now().toString(36)}`,
        imageId: buildResult.image.canonicalId,
        env: { NODE_ENV: "production" },
        ports: [{ hostPort: 3000, containerPort: 3000, protocol: "tcp" }],
      });
      log("RUN", `Container created: ${container.name}`, container.id);
      mod.startContainer(container.id);
      log("RUN", `Container started: ${container.name}`);
      refreshContainers();
    } catch (err: any) {
      log("RUN", `Run failed: ${err.message}`);
    }
  }, [buildResult, appName, log, refreshContainers]);

  const handleStop = useCallback(async (id: string, name: string) => {
    const mod = await getContainerMod();
    mod.stopContainer(id); log("RUN", `Stopped: ${name}`); refreshContainers();
  }, [log, refreshContainers]);

  const handleRemove = useCallback(async (id: string, name: string) => {
    const mod = await getContainerMod();
    mod.removeContainer(id); log("RUN", `Removed: ${name}`); setInspection(null); refreshContainers();
  }, [log, refreshContainers]);

  const handleInspect = useCallback(async (id: string) => {
    const mod = await getContainerMod();
    const info = mod.inspectContainer(id); setInspection(info); log("RUN", `Inspected: ${info.container.name}`);
  }, [log]);

  // ── SHIP ───────────────────────────────────────────────────────────────

  const handleShip = useCallback(async () => {
    if (!buildResult) { log("SHIP", "No image built"); return; }
    setShipping(true);
    log("SHIP", "Pushing to registry…");
    try {
      const manifest: AppManifest = {
        "@context": {} as any,
        "@type": "app:Manifest",
        "app:name": appName,
        "app:version": appVersion,
        "app:sourceUrl": "",
        "app:entrypoint": "",
        "app:tech": [],
        "app:deployedAt": new Date().toISOString(),
        "app:developerCanonicalId": "uor:builder:app-builder-v1",
        "partition:irreducibleDensity": 1,
        "u:canonicalId": buildResult.image.canonicalId,
      };

      const result = await shipApp({
        image: buildResult.image, manifest,
        developerCanonicalId: "uor:dev:local", appName, version: appVersion,
      });

      setShipResult(result);
      const snapId = result.snapshot["u:canonicalId"];
      log("SHIP", `Pushed to registry`, result.registryUrl);
      log("SHIP", `Tags: ${result.tags.join(", ")}`);
      log("SHIP", `Snapshot: ${snapId}`, snapId);
    } catch (err: any) {
      log("SHIP", `Ship failed: ${err.message}`);
    } finally {
      setShipping(false);
    }
  }, [buildResult, appName, appVersion, log]);

  // ── AUDIT LOG EXPORT ───────────────────────────────────────────────────

  const exportLogJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `app-builder-audit-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    log("SYSTEM", "Audit log exported as JSON");
  }, [auditLog, log]);

  const exportLogCSV = useCallback(() => {
    const header = "timestamp,phase,message,canonicalId";
    const rows = auditLog.map((e) => `${e.ts},${e.phase},"${e.message.replace(/"/g, '""')}",${e.canonicalId || ""}`);
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `app-builder-audit-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
    log("SYSTEM", "Audit log exported as CSV");
  }, [auditLog, log]);

  // ── Phase badge colors ─────────────────────────────────────────────────

  const phaseBg: Record<AuditPhase, string> = {
    BUILD: "bg-primary/20 text-primary",
    RUN: "bg-accent/30 text-accent-foreground",
    SHIP: "bg-secondary/30 text-secondary-foreground",
    SYSTEM: "bg-muted text-muted-foreground",
  };

  const stateColor: Record<string, string> = {
    created: "text-muted-foreground",
    running: "text-primary",
    paused: "text-accent-foreground",
    stopped: "text-muted-foreground",
    crashed: "text-destructive",
    removed: "text-muted-foreground",
  };

  // ── RENDER ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-background text-foreground font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Hammer className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm tracking-tight">App Builder</span>
          <span className="text-xs text-muted-foreground ml-2">Build → Run → Ship</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="bg-muted border border-border rounded px-2 py-1 text-xs w-28"
            placeholder="app name"
          />
          <input
            value={appVersion}
            onChange={(e) => setAppVersion(e.target.value)}
            className="bg-muted border border-border rounded px-2 py-1 text-xs w-16"
            placeholder="version"
          />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 bg-muted/50 w-fit">
          <TabsTrigger value="build" className="gap-1.5 text-xs">
            <Hammer className="w-3.5 h-3.5" /> Build
          </TabsTrigger>
          <TabsTrigger value="run" className="gap-1.5 text-xs">
            <Play className="w-3.5 h-3.5" /> Run
          </TabsTrigger>
          <TabsTrigger value="ship" className="gap-1.5 text-xs">
            <Rocket className="w-3.5 h-3.5" /> Ship
          </TabsTrigger>
        </TabsList>

        {/* ── BUILD TAB ─────────────────────────────────────────────── */}
        <TabsContent value="build" className="flex-1 flex min-h-0 px-4 pb-2 gap-4">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Uorfile
            </div>
            <textarea
              value={uorfile}
              onChange={(e) => setUorfile(e.target.value)}
              className="flex-1 bg-muted/30 border border-border rounded p-3 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              spellCheck={false}
            />
            <Btn onClick={handleBuild} disabled={building} className="mt-2 self-start">
              {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
              {building ? "Building…" : "Build Image"}
            </Btn>
          </div>

          <div className="w-72 flex flex-col min-h-0">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Image Layers
            </div>
            {buildResult ? (
              <ScrollArea className="flex-1 border border-border rounded p-3 bg-muted/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-primary">Built successfully</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="text-muted-foreground">Canonical ID:</div>
                    <div className="text-[10px] break-all font-mono text-primary">
                      {buildResult.image.canonicalId}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {buildResult.image.layers.length} layers · {buildResult.image.sizeBytes} bytes
                  </div>
                  <div className="border-t border-border pt-2 space-y-1">
                    {buildResult.fileLayers.map((fl) => (
                      <div key={fl.path} className="flex items-center gap-1.5 text-[11px]">
                        <Box className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate flex-1">{fl.path}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {fl.layerCanonicalId.slice(0, 12)}…
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 border border-border rounded p-3 bg-muted/20 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No image built yet</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── RUN TAB ───────────────────────────────────────────────── */}
        <TabsContent value="run" className="flex-1 flex flex-col min-h-0 px-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <Btn onClick={handleCreateAndStart} disabled={!buildResult}>
              <Play className="w-3.5 h-3.5" /> Create & Start
            </Btn>
            <Btn variant="outline" onClick={refreshContainers}>
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </Btn>
            {!buildResult && (
              <span className="text-xs text-muted-foreground ml-2">Build an image first</span>
            )}
          </div>

          <div className="flex gap-4 flex-1 min-h-0">
            <ScrollArea className="flex-1 border border-border rounded bg-muted/20">
              <div className="p-3 space-y-2">
                {containers.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    No containers. Click "Create & Start" to run an image.
                  </div>
                ) : (
                  containers.map((c) => (
                    <div key={c.id} className="border border-border rounded p-2.5 bg-background/50 flex items-center gap-3">
                      <Box className={`w-4 h-4 ${stateColor[c.state] || "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {c.state} · {c.imageId.slice(0, 16)}…
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {c.state === "running" && (
                          <Btn variant="ghost" className="h-6 w-6 p-0" onClick={() => handleStop(c.id, c.name)}>
                            <Square className="w-3 h-3" />
                          </Btn>
                        )}
                        <Btn variant="ghost" className="h-6 w-6 p-0" onClick={() => handleInspect(c.id)}>
                          <Eye className="w-3 h-3" />
                        </Btn>
                        {c.state !== "running" && (
                          <Btn variant="destructive" className="h-6 w-6 p-0" onClick={() => handleRemove(c.id, c.name)}>
                            <Trash2 className="w-3 h-3" />
                          </Btn>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {inspection && (
              <div className="w-72 border border-border rounded bg-muted/20 p-3 overflow-auto">
                <div className="text-xs font-medium mb-2">Container Inspector</div>
                <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(inspection, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── SHIP TAB ──────────────────────────────────────────────── */}
        <TabsContent value="ship" className="flex-1 flex flex-col min-h-0 px-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <Btn onClick={handleShip} disabled={!buildResult || shipping}>
              {shipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
              {shipping ? "Pushing…" : "Push to Registry"}
            </Btn>
            {!buildResult && (
              <span className="text-xs text-muted-foreground ml-2">Build an image first</span>
            )}
          </div>

          {shipResult ? (
            <div className="border border-border rounded p-4 bg-muted/20 space-y-3 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">Shipped successfully</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground mb-0.5">Registry URL</div>
                  <div className="font-mono text-[11px] break-all">{shipResult.registryUrl}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Tags</div>
                  <div className="flex gap-1 flex-wrap">
                    {shipResult.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px]">
                        <Tag className="w-2.5 h-2.5" /> {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground mb-1">Deployment Snapshot</div>
                <div className="text-[10px] font-mono break-all text-primary">
                  {shipResult.snapshot["u:canonicalId"]}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {shipResult.snapshot.components.length} components ·
                  v{shipResult.snapshot.version} ·
                  {shipResult.snapshot.label}
                </div>
              </div>

              <Btn
                variant="outline"
                className="mt-2"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(shipResult.snapshot, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url;
                  a.download = `snapshot-${shipResult.snapshot["u:canonicalId"].slice(0, 12)}.json`;
                  a.click(); URL.revokeObjectURL(url);
                  log("SHIP", "Snapshot exported");
                }}
              >
                <Download className="w-3.5 h-3.5" /> Export Snapshot
              </Btn>
            </div>
          ) : (
            <div className="flex-1 border border-border rounded bg-muted/20 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Build an image, then push to the registry</span>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── AUDIT LOG ───────────────────────────────────────────────── */}
      <div className="border-t border-border">
        <button
          onClick={() => setLogOpen(!logOpen)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Audit Log ({auditLog.length} entries)
          </span>
          <div className="flex items-center gap-2">
            {auditLog.length > 0 && (
              <>
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); exportLogJSON(); }}
                  className="hover:text-primary text-[10px] underline cursor-pointer"
                >
                  JSON
                </span>
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); exportLogCSV(); }}
                  className="hover:text-primary text-[10px] underline cursor-pointer"
                >
                  CSV
                </span>
              </>
            )}
            {logOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </div>
        </button>

        {logOpen && (
          <ScrollArea className="h-40 px-4 pb-2">
            <div className="space-y-0.5">
              {auditLog.length === 0 ? (
                <div className="text-[11px] text-muted-foreground py-4 text-center">
                  Operations will appear here as you build, run, and ship.
                </div>
              ) : (
                auditLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] font-mono leading-relaxed">
                    <span className="text-muted-foreground shrink-0">{entry.ts}</span>
                    <span className={`px-1.5 py-0 rounded text-[10px] font-medium shrink-0 ${phaseBg[entry.phase]}`}>
                      {entry.phase}
                    </span>
                    <span className="text-foreground/80">{entry.message}</span>
                    {entry.canonicalId && (
                      <span className="text-[9px] text-primary/60 truncate max-w-32">
                        {entry.canonicalId.slice(0, 20)}…
                      </span>
                    )}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
