/**
 * FPP Trust Flow Demo — /console/fpp
 * ═══════════════════════════════════
 *
 * Live interactive demonstration of the First Person Project trust pipeline:
 *   PHC Issuance → VRC Exchange → Trust Triangle Verification
 *
 * Each step runs real cryptographic operations (URDNA2015 → SHA-256 → hologram projections)
 * and visualizes the resulting hologram projections in real time.
 *
 * @module console/pages/ConsoleFpp
 */

import { useState, useCallback } from "react";
import {
  IconShield, IconUsers, IconArrowRight, IconCheck,
  IconX, IconPlayerPlay, IconRefresh, IconFingerprint,
  IconCertificate, IconLink,
  IconEye, IconBraces, IconArrowsExchange, IconTriangle,
} from "@tabler/icons-react";

import {
  issuePhc, issueVrc, exchangeVrcs, verifyPhc,
  verifyTrustTriangle, createPersona,
  type SealedPhc, type SealedVrc, type ResolvedPersona,
} from "@/modules/uns/core/fpp";
import { resolveVid, type TspVid } from "@/modules/uns/core/tsp";
import { project, type Hologram } from "@/modules/uns/core/hologram";

// ── Types ──────────────────────────────────────────────────────────────────

type FlowStage = "idle" | "personas" | "phc" | "vrc" | "triangle" | "complete";

