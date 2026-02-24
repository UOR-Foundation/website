/**
 * TrustGraph — Interactive Social Trust Visualization
 * ════════════════════════════════════════════════════
 *
 * Visualizes the attestation network and trust score computation
 * as a force-directed graph with real-time scoring.
 *
 * @module trust-graph/pages/TrustGraphPage
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Network, Plus, Zap, Users, Shield, Clock,
  Eye, ChevronDown, ChevronRight,
} from "lucide-react";
import { UnsTrustGraph, type TrustScore, type TrustAttestation } from "@/modules/uns/trust/trust-graph";
import { generateKeypair } from "@/modules/uns/core/keypair";

// ── Demo Network Simulation ──────────────────────────────────────────────

interface DemoNode {
  id: string;
  label: string;
  score: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  attestationsReceived: number;
  phiIndividual: number;
  phiSocial: number;
  tauTemporal: number;
}

interface DemoEdge {
  source: string;
  target: string;
  confidence: number;
}

function useSimulation(nodes: DemoNode[], edges: DemoEdge[], width: number, height: number) {
  const nodesRef = useRef(nodes);
  const [, setTick] = useState(0);

  useEffect(() => {
    nodesRef.current = nodes.map((n, i) => ({
      ...n,
      x: nodesRef.current[i]?.x ?? n.x,
      y: nodesRef.current[i]?.y ?? n.y,
      vx: nodesRef.current[i]?.vx ?? 0,
      vy: nodesRef.current[i]?.vy ?? 0,
    }));
  }, [nodes]);

  useEffect(() => {
    let animId: number;
    const tick = () => {
      const ns = nodesRef.current;
      const cx = width / 2;
      const cy = height / 2;

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[i].x - ns[j].x;
          const dy = ns[i].y - ns[j].y;
          const dist = Math.max(10, Math.sqrt(dx * dx + dy * dy));
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          ns[i].vx += fx;
          ns[i].vy += fy;
          ns[j].vx -= fx;
          ns[j].vy -= fy;
        }
      }

      // Attraction along edges
      for (const e of edges) {
        const si = ns.find(n => n.id === e.source);
        const ti = ns.find(n => n.id === e.target);
        if (!si || !ti) continue;
        const dx = ti.x - si.x;
        const dy = ti.y - si.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = (dist - 100) * 0.005 * e.confidence;
        si.vx += (dx / dist) * force;
        si.vy += (dy / dist) * force;
        ti.vx -= (dx / dist) * force;
        ti.vy -= (dy / dist) * force;
      }

      // Center gravity
      for (const n of ns) {
        n.vx += (cx - n.x) * 0.003;
        n.vy += (cy - n.y) * 0.003;
        n.vx *= 0.9;
        n.vy *= 0.9;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(30, Math.min(width - 30, n.x));
        n.y = Math.max(30, Math.min(height - 30, n.y));
      }

      setTick(t => t + 1);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [edges, width, height]);

  return nodesRef.current;
}

// ── Graph SVG Component ──────────────────────────────────────────────────

function TrustGraphSVG({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
}: {
  nodes: DemoNode[];
  edges: DemoEdge[];
  selectedNode: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const WIDTH = 700;
  const HEIGHT = 450;
  const simNodes = useSimulation(nodes, edges, WIDTH, HEIGHT);

  const maxScore = Math.max(1, ...nodes.map(n => n.score));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full rounded-xl bg-card border border-border"
      style={{ maxHeight: 450 }}
    >
      <defs>
        <filter id="tg-glow">
          <feGaussianBlur stdDeviation="3" result="g" />
          <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const s = simNodes.find(n => n.id === e.source);
        const t = simNodes.find(n => n.id === e.target);
        if (!s || !t) return null;
        const isHighlighted = selectedNode === e.source || selectedNode === e.target;
        return (
          <line
            key={i}
            x1={s.x}
            y1={s.y}
            x2={t.x}
            y2={t.y}
            stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
            strokeWidth={isHighlighted ? 1.5 : 0.8}
            strokeOpacity={isHighlighted ? 0.8 : 0.3}
            strokeDasharray={e.confidence < 0.5 ? "4,3" : undefined}
          />
        );
      })}

      {/* Nodes */}
      {simNodes.map(n => {
        const radius = 6 + (n.score / maxScore) * 18;
        const isSelected = selectedNode === n.id;
        return (
          <g
            key={n.id}
            onClick={() => onSelectNode(isSelected ? null : n.id)}
            className="cursor-pointer"
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={radius}
              fill={isSelected ? "hsl(var(--primary))" : `hsl(var(--primary) / ${0.3 + (n.score / maxScore) * 0.7})`}
              stroke={isSelected ? "hsl(var(--primary-foreground))" : "hsl(var(--primary) / 0.5)"}
              strokeWidth={isSelected ? 2 : 1}
              filter={isSelected ? "url(#tg-glow)" : undefined}
            />
            <text
              x={n.x}
              y={n.y - radius - 5}
              textAnchor="middle"
              fill="hsl(var(--foreground))"
              fontSize={9}
              fontFamily="var(--font-mono, monospace)"
              opacity={isSelected ? 1 : 0.7}
            >
              {n.label}
            </text>
            <text
              x={n.x}
              y={n.y + 3}
              textAnchor="middle"
              fill="hsl(var(--primary-foreground))"
              fontSize={8}
              fontWeight="bold"
            >
              {n.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Detail Panel ─────────────────────────────────────────────────────────

function MemberDetail({
  node,
  edges,
  allNodes,
}: {
  node: DemoNode;
  edges: DemoEdge[];
  allNodes: DemoNode[];
}) {
  const inbound = edges.filter(e => e.target === node.id);
  const outbound = edges.filter(e => e.source === node.id);

  const bars = [
    { label: "Φ Individual", value: node.phiIndividual, color: "hsl(var(--primary))" },
    { label: "Φ Social", value: node.phiSocial, color: "hsl(152, 44%, 50%)" },
    { label: "τ Temporal", value: node.tauTemporal, color: "hsl(45, 70%, 50%)" },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "hsl(var(--primary) / 0.2)", color: "hsl(var(--primary))" }}
        >
          {node.score}
        </div>
        <div>
          <div className="font-semibold text-sm">{node.label}</div>
          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
            {node.id.slice(0, 24)}…
          </div>
        </div>
      </div>

      {/* Score breakdown bars */}
      <div className="space-y-2">
        {bars.map(b => (
          <div key={b.label}>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
              <span>{b.label}</span>
              <span className="font-mono">{(b.value * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${b.value * 100}%`, background: b.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Attestations */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-secondary/30 rounded-lg p-2.5">
          <div className="font-mono font-bold text-primary">{inbound.length}</div>
          <div className="text-muted-foreground text-[10px]">Received</div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2.5">
          <div className="font-mono font-bold text-primary">{outbound.length}</div>
          <div className="text-muted-foreground text-[10px]">Given</div>
        </div>
      </div>

      {/* Attestation list */}
      {inbound.length > 0 && (
        <div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
            Attested by
          </div>
          <div className="space-y-1">
            {inbound.map((e, i) => {
              const attester = allNodes.find(n => n.id === e.source);
              return (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className="font-medium">{attester?.label ?? "?"}</span>
                  <span className="font-mono text-muted-foreground">
                    {(e.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function TrustGraphPage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [scores, setScores] = useState<TrustScore[]>([]);
  const [demoNodes, setDemoNodes] = useState<DemoNode[]>([]);
  const [demoEdges, setDemoEdges] = useState<DemoEdge[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  const runDemo = useCallback(async () => {
    setIsRunning(true);
    setSelectedNode(null);

    try {
      const graph = new UnsTrustGraph();

      // Generate keypairs for 8 demo members
      const members = [
        "Alice", "Bob", "Carol", "Dave",
        "Eve", "Frank", "Grace", "Hank",
      ];

      const keypairs = await Promise.all(
        members.map(() => generateKeypair())
      );

      // Create network
      const network = await graph.createNetwork({
        name: "UOR Trust Network",
        description: "A trust network for UOR framework participants",
        criteria: ["expertise", "integrity", "contribution"],
        creatorCanonicalId: keypairs[0].canonicalId,
      });

      // Join all members
      for (let i = 1; i < keypairs.length; i++) {
        graph.joinNetwork(network.networkId, keypairs[i].canonicalId);
      }

      // Create attestations (varied confidence)
      const attestationPairs: [number, number, number][] = [
        // Alice attests strongly
        [0, 1, 0.95], [0, 2, 0.88], [0, 3, 0.72],
        // Bob attests
        [1, 0, 0.90], [1, 2, 0.85], [1, 4, 0.60],
        // Carol attests
        [2, 0, 0.92], [2, 1, 0.78], [2, 5, 0.65],
        // Dave attests
        [3, 0, 0.80], [3, 4, 0.70], [3, 6, 0.55],
        // Eve attests
        [4, 1, 0.75], [4, 3, 0.82],
        // Frank attests
        [5, 2, 0.88], [5, 6, 0.90],
        // Grace attests
        [6, 0, 0.93], [6, 5, 0.77],
        // Hank — few attestations (new member, low temporal)
        [7, 3, 0.50],
      ];

      for (const [ai, si, conf] of attestationPairs) {
        await graph.attest({
          attesterKeypair: keypairs[ai],
          subjectCanonicalId: keypairs[si].canonicalId,
          networkId: network.networkId,
          confidence: conf,
          criteria: ["expertise", "integrity"],
        });
      }

      // Individual Φ from observer (simulated)
      const individualPhi = new Map<string, number>();
      const phis = [0.92, 0.85, 0.88, 0.70, 0.60, 0.75, 0.80, 0.30];
      keypairs.forEach((kp, i) => individualPhi.set(kp.canonicalId, phis[i]));

      // Compute scores
      const computed = graph.computeScores(network.networkId, individualPhi);
      setScores(computed);

      // Build demo graph nodes
      const nodes: DemoNode[] = keypairs.map((kp, i) => {
        const s = computed.find(c => c.subjectCanonicalId === kp.canonicalId);
        return {
          id: kp.canonicalId,
          label: members[i],
          score: s?.score ?? 0,
          x: 350 + (Math.random() - 0.5) * 300,
          y: 225 + (Math.random() - 0.5) * 200,
          vx: 0,
          vy: 0,
          attestationsReceived: s?.attestationCount ?? 0,
          phiIndividual: s?.phiIndividual ?? 0,
          phiSocial: s?.phiSocial ?? 0,
          tauTemporal: s?.tauTemporal ?? 0,
        };
      });

      const edges: DemoEdge[] = attestationPairs.map(([ai, si, conf]) => ({
        source: keypairs[ai].canonicalId,
        target: keypairs[si].canonicalId,
        confidence: conf,
      }));

      setDemoNodes(nodes);
      setDemoEdges(edges);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const selectedNodeData = useMemo(
    () => demoNodes.find(n => n.id === selectedNode) ?? null,
    [demoNodes, selectedNode]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Network className="w-5 h-5 text-primary" />
          <h1 className="text-sm font-semibold tracking-tight">TrustGraph × UOR</h1>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            Social Attestation Layer
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        <section className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Networks That Grow at the Speed of Trust
          </h2>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            TrustGraph adds the <strong>social dimension</strong> to UOR's observer model.
            While H-score and Φ measure <em>individual</em> coherence, attestations measure
            how peers perceive your behavior over time. Trust is computed as a composite of
            three signals:
          </p>

          {/* Three pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: Eye, label: "Φ Individual",
                desc: "Observer integration capacity — your coherence with the Grade-A graph",
                weight: "30%",
              },
              {
                icon: Users, label: "Φ Social",
                desc: "PageRank-weighted attestation score — what peers observe about you",
                weight: "40%",
              },
              {
                icon: Clock, label: "τ Temporal",
                desc: "Behavioral consistency over time — patterns that can't be faked quickly",
                weight: "30%",
              },
            ].map(p => (
              <div key={p.label} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p.icon className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">{p.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{p.weight}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Formula */}
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showFormula ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            View scoring formula
          </button>
          {showFormula && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <code className="text-sm font-mono text-primary block text-center">
                TrustScore = α·Φ_individual + β·Φ_social + γ·τ_temporal
              </code>
              <div className="text-[10px] text-muted-foreground space-y-1">
                <p>• <strong>Φ_individual</strong> = observer integration capacity from God Conjecture (0–1)</p>
                <p>• <strong>Φ_social</strong> = PageRank on attestation graph, confidence-weighted (0–1)</p>
                <p>• <strong>τ_temporal</strong> = log₂(1 + membership_days) / log₂(365) — 1 year = 1.0</p>
                <p>• Composite scaled to 0–1000 for human-readable scores</p>
                <p>• <strong>Sybil resistance</strong>: new accounts have τ ≈ 0, making high scores structurally impossible without sustained behavioral coherence</p>
              </div>
            </div>
          )}
        </section>

        {/* Graph + Controls */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Live Trust Network
            </h3>
            <button
              onClick={runDemo}
              disabled={isRunning}
              className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isRunning ? (
                <>Computing…</>
              ) : (
                <><Zap className="w-3 h-3" /> Generate Network</>
              )}
            </button>
          </div>

          {demoNodes.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <TrustGraphSVG
                  nodes={demoNodes}
                  edges={demoEdges}
                  selectedNode={selectedNode}
                  onSelectNode={setSelectedNode}
                />
              </div>
              <div>
                {selectedNodeData ? (
                  <MemberDetail
                    node={selectedNodeData}
                    edges={demoEdges}
                    allNodes={demoNodes}
                  />
                ) : (
                  <div className="bg-card border border-border rounded-xl p-4 text-center text-xs text-muted-foreground">
                    <Network className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Click a node to inspect its trust score breakdown</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Network className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                Click <strong>Generate Network</strong> to create a demo trust network with 8 members and attestations
              </p>
            </div>
          )}
        </section>

        {/* Leaderboard */}
        {scores.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-semibold text-sm">Trust Leaderboard</h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Rank</span>
                <span>Member</span>
                <span className="text-right">Score</span>
                <span className="text-right">Φ Individual</span>
                <span className="text-right">Φ Social</span>
                <span className="text-right">τ Temporal</span>
              </div>
              {scores.map((s, i) => {
                const node = demoNodes.find(n => n.id === s.subjectCanonicalId);
                return (
                  <button
                    key={s.subjectCanonicalId}
                    onClick={() => setSelectedNode(
                      selectedNode === s.subjectCanonicalId ? null : s.subjectCanonicalId
                    )}
                    className={`w-full grid grid-cols-6 gap-2 px-4 py-2.5 text-xs hover:bg-secondary/30 transition-colors ${
                      selectedNode === s.subjectCanonicalId ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="font-mono text-muted-foreground">#{i + 1}</span>
                    <span className="font-medium">{node?.label ?? s.subjectCanonicalId.slice(0, 8)}</span>
                    <span className="text-right font-mono font-bold text-primary">{s.score}</span>
                    <span className="text-right font-mono text-muted-foreground">{(s.phiIndividual * 100).toFixed(0)}%</span>
                    <span className="text-right font-mono text-muted-foreground">{(s.phiSocial * 100).toFixed(0)}%</span>
                    <span className="text-right font-mono text-muted-foreground">{(s.tauTemporal * 100).toFixed(0)}%</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Integration Map */}
        <section className="space-y-3">
          <h3 className="font-semibold text-sm">UOR Integration Architecture</h3>
          <div className="bg-card border border-border rounded-xl p-5 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Attestation → cert:TrustAttestation",
                  desc: "Every attestation is content-addressed (SHA-256) and Dilithium-3 signed. Tampering is cryptographically detectable.",
                },
                {
                  title: "TrustScore → ObserverProfile.integration",
                  desc: "Composite score fuses individual Φ (from observer), social Φ (from attestation graph), and temporal τ (from membership duration).",
                },
                {
                  title: "Network → UnsAccessPolicy",
                  desc: "Trust networks map to access policies — TrustScore thresholds can gate resource access, governance votes, and API permissions.",
                },
                {
                  title: "Sybil Resistance → Temporal Depth",
                  desc: "τ_temporal = log₂(1 + days). A 1-day-old account has τ = 0.12. A 1-year account has τ = 1.0. You can't buy time.",
                },
              ].map(item => (
                <div key={item.title} className="bg-secondary/30 rounded-lg p-3 space-y-1">
                  <div className="font-semibold text-primary">{item.title}</div>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Attribution */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
          <p>
            Inspired by{" "}
            <a href="https://trustgraph.network/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              TrustGraph
            </a>
            {" "}— attestation-based governance by Ithaca. Enhanced with UOR content-addressing and post-quantum signatures.
          </p>
        </div>
      </main>
    </div>
  );
}
