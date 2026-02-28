/**
 * Kernel Module Dependency Graph
 * ═══════════════════════════════
 * Visualizes how every kernel module derives from genesis axioms.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// ── Graph data ───────────────────────────────────────────

interface GraphNode {
  id: string;
  label: string;
  layer: "axiom" | "kernel" | "external";
  crystallized: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
}

const NODES: GraphNode[] = [
  // Genesis axioms (layer 0)
  { id: "axiom-ring",   label: "axiom-ring",   layer: "axiom", crystallized: true },
  { id: "axiom-hash",   label: "axiom-hash",   layer: "axiom", crystallized: true },
  { id: "axiom-cid",    label: "axiom-cid",    layer: "axiom", crystallized: true },
  { id: "axiom-codec",  label: "axiom-codec",  layer: "axiom", crystallized: true },
  { id: "axiom-mirror", label: "axiom-mirror", layer: "axiom", crystallized: true },
  { id: "axiom-post",   label: "axiom-post",   layer: "axiom", crystallized: true },

  // Kernel modules (layer 1)
  { id: "q-boot",       label: "q-boot",       layer: "kernel", crystallized: true },
  { id: "q-mmu",        label: "q-mmu",        layer: "kernel", crystallized: true },
  { id: "q-sched",      label: "q-sched",      layer: "kernel", crystallized: true },
  { id: "q-syscall",    label: "q-syscall",     layer: "kernel", crystallized: true },
  { id: "q-fs",         label: "q-fs",          layer: "kernel", crystallized: true },
  { id: "q-ecc",        label: "q-ecc",         layer: "kernel", crystallized: true },
  { id: "q-isa",        label: "q-isa",         layer: "kernel", crystallized: true },
  { id: "q-net",        label: "q-net",         layer: "kernel", crystallized: true },
  { id: "q-ipc",        label: "q-ipc",         layer: "kernel", crystallized: true },
  { id: "q-agent",      label: "q-agent",       layer: "kernel", crystallized: true },
  { id: "q-driver",     label: "q-driver",      layer: "kernel", crystallized: true },
  { id: "q-security",   label: "q-security",    layer: "kernel", crystallized: true },
  { id: "q-secure-mesh",label: "q-secure-mesh", layer: "kernel", crystallized: true },
  { id: "q-sovereignty",label: "q-sovereignty", layer: "kernel", crystallized: true },
  { id: "q-ceremony",   label: "q-ceremony",    layer: "kernel", crystallized: true },
  { id: "q-trust-mesh", label: "q-trust-mesh",  layer: "kernel", crystallized: true },
  { id: "q-disclosure", label: "q-disclosure",   layer: "kernel", crystallized: true },
  { id: "q-vault",      label: "q-vault",        layer: "kernel", crystallized: true },
  { id: "q-three-word", label: "q-three-word",   layer: "kernel", crystallized: true },
  { id: "q-simulator",  label: "q-simulator",    layer: "kernel", crystallized: true },
  { id: "q-error-mit",  label: "q-error-mitigation", layer: "kernel", crystallized: true },

  // Irreducible external boundaries
  { id: "ext-webcrypto",  label: "WebCrypto",       layer: "external", crystallized: false },
  { id: "ext-postquantum",label: "@noble/post-quantum", layer: "external", crystallized: false },
  { id: "ext-urdna2015",  label: "URDNA2015 (jsonld)",  layer: "external", crystallized: false },
  { id: "ext-eventbus",   label: "SystemEventBus",  layer: "external", crystallized: false },
];

const EDGES: GraphEdge[] = [
  // q-boot ← all axioms
  { from: "axiom-ring", to: "q-boot" }, { from: "axiom-hash", to: "q-boot" },
  { from: "axiom-cid", to: "q-boot" }, { from: "axiom-codec", to: "q-boot" },
  { from: "axiom-mirror", to: "q-boot" },
  // q-mmu
  { from: "axiom-ring", to: "q-mmu" }, { from: "axiom-hash", to: "q-mmu" },
  { from: "axiom-cid", to: "q-mmu" },
  // q-sched
  { from: "axiom-ring", to: "q-sched" }, { from: "axiom-hash", to: "q-sched" },
  { from: "axiom-cid", to: "q-sched" },
  // q-syscall
  { from: "axiom-ring", to: "q-syscall" }, { from: "axiom-hash", to: "q-syscall" },
  { from: "axiom-cid", to: "q-syscall" }, { from: "axiom-codec", to: "q-syscall" },
  // q-fs
  { from: "axiom-ring", to: "q-fs" }, { from: "axiom-hash", to: "q-fs" },
  { from: "axiom-cid", to: "q-fs" }, { from: "axiom-codec", to: "q-fs" },
  // q-ecc
  { from: "axiom-mirror", to: "q-ecc" },
  // q-isa ← q-ecc (internal dep)
  { from: "q-ecc", to: "q-isa" },
  // q-net
  { from: "axiom-ring", to: "q-net" }, { from: "axiom-hash", to: "q-net" },
  { from: "axiom-cid", to: "q-net" }, { from: "axiom-codec", to: "q-net" },
  // q-ipc
  { from: "axiom-ring", to: "q-ipc" }, { from: "axiom-hash", to: "q-ipc" },
  { from: "axiom-cid", to: "q-ipc" }, { from: "axiom-codec", to: "q-ipc" },
  // q-agent
  { from: "axiom-ring", to: "q-agent" }, { from: "axiom-hash", to: "q-agent" },
  { from: "axiom-cid", to: "q-agent" }, { from: "axiom-codec", to: "q-agent" },
  // q-driver
  { from: "axiom-ring", to: "q-driver" }, { from: "axiom-hash", to: "q-driver" },
  { from: "axiom-cid", to: "q-driver" },
  // q-security
  { from: "axiom-ring", to: "q-security" }, { from: "axiom-hash", to: "q-security" },
  { from: "axiom-cid", to: "q-security" }, { from: "axiom-codec", to: "q-security" },
  { from: "q-ecc", to: "q-security" },
  // q-secure-mesh (internal only)
  { from: "q-security", to: "q-secure-mesh" }, { from: "q-agent", to: "q-secure-mesh" },
  { from: "q-sched", to: "q-secure-mesh" }, { from: "q-ipc", to: "q-secure-mesh" },
  { from: "q-net", to: "q-secure-mesh" }, { from: "q-ecc", to: "q-secure-mesh" },
  // q-trust-mesh
  { from: "axiom-ring", to: "q-trust-mesh" }, { from: "axiom-hash", to: "q-trust-mesh" },
  { from: "axiom-cid", to: "q-trust-mesh" }, { from: "axiom-codec", to: "q-trust-mesh" },
  // q-disclosure
  { from: "axiom-ring", to: "q-disclosure" }, { from: "axiom-hash", to: "q-disclosure" },
  { from: "axiom-cid", to: "q-disclosure" }, { from: "axiom-codec", to: "q-disclosure" },
  // q-vault
  { from: "axiom-ring", to: "q-vault" }, { from: "axiom-hash", to: "q-vault" },
  { from: "axiom-cid", to: "q-vault" },
  { from: "ext-webcrypto", to: "q-vault" },
  // q-sovereignty
  { from: "axiom-ring", to: "q-sovereignty" }, { from: "axiom-hash", to: "q-sovereignty" },
  { from: "axiom-cid", to: "q-sovereignty" }, { from: "axiom-codec", to: "q-sovereignty" },
  { from: "ext-eventbus", to: "q-sovereignty" },
  { from: "q-ceremony", to: "q-sovereignty" },
  // q-ceremony
  { from: "axiom-ring", to: "q-ceremony" }, { from: "axiom-hash", to: "q-ceremony" },
  { from: "ext-postquantum", to: "q-ceremony" }, { from: "ext-urdna2015", to: "q-ceremony" },
  { from: "q-three-word", to: "q-ceremony" },
  // q-simulator (zero genesis deps — pure math)
  // q-error-mit ← q-simulator
  { from: "q-simulator", to: "q-error-mit" },
];

// ── Layout constants ─────────────────────────────────────

const SVG_W = 1100;
const SVG_H = 720;
const AXIOM_Y = 60;
const KERNEL_Y = 320;
const EXTERNAL_Y = 620;

function layoutNodes(nodes: GraphNode[]) {
  const axioms = nodes.filter(n => n.layer === "axiom");
  const kernels = nodes.filter(n => n.layer === "kernel");
  const externals = nodes.filter(n => n.layer === "external");

  const positions = new Map<string, { x: number; y: number }>();
  const spread = (items: GraphNode[], y: number) => {
    const gap = SVG_W / (items.length + 1);
    items.forEach((n, i) => positions.set(n.id, { x: gap * (i + 1), y }));
  };

  spread(axioms, AXIOM_Y);

  // Arrange kernel in 2 rows for readability
  const half = Math.ceil(kernels.length / 2);
  const row1 = kernels.slice(0, half);
  const row2 = kernels.slice(half);
  const gap1 = SVG_W / (row1.length + 1);
  row1.forEach((n, i) => positions.set(n.id, { x: gap1 * (i + 1), y: KERNEL_Y - 60 }));
  const gap2 = SVG_W / (row2.length + 1);
  row2.forEach((n, i) => positions.set(n.id, { x: gap2 * (i + 1), y: KERNEL_Y + 60 }));

  spread(externals, EXTERNAL_Y);

  return positions;
}

// ── Colors ───────────────────────────────────────────────

const LAYER_COLORS = {
  axiom: "hsl(38, 50%, 55%)",
  kernel: "hsl(200, 40%, 55%)",
  external: "hsl(0, 40%, 55%)",
} as const;

const LAYER_BG = {
  axiom: "hsla(38, 50%, 55%, 0.12)",
  kernel: "hsla(200, 40%, 55%, 0.10)",
  external: "hsla(0, 40%, 55%, 0.10)",
} as const;

// ── Component ────────────────────────────────────────────

export default function KernelGraphPage() {
  const [hovered, setHovered] = useState<string | null>(null);

  const positions = useMemo(() => layoutNodes(NODES), []);

  const hoveredEdges = useMemo(() => {
    if (!hovered) return new Set<number>();
    const indices = new Set<number>();
    EDGES.forEach((e, i) => {
      if (e.from === hovered || e.to === hovered) indices.add(i);
    });
    return indices;
  }, [hovered]);

  const connectedNodes = useMemo(() => {
    if (!hovered) return new Set<string>();
    const s = new Set<string>([hovered]);
    EDGES.forEach(e => {
      if (e.from === hovered) s.add(e.to);
      if (e.to === hovered) s.add(e.from);
    });
    return s;
  }, [hovered]);

  // Stats
  const totalKernel = NODES.filter(n => n.layer === "kernel").length;
  const crystallized = NODES.filter(n => n.layer === "kernel" && n.crystallized).length;
  const pct = Math.round((crystallized / totalKernel) * 100);

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-24"
      style={{ background: "hsl(25, 8%, 4%)", color: "hsl(38, 15%, 88%)" }}
    >
      {/* Header */}
      <motion.h1
        className="font-serif text-2xl md:text-3xl text-center mb-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Kernel Module Dependency Graph
      </motion.h1>
      <p className="font-mono text-xs mb-1" style={{ color: "hsl(30, 8%, 55%)" }}>
        {crystallized}/{totalKernel} kernel modules crystallized ({pct}%)
      </p>

      {/* Progress bar */}
      <div className="w-64 h-1 rounded-full overflow-hidden mb-8" style={{ background: "hsla(38, 12%, 70%, 0.1)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "hsl(38, 50%, 55%)" }} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-6 font-mono text-xs" style={{ color: "hsl(30, 8%, 55%)" }}>
        {(["axiom", "kernel", "external"] as const).map(layer => (
          <div key={layer} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: LAYER_COLORS[layer] }} />
            <span className="capitalize">{layer === "external" ? "External Boundary" : layer}</span>
          </div>
        ))}
      </div>

      {/* SVG Graph */}
      <div className="w-full max-w-5xl overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          style={{ minWidth: 700 }}
        >
          {/* Edges */}
          {EDGES.map((e, i) => {
            const from = positions.get(e.from);
            const to = positions.get(e.to);
            if (!from || !to) return null;
            const active = hovered ? hoveredEdges.has(i) : true;
            return (
              <line
                key={i}
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke={active ? "hsla(38, 30%, 62%, 0.35)" : "hsla(38, 10%, 62%, 0.06)"}
                strokeWidth={active && hovered ? 1.5 : 0.5}
                style={{ transition: "all 300ms ease" }}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map(node => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const dimmed = hovered ? !connectedNodes.has(node.id) : false;
            const r = node.layer === "axiom" ? 20 : 16;
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer", transition: "opacity 300ms" }}
                opacity={dimmed ? 0.15 : 1}
              >
                <circle
                  cx={pos.x} cy={pos.y} r={r}
                  fill={LAYER_BG[node.layer]}
                  stroke={LAYER_COLORS[node.layer]}
                  strokeWidth={hovered === node.id ? 2 : 1}
                />
                {node.crystallized && (
                  <text
                    x={pos.x} y={pos.y + 1}
                    textAnchor="middle" dominantBaseline="central"
                    fill={LAYER_COLORS[node.layer]}
                    fontSize="10" fontFamily="serif"
                  >
                    ✦
                  </text>
                )}
                <text
                  x={pos.x} y={pos.y + r + 12}
                  textAnchor="middle" dominantBaseline="central"
                  fill="hsl(38, 15%, 75%)"
                  fontSize="9" fontFamily="monospace"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Cross-links */}
      <div className="flex gap-8 mt-10 font-mono text-sm" style={{ color: "hsl(38, 40%, 62%)" }}>
        <Link to="/genesis" className="hover:underline">→ Genesis Boot</Link>
        <Link to="/artifact" className="hover:underline">→ Artifact Inspector</Link>
      </div>
    </div>
  );
}