interface StageResult {
  stage: FlowStage;
  timestamp: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

interface IdentityState {
  persona?: ResolvedPersona;
  vid?: TspVid;
  phc?: SealedPhc;
  hologram?: Hologram;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function truncateId(id: string, len = 24): string {
  if (id.length <= len) return id;
  return id.slice(0, len / 2) + "…" + id.slice(-len / 2);
}

// ── Sub-Components ─────────────────────────────────────────────────────────

function StageIndicator({ stage, currentStage, label, icon: Icon }: {
  stage: FlowStage; currentStage: FlowStage; label: string;
  icon: typeof IconShield;
}) {
  const stages: FlowStage[] = ["personas", "phc", "vrc", "triangle", "complete"];
  const currentIdx = stages.indexOf(currentStage);
  const thisIdx = stages.indexOf(stage);
  const isDone = currentIdx > thisIdx || currentStage === "complete";
  const isActive = currentStage === stage;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
        isDone ? "bg-primary text-primary-foreground"
        : isActive ? "bg-primary/20 text-primary ring-2 ring-primary/50 animate-pulse"
        : "bg-muted text-muted-foreground"
      }`}>
        {isDone ? <IconCheck size={14} /> : <Icon size={14} />}
      </div>
      <span className={`text-xs font-medium transition-colors ${
        isDone ? "text-foreground" : isActive ? "text-primary" : "text-muted-foreground"
      }`}>{label}</span>
    </div>
  );
}

function ProjectionGrid({ hologram, label }: { hologram: Hologram; label: string }) {
  const SHOW_PROJECTIONS = [
    "did", "cid", "fpp-phc", "fpp-vrc", "fpp-rdid", "fpp-trustgraph",
    "vc", "tsp-vid", "tsp-envelope", "bitcoin", "nostr", "activitypub",
    "webfinger", "polytree-node",
  ];

  const entries = SHOW_PROJECTIONS
    .filter(k => hologram.projections[k])
    .map(k => ({ name: k, ...hologram.projections[k] }));

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <IconEye size={12} className="text-primary" />
        {label} — Hologram Projections
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {entries.map(e => (
          <div key={e.name} className="group flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
              e.fidelity === "lossless" ? "bg-primary" : "bg-amber-500"
            }`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-foreground">{e.name}</span>
                <span className={`text-[8px] px-1 py-0 rounded-full font-medium ${
                  e.fidelity === "lossless"
                    ? "bg-primary/10 text-primary"
                    : "bg-amber-500/10 text-amber-600"
                }`}>{e.fidelity}</span>
              </div>
              <p className="text-[9px] font-mono text-muted-foreground truncate group-hover:text-foreground transition-colors">
                {truncateId(e.value, 48)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CredentialCard({ title, icon: Icon, data, color = "primary" }: {
  title: string; icon: typeof IconShield;
  data: Record<string, string | number | boolean | undefined>;
  color?: string;
}) {
  const filtered = Object.entries(data).filter(([, v]) => v !== undefined);
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg bg-${color}/10 flex items-center justify-center`}>
          <Icon size={14} className={`text-${color}`} />
        </div>
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <div className="space-y-1">
        {filtered.map(([k, v]) => (
          <div key={k} className="flex items-start gap-2 text-[10px]">
            <span className="font-mono text-muted-foreground shrink-0 w-28">{k}</span>
            <span className="font-mono text-foreground break-all">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustTriangleViz({ valid, aliceDid, bobDid }: {
  valid: boolean; aliceDid: string; bobDid: string;
}) {
  return (
    <div className="relative flex flex-col items-center py-6">
      {/* Triangle SVG */}
      <svg viewBox="0 0 200 180" className="w-48 h-44">
        {/* Triangle edges */}
        <line x1="100" y1="20" x2="20" y2="160" stroke="hsl(var(--primary))" strokeWidth="2" opacity={0.4} />
        <line x1="100" y1="20" x2="180" y2="160" stroke="hsl(var(--primary))" strokeWidth="2" opacity={0.4} />
        <line x1="20" y1="160" x2="180" y2="160" stroke={valid ? "hsl(var(--primary))" : "hsl(0, 70%, 55%)"} strokeWidth="3" />
        {/* VRC arrows */}
        <line x1="50" y1="100" x2="85" y2="45" stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="150" y1="100" x2="115" y2="45" stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <defs>
          <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--primary))" />
          </marker>
        </defs>
        {/* Ecosystem node (top) */}
        <circle cx="100" cy="20" r="12" fill="hsl(var(--primary))" opacity={0.2} stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="100" y="24" textAnchor="middle" fill="hsl(var(--primary))" fontSize="10" fontWeight="bold">E</text>
        {/* Alice node (bottom left) */}
        <circle cx="20" cy="160" r="12" fill="hsl(var(--primary))" opacity={0.15} stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="20" y="164" textAnchor="middle" fill="hsl(var(--primary))" fontSize="8" fontWeight="bold">A</text>
        {/* Bob node (bottom right) */}
        <circle cx="180" cy="160" r="12" fill="hsl(var(--primary))" opacity={0.15} stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="180" y="164" textAnchor="middle" fill="hsl(var(--primary))" fontSize="8" fontWeight="bold">B</text>
        {/* Labels */}
        <text x="30" y="90" fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">VRC A→B</text>
        <text x="130" y="90" fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">VRC B→A</text>
        <text x="100" y="5" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7">Ecosystem</text>
      </svg>
      {/* Verification badge */}
      <div className={`mt-2 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
        valid
          ? "bg-primary/10 text-primary"
          : "bg-destructive/10 text-destructive"
      }`}>
        {valid ? <IconCheck size={14} /> : <IconX size={14} />}
        {valid ? "Trust Triangle Verified ✓" : "Verification Failed"}
      </div>
      <div className="mt-1 text-[9px] font-mono text-muted-foreground text-center max-w-xs">
        A: {truncateId(aliceDid, 32)}<br />
        B: {truncateId(bobDid, 32)}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ConsoleFpp() {
  const [stage, setStage] = useState<FlowStage>("idle");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StageResult[]>([]);

  const [alice, setAlice] = useState<IdentityState>({});
  const [bob, setBob] = useState<IdentityState>({});
  const [vrcAtoB, setVrcAtoB] = useState<SealedVrc | null>(null);
  const [vrcBtoA, setVrcBtoA] = useState<SealedVrc | null>(null);
  const [triangleValid, setTriangleValid] = useState<boolean | null>(null);
  const [triangleReason, setTriangleReason] = useState<string>("");

  const ECOSYSTEM = "uor.foundation";
  const EXPIRES = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  // Results are pushed via pushLog inside runFlow

  const reset = useCallback(() => {
    setStage("idle");
    setRunning(false);
    setResults([]);
    setAlice({});
    setBob({});
    setVrcAtoB(null);
    setVrcBtoA(null);
    setTriangleValid(null);
    setTriangleReason("");
  }, []);

  const runFlow = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const log: StageResult[] = [];
    const pushLog = (r: StageResult) => { log.push(r); setResults([...log]); };

    // ── Step 1: Create Personas ──────────────────────────────────
    setStage("personas");
    let t = performance.now();
    let aPersona: ResolvedPersona, bPersona: ResolvedPersona;
    let aVid: TspVid, bVid: TspVid;
    try {
      aPersona = await createPersona("relationship", "Alice", [ECOSYSTEM]);
      bPersona = await createPersona("relationship", "Bob", [ECOSYSTEM]);
      aVid = resolveVid(aPersona.identity);
      bVid = resolveVid(bPersona.identity);

      setAlice({ persona: aPersona, vid: aVid });
      setBob({ persona: bPersona, vid: bVid });
      pushLog({ stage: "personas", timestamp: Date.now(), durationMs: performance.now() - t, success: true });
    } catch (e: any) {
      pushLog({ stage: "personas", timestamp: Date.now(), durationMs: performance.now() - t, success: false, error: e.message });
      setRunning(false); return;
    }

    // ── Step 2: Issue PHCs ───────────────────────────────────────
    setStage("phc");
    t = performance.now();
    let aPhc: SealedPhc, bPhc: SealedPhc;
    try {
      aPhc = await issuePhc(ECOSYSTEM, aPersona.did, aVid.vid);
      bPhc = await issuePhc(ECOSYSTEM, bPersona.did, bVid.vid);
      const aHologram = project(aPhc.identity);
      const bHologram = project(bPhc.identity);
      const aOk = await verifyPhc(aPhc);
      const bOk = await verifyPhc(bPhc);
      setAlice(prev => ({ ...prev, phc: aPhc, hologram: aHologram }));
      setBob(prev => ({ ...prev, phc: bPhc, hologram: bHologram }));
      if (!aOk || !bOk) throw new Error("PHC verification failed");
      pushLog({ stage: "phc", timestamp: Date.now(), durationMs: performance.now() - t, success: true });
    } catch (e: any) {
      pushLog({ stage: "phc", timestamp: Date.now(), durationMs: performance.now() - t, success: false, error: e.message });
      setRunning(false); return;
    }

    // ── Step 3: Exchange VRCs ────────────────────────────────────
    setStage("vrc");
    t = performance.now();
    let localVrcAtoB: SealedVrc, localVrcBtoA: SealedVrc;
    try {
      const result = await exchangeVrcs(aVid, bVid, aPhc.phcId, bPhc.phcId, ECOSYSTEM, EXPIRES);
      localVrcAtoB = result.vrcAtoB;
      localVrcBtoA = result.vrcBtoA;
      setVrcAtoB(localVrcAtoB);
      setVrcBtoA(localVrcBtoA);
      pushLog({ stage: "vrc", timestamp: Date.now(), durationMs: performance.now() - t, success: true });
    } catch (e: any) {
      pushLog({ stage: "vrc", timestamp: Date.now(), durationMs: performance.now() - t, success: false, error: e.message });
      setRunning(false); return;
    }

    // ── Step 4: Verify Trust Triangle ────────────────────────────
    setStage("triangle");
    t = performance.now();
    try {
      const triangleResult = await verifyTrustTriangle(localVrcAtoB, localVrcBtoA);
      setTriangleValid(triangleResult.valid);
      setTriangleReason(triangleResult.reason ?? "");
      pushLog({ stage: "triangle", timestamp: Date.now(), durationMs: performance.now() - t, success: triangleResult.valid });
      setStage("complete");
    } catch (e: any) {
      pushLog({ stage: "triangle", timestamp: Date.now(), durationMs: performance.now() - t, success: false, error: e.message });
    }

    setRunning(false);
  }, [ECOSYSTEM, EXPIRES]);

  const totalMs = results.reduce((s, r) => s + r.durationMs, 0);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <IconFingerprint size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">First Person Project — Trust Flow</h1>
            <p className="text-sm text-muted-foreground">
              Live PHC → VRC → Trust Triangle pipeline with hologram projections
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Progress Bar */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <StageIndicator stage="personas" currentStage={stage} label="Create Personas" icon={IconUsers} />
          <IconArrowRight size={14} className="text-muted-foreground/40 hidden sm:block" />
          <StageIndicator stage="phc" currentStage={stage} label="Issue PHCs" icon={IconCertificate} />
          <IconArrowRight size={14} className="text-muted-foreground/40 hidden sm:block" />
          <StageIndicator stage="vrc" currentStage={stage} label="Exchange VRCs" icon={IconArrowsExchange} />
          <IconArrowRight size={14} className="text-muted-foreground/40 hidden sm:block" />
          <StageIndicator stage="triangle" currentStage={stage} label="Verify Triangle" icon={IconTriangle} />
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={runFlow}
            disabled={running}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <IconPlayerPlay size={14} />
            {running ? "Running…" : stage === "complete" ? "Run Again" : "Run Trust Flow"}
          </button>
          {stage !== "idle" && (
            <button
              onClick={reset}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors flex items-center gap-2"
            >
              <IconRefresh size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Log */}
      {results.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Execution Log</h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                {results.length} steps · {totalMs.toFixed(0)}ms total
              </span>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {results.map((r, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  r.success ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                }`}>
                  {r.success ? <IconCheck size={10} /> : <IconX size={10} />}
                </span>
                <span className="font-semibold text-foreground w-24">{r.stage}</span>
                <span className="font-mono text-muted-foreground">{r.durationMs.toFixed(1)}ms</span>
                {r.error && <span className="text-destructive ml-2">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 1: Personas ─────────────────────────────────────────── */}
      {alice.persona && bob.persona && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <IconUsers size={16} className="text-primary" />
            Step 1 — Sovereign Identities Created
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CredentialCard
              title="Alice (R-DID)"
              icon={IconFingerprint}
              data={{
                "type": alice.persona.persona["fpp:type"],
                "R-DID": truncateId(alice.persona.did, 40),
                "VID": truncateId(alice.persona.projections.vid, 40),
                "canonical": truncateId(alice.persona.identity["u:canonicalId"], 40),
              }}
            />
            <CredentialCard
              title="Bob (R-DID)"
              icon={IconFingerprint}
              data={{
                "type": bob.persona.persona["fpp:type"],
                "R-DID": truncateId(bob.persona.did, 40),
                "VID": truncateId(bob.persona.projections.vid, 40),
                "canonical": truncateId(bob.persona.identity["u:canonicalId"], 40),
              }}
            />
          </div>
        </section>
      )}

