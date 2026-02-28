import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UorArtifact, ArtifactVerification, DerivationNode } from "@/hologram/genesis/artifact";
import { verifyArtifact } from "@/hologram/genesis/artifact";

type InspectorPhase = "idle" | "loading" | "verified";

interface ParsedArtifact {
  artifact: UorArtifact;
  verification: ArtifactVerification;
  raw: string;
}

// ── Verification badge ───────────────────────────────────
function VerifyBadge({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${passed ? "bg-emerald-400" : "bg-red-400"}`} />
      <span className="text-holo-sm font-mono">{label}</span>
      <span className={`text-holo-xs font-mono ${passed ? "text-emerald-400" : "text-red-400"}`}>
        {passed ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}

// ── Derivation tree node ─────────────────────────────────
function TreeNode({ node, nodes, depth = 0 }: { node: DerivationNode; nodes: Record<string, DerivationNode>; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div style={{ marginLeft: `${depth * 16}px` }}>
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        className="flex items-center gap-2 py-1 w-full text-left group"
      >
        <span className="text-holo-xs font-mono text-hologram-text-muted w-4">
          {hasChildren ? (expanded ? "▾" : "▸") : "·"}
        </span>
        <span className="text-holo-sm font-mono text-hologram-text group-hover:text-hologram-gold transition-colors">
          {node.path.split("/").pop()}
        </span>
        <span className="text-holo-xs font-mono text-hologram-text-muted/50 truncate max-w-[120px]">
          {node.cid.slice(0, 16)}…
        </span>
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children.map(childPath => {
            const child = nodes[childPath];
            return child ? <TreeNode key={childPath} node={child} nodes={nodes} depth={depth + 1} /> : null;
          })}
        </div>
      )}
    </div>
  );
}

export default function ArtifactInspectorPage() {
  const [phase, setPhase] = useState<InspectorPhase>("idle");
  const [parsed, setParsed] = useState<ParsedArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    setPhase("loading");
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result as string;
        const artifact = JSON.parse(raw) as UorArtifact;
        if (artifact["@type"] !== "uor:Artifact") throw new Error(`Not a .uor artifact: @type="${artifact["@type"]}"`);
        const verification = verifyArtifact(artifact);
        setParsed({ artifact, verification, raw });
        setPhase("verified");
      } catch (e: any) {
        setError(e.message ?? "Failed to parse artifact");
        setPhase("idle");
      }
    };
    reader.onerror = () => { setError("Failed to read file"); setPhase("idle"); };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const rootNode = useMemo(() => {
    if (!parsed) return null;
    const { nodes, root } = parsed.artifact.derivationTree;
    return nodes[root] ?? null;
  }, [parsed]);

  return (
    <div className="min-h-screen bg-hologram-bg text-hologram-text font-body">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-holo-6 pt-16 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-holo-display tracking-tight mb-2">Artifact Inspector</h1>
          <p className="text-hologram-text-muted text-holo-sm">
            Drop a .uor file to verify its genesis seed, derivation tree, and envelope integrity.
          </p>
        </motion.div>
      </div>

      <div className="max-w-2xl mx-auto px-holo-6">
        {/* Drop Zone */}
        {phase !== "verified" && (
          <motion.div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className="rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer"
            style={{
              borderColor: dragOver ? "hsla(38, 40%, 62%, 0.5)" : "var(--hologram-glass-border)",
              background: dragOver ? "hsla(38, 40%, 62%, 0.05)" : "var(--hologram-glass)",
            }}
            onClick={() => document.getElementById("uor-file-input")?.click()}
            animate={{ scale: dragOver ? 1.01 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <input id="uor-file-input" type="file" accept=".uor,.json" onChange={onFileInput} className="hidden" />

            {phase === "loading" ? (
              <div className="flex flex-col items-center gap-3">
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="animate-spin text-hologram-gold">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
                </svg>
                <span className="text-holo-sm font-mono text-hologram-text-muted">Verifying…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="text-holo-2xl font-mono text-hologram-text-muted">◈</span>
                <span className="text-holo-sm font-mono text-hologram-text-muted">
                  Drop .uor file here or click to browse
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-holo-4 p-holo-4 rounded-lg border text-holo-sm font-mono"
            style={{ borderColor: "hsla(0, 60%, 50%, 0.3)", background: "hsla(0, 60%, 50%, 0.05)", color: "hsl(0, 60%, 70%)" }}
          >
            ✕ {error}
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {phase === "verified" && parsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-holo-4"
            >
              {/* Verification Summary */}
              <div
                className="rounded-lg border p-holo-5"
                style={{
                  borderColor: parsed.verification.valid
                    ? "hsla(140, 40%, 50%, 0.3)"
                    : "hsla(0, 60%, 50%, 0.3)",
                  background: parsed.verification.valid
                    ? "hsla(140, 40%, 50%, 0.05)"
                    : "hsla(0, 60%, 50%, 0.05)",
                }}
              >
                <div className="flex items-center gap-3 mb-holo-4">
                  <motion.div
                    className={`w-3 h-3 rounded-full ${parsed.verification.valid ? "bg-emerald-400" : "bg-red-400"}`}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className={`text-holo-sm font-mono ${parsed.verification.valid ? "text-emerald-400" : "text-red-400"}`}>
                    {parsed.verification.valid ? "ARTIFACT VERIFIED" : "VERIFICATION FAILED"}
                  </span>
                </div>

                <div className="space-y-2">
                  <VerifyBadge passed={parsed.verification.genesisValid} label="Genesis Seed" />
                  <VerifyBadge passed={parsed.verification.treeValid} label="Derivation Merkle" />
                  <VerifyBadge passed={parsed.verification.envelopeValid} label="Envelope CID" />
                </div>
              </div>

              {/* Genesis Info */}
              <div className="rounded-lg border p-holo-5" style={{ borderColor: "var(--hologram-glass-border)", background: "var(--hologram-glass)" }}>
                <h2 className="text-holo-sm font-mono text-hologram-gold mb-holo-3">Genesis Seed</h2>
                <div className="space-y-holo-2">
                  <div>
                    <span className="text-holo-xs text-hologram-text-muted block mb-0.5">CID</span>
                    <code className="text-holo-xs font-mono text-hologram-gold break-all">{parsed.artifact.genesis.cid}</code>
                  </div>
                  <div className="grid grid-cols-3 gap-holo-3">
                    <div>
                      <span className="text-holo-xs text-hologram-text-muted block mb-0.5">Glyph</span>
                      <span className="text-holo-lg font-mono">{parsed.artifact.genesis.glyph}</span>
                    </div>
                    <div>
                      <span className="text-holo-xs text-hologram-text-muted block mb-0.5">POST Time</span>
                      <span className="text-holo-sm font-mono text-hologram-gold">{parsed.artifact.genesis.durationMs.toFixed(2)}ms</span>
                    </div>
                    <div>
                      <span className="text-holo-xs text-hologram-text-muted block mb-0.5">Ring</span>
                      <span className="text-holo-sm font-mono">ℤ/{parsed.artifact.genesis.ringSize}ℤ</span>
                    </div>
                  </div>
                  {/* Checks */}
                  <div className="mt-holo-2 flex flex-wrap gap-2">
                    {parsed.artifact.genesis.checks.map(c => (
                      <span key={c.name} className={`text-holo-xs font-mono px-2 py-0.5 rounded ${c.passed ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                        {c.passed ? "✓" : "✕"} {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Derivation Tree */}
              <div className="rounded-lg border p-holo-5" style={{ borderColor: "var(--hologram-glass-border)", background: "var(--hologram-glass)" }}>
                <div className="flex items-center justify-between mb-holo-3">
                  <h2 className="text-holo-sm font-mono text-hologram-gold">Derivation Tree</h2>
                  <span className="text-holo-xs font-mono text-hologram-text-muted">
                    {parsed.artifact.derivationTree.moduleCount} modules
                  </span>
                </div>
                <div className="mb-holo-3">
                  <span className="text-holo-xs text-hologram-text-muted block mb-0.5">Merkle Root</span>
                  <code className="text-holo-xs font-mono text-hologram-text-muted break-all">
                    {parsed.artifact.derivationTree.merkleCid}
                  </code>
                </div>
                <div className="border-t pt-holo-3" style={{ borderColor: "var(--hologram-glass-border)" }}>
                  {rootNode && (
                    <TreeNode node={rootNode} nodes={parsed.artifact.derivationTree.nodes} />
                  )}
                </div>
              </div>

              {/* Envelope */}
              <div className="rounded-lg border p-holo-5" style={{ borderColor: "var(--hologram-glass-border)", background: "var(--hologram-glass)" }}>
                <h2 className="text-holo-sm font-mono text-hologram-gold mb-holo-3">Envelope</h2>
                <div className="space-y-holo-2">
                  <div>
                    <span className="text-holo-xs text-hologram-text-muted block mb-0.5">Envelope CID</span>
                    <code className="text-holo-xs font-mono break-all">{parsed.artifact.envelopeCid}</code>
                  </div>
                  <div className="grid grid-cols-2 gap-holo-3">
                    <div>
                      <span className="text-holo-xs text-hologram-text-muted block mb-0.5">Glyph</span>
                      <span className="text-holo-lg font-mono">{parsed.artifact.envelopeGlyph}</span>
                    </div>
                    <div>
                      <span className="text-holo-xs text-hologram-text-muted block mb-0.5">Created</span>
                      <span className="text-holo-xs font-mono text-hologram-text-muted">{parsed.artifact.created}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-holo-xs text-hologram-text-muted block mb-0.5">Size</span>
                    <span className="text-holo-xs font-mono text-hologram-text-muted">{(parsed.raw.length / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              </div>

              {/* Reset */}
              <div className="pb-16 flex justify-center">
                <button
                  onClick={() => { setPhase("idle"); setParsed(null); setError(null); }}
                  className="px-holo-6 py-holo-3 rounded-md text-holo-sm font-mono transition-colors border"
                  style={{ borderColor: "var(--hologram-glass-border)", background: "var(--hologram-glass)" }}
                >
                  Inspect another artifact
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
