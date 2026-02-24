/**
 * FPP Trust Flow Demo — /console/fpp
 * ═══════════════════════════════════
 *
 * Live interactive demonstration of the First Person Project trust pipeline:
 *   PHC Issuance → VRC Exchange → Trust Triangle → Agent Delegation
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
  IconRobot, IconTool, IconNetwork,
} from "@tabler/icons-react";

import {
  issuePhc, issueVrc, exchangeVrcs, verifyPhc,
  verifyTrustTriangle, createPersona,
  issueAgentDelegation, verifyAgentDelegation,
  type SealedPhc, type SealedVrc, type ResolvedPersona,
  type SealedAgentDelegation, type AgentDelegationCheck,
} from "@/modules/uns/core/fpp";
import { resolveVid, type TspVid } from "@/modules/uns/core/tsp";
import { project, type Hologram } from "@/modules/uns/core/hologram";

// ── Types ──────────────────────────────────────────────────────────────────

type FlowStage = "idle" | "personas" | "phc" | "vrc" | "triangle" | "delegation" | "complete";

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
  const stages: FlowStage[] = ["personas", "phc", "vrc", "triangle", "delegation", "complete"];
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
    "vc", "tsp-vid", "tsp-envelope", "a2a", "mcp-tool", "mcp-context",
    "bitcoin", "nostr", "activitypub", "webfinger", "polytree-node",
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

function CredentialCard({ title, icon: Icon, data }: {
  title: string; icon: typeof IconShield;
  data: Record<string, string | number | boolean | undefined>;
}) {
  const filtered = Object.entries(data).filter(([, v]) => v !== undefined);
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={14} className="text-primary" />
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
      <svg viewBox="0 0 200 180" className="w-48 h-44">
        <line x1="100" y1="20" x2="20" y2="160" stroke="hsl(var(--primary))" strokeWidth="2" opacity={0.4} />
        <line x1="100" y1="20" x2="180" y2="160" stroke="hsl(var(--primary))" strokeWidth="2" opacity={0.4} />
        <line x1="20" y1="160" x2="180" y2="160" stroke={valid ? "hsl(var(--primary))" : "hsl(0, 70%, 55%)"} strokeWidth="3" />
        <line x1="50" y1="100" x2="85" y2="45" stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="150" y1="100" x2="115" y2="45" stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <defs>
          <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--primary))" />
          </marker>
        </defs>
        <circle cx="100" cy="20" r="12" fill="hsl(var(--primary))" opacity={0.2} stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="100" y="24" textAnchor="middle" fill="hsl(var(--primary))" fontSize="10" fontWeight="bold">E</text>
        <circle cx="20" cy="160" r="12" fill="hsl(var(--primary))" opacity={0.15} stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="20" y="164" textAnchor="middle" fill="hsl(var(--primary))" fontSize="8" fontWeight="bold">A</text>
        <circle cx="180" cy="160" r="12" fill="hsl(var(--primary))" opacity={0.15} stroke="hsl(var(--primary))" strokeWidth="2" />
        <text x="180" y="164" textAnchor="middle" fill="hsl(var(--primary))" fontSize="8" fontWeight="bold">B</text>
        <text x="30" y="90" fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">VRC A→B</text>
        <text x="130" y="90" fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">VRC B→A</text>
        <text x="100" y="5" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7">Ecosystem</text>
      </svg>
      <div className={`mt-2 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
        valid ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
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

/** Agent delegation chain visualization: Human PHC → VRC → Agent → a2a + mcp-tool */
function DelegationChainViz({ delegation, checks }: {
  delegation: SealedAgentDelegation;
  checks: AgentDelegationCheck[];
}) {
  const allPassed = checks.every(c => c.passed);
  return (
    <div className="space-y-4">
      {/* Chain visualization */}
      <div className="relative flex flex-col items-center py-4">
        <svg viewBox="0 0 300 200" className="w-full max-w-xs h-48">
          {/* Human → VRC edge */}
          <line x1="50" y1="30" x2="150" y2="30" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#darrow)" />
          <text x="100" y="22" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">PHC+VRC</text>
          {/* VRC → Agent edge */}
          <line x1="150" y1="30" x2="250" y2="30" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#darrow)" />
          <text x="200" y="22" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">delegation</text>
          {/* Agent → a2a edge */}
          <line x1="250" y1="45" x2="200" y2="110" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#darrow)" />
          <text x="215" y="82" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">a2a</text>
          {/* Agent → mcp-tool edge */}
          <line x1="250" y1="45" x2="280" y2="110" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#darrow)" />
          <text x="275" y="82" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">mcp</text>
          {/* Agent → vc edge */}
          <line x1="250" y1="45" x2="250" y2="110" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#darrow)" />
          <text x="257" y="82" textAnchor="start" fill="hsl(var(--muted-foreground))" fontSize="7" fontFamily="monospace">vc</text>
          <defs>
            <marker id="darrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--primary))" />
            </marker>
          </defs>
          {/* Human node */}
          <circle cx="50" cy="30" r="16" fill="hsl(var(--primary))" opacity={0.15} stroke="hsl(var(--primary))" strokeWidth="2" />
          <text x="50" y="34" textAnchor="middle" fill="hsl(var(--primary))" fontSize="9" fontWeight="bold">👤</text>
          <text x="50" y="58" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7">Human</text>
          {/* VRC node */}
          <circle cx="150" cy="30" r="12" fill="hsl(var(--primary))" opacity={0.1} stroke="hsl(var(--primary))" strokeWidth="1.5" />
          <text x="150" y="34" textAnchor="middle" fill="hsl(var(--primary))" fontSize="8" fontWeight="bold">V</text>
          <text x="150" y="53" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7">VRC</text>
          {/* Agent node */}
          <circle cx="250" cy="30" r="16" fill="hsl(var(--primary))" opacity={0.2} stroke="hsl(var(--primary))" strokeWidth="2" />
          <text x="250" y="34" textAnchor="middle" fill="hsl(var(--primary))" fontSize="9" fontWeight="bold">🤖</text>
          <text x="250" y="58" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="7">Agent</text>
          {/* Projection nodes */}
          <circle cx="200" cy="120" r="10" fill="hsl(var(--primary))" opacity={0.1} stroke="hsl(var(--primary))" strokeWidth="1" />
          <text x="200" y="124" textAnchor="middle" fill="hsl(var(--primary))" fontSize="6" fontWeight="bold">A2A</text>
          <text x="200" y="140" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6">discovery</text>
          <circle cx="250" cy="120" r="10" fill="hsl(var(--primary))" opacity={0.1} stroke="hsl(var(--primary))" strokeWidth="1" />
          <text x="250" y="124" textAnchor="middle" fill="hsl(var(--primary))" fontSize="6" fontWeight="bold">VC</text>
          <text x="250" y="140" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6">credential</text>
          <circle cx="280" cy="120" r="10" fill="hsl(var(--primary))" opacity={0.1} stroke="hsl(var(--primary))" strokeWidth="1" />
          <text x="280" y="124" textAnchor="middle" fill="hsl(var(--primary))" fontSize="6" fontWeight="bold">MCP</text>
          <text x="280" y="140" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="6">tool</text>
          {/* Status badge */}
          <rect x="100" y="160" width="100" height="22" rx="11" fill={allPassed ? "hsl(var(--primary) / 0.1)" : "hsl(0 70% 55% / 0.1)"} stroke={allPassed ? "hsl(var(--primary))" : "hsl(0, 70%, 55%)"} strokeWidth="1" />
          <text x="150" y="175" textAnchor="middle" fill={allPassed ? "hsl(var(--primary))" : "hsl(0, 70%, 55%)"} fontSize="8" fontWeight="bold">
            {allPassed ? "✓ Certified" : "✗ Failed"}
          </text>
        </svg>
      </div>

      {/* Verification checks */}
      <div className="space-y-1.5">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
              c.passed ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            }`}>
              {c.passed ? <IconCheck size={10} /> : <IconX size={10} />}
            </span>
            <span className="font-medium text-foreground">{c.name}</span>
            <span className="text-muted-foreground">{c.detail}</span>
          </div>
        ))}
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

  // Agent delegation state
  const [agentDelegation, setAgentDelegation] = useState<SealedAgentDelegation | null>(null);
  const [agentDelegationChecks, setAgentDelegationChecks] = useState<AgentDelegationCheck[]>([]);
  const [agentHologram, setAgentHologram] = useState<Hologram | null>(null);

  const ECOSYSTEM = "uor.foundation";
  const EXPIRES = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

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
    setAgentDelegation(null);
    setAgentDelegationChecks([]);
    setAgentHologram(null);
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
      aPersona = await createPersona("relationship", "Alice (Human)", [ECOSYSTEM]);
      bPersona = await createPersona("relationship", "Bob (AI Agent)", [ECOSYSTEM]);
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
    } catch (e: any) {
      pushLog({ stage: "triangle", timestamp: Date.now(), durationMs: performance.now() - t, success: false, error: e.message });
      setRunning(false); return;
    }

    // ── Step 5: Agent Delegation ─────────────────────────────────
    setStage("delegation");
    t = performance.now();
    try {
      // Alice (human) delegates to Bob (AI agent) via VRC
      const delegation = await issueAgentDelegation(
        aPersona.did,         // delegator R-DID (human)
        bPersona.did,         // agent DID
        aPhc.phcId,           // delegator PHC ref
        localVrcAtoB.vrcId,   // delegation VRC ref
        ECOSYSTEM,
        ["uor_derive", "uor_verify", "uor_query", "uor_resolve"],
        EXPIRES,
        {
          mcpEndpoint: "https://mcp.uor.foundation",
          agentModelUri: "urn:uor:onnx:agent-model-v1",
        },
      );

      const delegationHologram = project(delegation.identity);

      // Verify the delegation
      const verification = await verifyAgentDelegation(delegation, localVrcAtoB);

      setAgentDelegation(delegation);
      setAgentDelegationChecks(verification.checks);
      setAgentHologram(delegationHologram);

      pushLog({ stage: "delegation", timestamp: Date.now(), durationMs: performance.now() - t, success: verification.valid });
      setStage("complete");
    } catch (e: any) {
      pushLog({ stage: "delegation", timestamp: Date.now(), durationMs: performance.now() - t, success: false, error: e.message });
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
            <h1 className="text-xl font-bold tracking-tight">First Person Project — Certified AI Agent Flow</h1>
            <p className="text-sm text-muted-foreground">
              PHC → VRC → Trust Triangle → Agent Delegation with a2a + mcp-tool projections
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Progress Bar */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <StageIndicator stage="personas" currentStage={stage} label="Personas" icon={IconUsers} />
          <IconArrowRight size={14} className="text-muted-foreground/40 hidden sm:block" />
          <StageIndicator stage="phc" currentStage={stage} label="PHCs" icon={IconCertificate} />
          <IconArrowRight size={14} className="text-muted-foreground/40 hidden sm:block" />
          <StageIndicator stage="vrc" currentStage={stage} label="VRCs" icon={IconArrowsExchange} />
          <IconArrowRight size={14} className="text-muted-foreground/40 hidden sm:block" />
          <StageIndicator stage="triangle" currentStage={stage} label="Triangle" icon={IconTriangle} />
          <IconArrowRight size={14} className="text-muted-foreground/40 hidden sm:block" />
          <StageIndicator stage="delegation" currentStage={stage} label="Agent Delegation" icon={IconRobot} />
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={runFlow}
            disabled={running}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <IconPlayerPlay size={14} />
            {running ? "Running…" : stage === "complete" ? "Run Again" : "Run Certified Agent Flow"}
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
              title="Alice (Human Delegator)"
              icon={IconFingerprint}
              data={{
                "type": alice.persona.persona["fpp:type"],
                "R-DID": truncateId(alice.persona.did, 40),
                "VID": truncateId(alice.persona.projections.vid, 40),
                "canonical": truncateId(alice.persona.identity["u:canonicalId"], 40),
              }}
            />
            <CredentialCard
              title="Bob (AI Agent)"
              icon={IconRobot}
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
              title="Bob's PHC (Agent Identity)"
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

          {alice.hologram && (
            <div className="bg-card border border-border rounded-xl p-4">
              <ProjectionGrid hologram={alice.hologram} label="Alice's PHC (Human)" />
            </div>
          )}
        </section>
      )}

      {/* ── STEP 3: VRC Exchange ─────────────────────────────────────── */}
      {vrcAtoB && vrcBtoA && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <IconArrowsExchange size={16} className="text-primary" />
            Step 3 — Delegation VRC Exchange (Human ↔ Agent)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CredentialCard
              title="VRC: Alice → Bob (Delegation)"
              icon={IconLink}
              data={{
                "issuer R-DID": truncateId(vrcAtoB.credential["fpp:issuerRdid"], 36),
                "agent R-DID": truncateId(vrcAtoB.credential["fpp:subjectRdid"], 36),
                "ecosystem": vrcAtoB.credential["fpp:ecosystem"],
                "VRC ID": truncateId(vrcAtoB.vrcId, 40),
                "trust-graph": truncateId(vrcAtoB.projections.trustgraph, 40),
              }}
            />
            <CredentialCard
              title="VRC: Bob → Alice (Acknowledgement)"
              icon={IconLink}
              data={{
                "agent R-DID": truncateId(vrcBtoA.credential["fpp:issuerRdid"], 36),
                "delegator R-DID": truncateId(vrcBtoA.credential["fpp:subjectRdid"], 36),
                "ecosystem": vrcBtoA.credential["fpp:ecosystem"],
                "VRC ID": truncateId(vrcBtoA.vrcId, 40),
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

      {/* ── STEP 5: Agent Delegation ─────────────────────────────────── */}
      {agentDelegation && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <IconRobot size={16} className="text-primary" />
            Step 5 — Certified AI Agent Delegation
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Delegation Credential */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconCertificate size={14} className="text-primary" />
                </div>
                <h4 className="text-sm font-semibold">Agent Delegation Credential</h4>
              </div>
              <div className="space-y-1.5">
                {[
                  ["delegator", truncateId(agentDelegation.credential["fpp:delegatorRdid"], 36)],
                  ["agent DID", truncateId(agentDelegation.credential["fpp:agentDid"], 36)],
                  ["PHC ref", truncateId(agentDelegation.credential["fpp:delegatorPhcRef"], 36)],
                  ["VRC ref", truncateId(agentDelegation.credential["fpp:delegationVrcRef"], 36)],
                  ["ecosystem", agentDelegation.credential["fpp:ecosystem"]],
                  ["capabilities", agentDelegation.credential["fpp:delegatedCapabilities"].join(", ")],
                  ["MCP endpoint", agentDelegation.credential["fpp:mcpEndpoint"] ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 text-[10px]">
                    <span className="font-mono text-muted-foreground shrink-0 w-24">{k}</span>
                    <span className="font-mono text-foreground break-all">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Projections — a2a + mcp-tool focus */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconNetwork size={14} className="text-primary" />
                </div>
                <h4 className="text-sm font-semibold">Agentic Protocol Projections</h4>
              </div>
              <div className="space-y-2">
                {[
                  { label: "A2A Agent Card", key: "a2a", value: agentDelegation.projections.a2a, desc: "Google A2A discovery" },
                  { label: "MCP Tool", key: "mcpTool", value: agentDelegation.projections.mcpTool, desc: "Tool identity" },
                  { label: "MCP Context", key: "mcpContext", value: agentDelegation.projections.mcpContext, desc: "Context entry" },
                  { label: "DID", key: "did", value: agentDelegation.projections.did, desc: "W3C DID" },
                  { label: "VC", key: "vc", value: agentDelegation.projections.vc, desc: "Verifiable Credential" },
                  { label: "VRC", key: "vrc", value: agentDelegation.projections.vrc, desc: "Delegation VRC" },
                  { label: "Trust Graph", key: "trustgraph", value: agentDelegation.projections.trustgraph, desc: "Graph position" },
                  { label: "CID", key: "cid", value: agentDelegation.projections.cid, desc: "Content ID" },
                ].map(p => (
                  <div key={p.key} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30">
                    <div className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-foreground">{p.label}</span>
                        <span className="text-[8px] px-1 rounded-full bg-primary/10 text-primary font-medium">{p.desc}</span>
                      </div>
                      <p className="text-[9px] font-mono text-muted-foreground truncate">{truncateId(p.value, 48)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Delegation Chain + Verification */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DelegationChainViz delegation={agentDelegation} checks={agentDelegationChecks} />
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <IconTool size={12} className="text-primary" />
                  Trust Chain: How It Works
                </h4>
                <div className="space-y-2 text-[10px] text-muted-foreground">
                  <p><strong className="text-foreground">1. Human PHC</strong> — Alice proves personhood (Sybil-resistant)</p>
                  <p><strong className="text-foreground">2. Delegation VRC</strong> — Alice issues VRC to Bob (human→agent relationship)</p>
                  <p><strong className="text-foreground">3. Agent Delegation Credential</strong> — Wraps PHC + VRC + capabilities</p>
                  <p><strong className="text-foreground">4. A2A Projection</strong> — Agent discoverable via Google A2A protocol</p>
                  <p><strong className="text-foreground">5. MCP-Tool Projection</strong> — Agent's tools are content-addressed</p>
                  <p><strong className="text-foreground">6. VC Projection</strong> — Delegation is a W3C Verifiable Credential</p>
                </div>
                <div className="pt-2 border-t border-border space-y-1 text-[10px] text-muted-foreground">
                  <p><strong className="text-foreground">Key insight:</strong> The A2A Agent Card and MCP Tool endpoint both derive from the <em>same canonical hash</em> as the VRC that establishes the delegation. Any verifier can trace from the agent's tool endpoint back to the human's personhood credential.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Full Hologram */}
          {agentHologram && (
            <div className="bg-card border border-border rounded-xl p-4">
              <ProjectionGrid hologram={agentHologram} label="Agent Delegation Credential" />
            </div>
          )}
        </section>
      )}

      {/* Architecture card */}
      <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <IconBraces size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">Architecture: Certified AI Agent Trust Chain</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-[11px] text-muted-foreground">
          <div>
            <p className="font-bold text-foreground mb-1">Layer 0: UOR</p>
            <p>URDNA2015 → SHA-256 → canonical identity. Every object content-addressed.</p>
          </div>
          <div>
            <p className="font-bold text-foreground mb-1">Layer 1: VIDs</p>
            <p>R-DIDs for human & agent. Self-sovereign identity for both.</p>
          </div>
          <div>
            <p className="font-bold text-foreground mb-1">Layer 2: TSP</p>
            <p>VRC exchange over authenticated channels. Metadata privacy.</p>
          </div>
          <div>
            <p className="font-bold text-foreground mb-1">Layer 3: FPP</p>
            <p>PHC proves personhood. VRC proves delegation. Triangle verifies.</p>
          </div>
          <div>
            <p className="font-bold text-foreground mb-1">Layer 4: Agent</p>
            <p>ADC projects into A2A + MCP-tool. Human-certified AI agents.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