      {/* ── STEP 2: PHCs ─────────────────────────────────────────────── */}
      {alice.phc && bob.phc && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <IconCertificate size={16} className="text-primary" />
            Step 2 — Personhood Credentials Issued
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CredentialCard
              title="Alice's PHC"
              icon={IconShield}
              data={{
                "ecosystem": alice.phc.credential["fpp:ecosystem"],
                "PHC ID": truncateId(alice.phc.phcId, 40),
                "DID": truncateId(alice.phc.projections.did, 40),
                "CID": truncateId(alice.phc.projections.cid, 40),
                "VC": truncateId(alice.phc.projections.vc, 40),
              }}
            />
            <CredentialCard
              title="Bob's PHC"
              icon={IconShield}
              data={{
                "ecosystem": bob.phc.credential["fpp:ecosystem"],
                "PHC ID": truncateId(bob.phc.phcId, 40),
                "DID": truncateId(bob.phc.projections.did, 40),
                "CID": truncateId(bob.phc.projections.cid, 40),
                "VC": truncateId(bob.phc.projections.vc, 40),
              }}
            />
          </div>

          {/* Hologram Projections */}
          {alice.hologram && (
            <div className="bg-card border border-border rounded-xl p-4">
              <ProjectionGrid hologram={alice.hologram} label="Alice's PHC" />
            </div>
          )}
          {bob.hologram && (
            <div className="bg-card border border-border rounded-xl p-4">
              <ProjectionGrid hologram={bob.hologram} label="Bob's PHC" />
            </div>
          )}
        </section>
      )}

      {/* ── STEP 3: VRC Exchange ─────────────────────────────────────── */}
      {vrcAtoB && vrcBtoA && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <IconArrowsExchange size={16} className="text-primary" />
            Step 3 — Verifiable Relationship Credentials Exchanged
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CredentialCard
              title="VRC: Alice → Bob"
              icon={IconLink}
              data={{
                "issuer R-DID": truncateId(vrcAtoB.credential["fpp:issuerRdid"], 36),
                "subject R-DID": truncateId(vrcAtoB.credential["fpp:subjectRdid"], 36),
                "ecosystem": vrcAtoB.credential["fpp:ecosystem"],
                "VRC ID": truncateId(vrcAtoB.vrcId, 40),
                "trust-graph": truncateId(vrcAtoB.projections.trustgraph, 40),
              }}
            />
            <CredentialCard
              title="VRC: Bob → Alice"
              icon={IconLink}
              data={{
                "issuer R-DID": truncateId(vrcBtoA.credential["fpp:issuerRdid"], 36),
                "subject R-DID": truncateId(vrcBtoA.credential["fpp:subjectRdid"], 36),
                "ecosystem": vrcBtoA.credential["fpp:ecosystem"],
                "VRC ID": truncateId(vrcBtoA.vrcId, 40),
                "trust-graph": truncateId(vrcBtoA.projections.trustgraph, 40),
              }}
            />
          </div>
        </section>
      )}

      {/* ── STEP 4: Trust Triangle ───────────────────────────────────── */}
      {triangleValid !== null && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <IconTriangle size={16} className="text-primary" />
            Step 4 — Trust Triangle Verification
          </h3>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      triangleValid ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    }`}>
                      {triangleValid ? <IconCheck size={10} /> : <IconX size={10} />}
                    </span>
                    <span>Same ecosystem</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      triangleValid ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    }`}>
                      {triangleValid ? <IconCheck size={10} /> : <IconX size={10} />}
                    </span>
                    <span>Cross-referenced PHCs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      triangleValid ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    }`}>
                      {triangleValid ? <IconCheck size={10} /> : <IconX size={10} />}
                    </span>
                    <span>Canonical hash verification</span>
                  </div>
                </div>
                {triangleReason && (
                  <p className="text-[10px] text-destructive font-mono">{triangleReason}</p>
                )}
                <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t border-border">
                  <p><strong>Pipeline:</strong> PHC → URDNA2015 → SHA-256 → Hologram</p>
                  <p><strong>Trust model:</strong> Geodesic dome of trust triangles</p>
                  <p><strong>Sybil resistance:</strong> PHC uniqueness per ecosystem</p>
                </div>
              </div>
              <TrustTriangleViz
                valid={triangleValid}
                aliceDid={alice.persona?.did ?? ""}
                bobDid={bob.persona?.did ?? ""}
              />
            </div>
          </div>
        </section>
      )}

      {/* Architecture card */}
      <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <IconBraces size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">Architecture: What This Demonstrates</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-[11px] text-muted-foreground">
          <div>
            <p className="font-bold text-foreground mb-1">Layer 0: UOR</p>
            <p>URDNA2015 → SHA-256 → canonical identity. Every object content-addressed.</p>
          </div>
          <div>
            <p className="font-bold text-foreground mb-1">Layer 1: VIDs</p>
            <p>R-DIDs, M-DIDs, P-DIDs projected through hologram. Self-sovereign identity.</p>
          </div>
          <div>
            <p className="font-bold text-foreground mb-1">Layer 2: TSP</p>
            <p>VRC exchange wrapped in authenticated TSP envelopes. Metadata privacy.</p>
          </div>
          <div>
            <p className="font-bold text-foreground mb-1">Layer 3: Trust Tasks</p>
            <p>PHCs prove personhood. VRCs prove relationships. Trust triangles prevent Sybil attacks.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
