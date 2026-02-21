import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import {
  uor_derive,
  uor_query,
  uor_verify,
  uor_correlate,
  uor_partition,
} from "../tools";
import type {
  DeriveOutput,
  QueryOutput,
  VerifyOutput,
  CorrelateOutput,
  PartitionOutput,
} from "../tools";
import { parseTerm } from "../parser";
import { serializeTerm } from "@/modules/ring-core/canonicalization";

type TabId = "derive" | "query" | "verify" | "correlate" | "partition" | "chat";

const TABS: { id: TabId; label: string }[] = [
  { id: "derive", label: "Derive" },
  { id: "query", label: "Query" },
  { id: "verify", label: "Verify" },
  { id: "correlate", label: "Correlate" },
  { id: "partition", label: "Partition" },
  { id: "chat", label: "Agent Chat" },
];

// ── Natural language → tool call mapping ────────────────────────────────────

function mapNaturalLanguage(text: string): { tool: string; input: string } | null {
  const t = text.toLowerCase().trim();

  // Inverse patterns
  const invMatch = t.match(/(?:inverse|negate|negation)\s+(?:of\s+)?(\d+|0x[0-9a-f]+)/i);
  if (invMatch) return { tool: "derive", input: `neg(${invMatch[1]})` };

  // Bitwise NOT patterns
  const bnotMatch = t.match(/(?:bitwise\s*not|bnot|complement)\s+(?:of\s+)?(\d+|0x[0-9a-f]+)/i);
  if (bnotMatch) return { tool: "derive", input: `bnot(${bnotMatch[1]})` };

  // Successor patterns
  const succMatch = t.match(/(?:successor|succ|next)\s+(?:of\s+)?(\d+|0x[0-9a-f]+)/i);
  if (succMatch) return { tool: "derive", input: `succ(${succMatch[1]})` };

  // XOR patterns
  const xorMatch = t.match(/(?:xor|difference)\s+(?:of\s+)?(\d+|0x[0-9a-f]+)\s+(?:and|with|,)\s+(\d+|0x[0-9a-f]+)/i);
  if (xorMatch) return { tool: "derive", input: `xor(${xorMatch[1]}, ${xorMatch[2]})` };

  // Correlate patterns
  const corMatch = t.match(/(?:correlat|similar|fidelity|compare)\w*\s+(\d+)\s+(?:and|with|to|,)\s+(\d+)/i);
  if (corMatch) return { tool: "correlate", input: `${corMatch[1]},${corMatch[2]}` };

  // Verify patterns
  const verMatch = t.match(/(?:verify|check|validate)\s+(urn:uor:derivation:\S+)/i);
  if (verMatch) return { tool: "verify", input: verMatch[1] };

  // Derive with explicit term
  const derMatch = t.match(/(?:derive|compute|calculate)\s+(.+)/i);
  if (derMatch) {
    const term = derMatch[1].trim();
    try { parseTerm(term); return { tool: "derive", input: term }; } catch { /* fallthrough */ }
  }

  // Direct term expressions
  try {
    parseTerm(t);
    return { tool: "derive", input: t };
  } catch { /* not a term */ }

  return null;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function DeriveTab() {
  const [term, setTerm] = useState("neg(bnot(42))");
  const [quantum, setQuantum] = useState(0);
  const [result, setResult] = useState<DeriveOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await uor_derive({ term, quantum });
      setResult(r);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [term, quantum]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder='neg(bnot(42))' className="flex-1 px-4 py-2 rounded-lg border border-border bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <select value={quantum} onChange={(e) => setQuantum(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm">
          <option value={0}>Q0</option><option value={1}>Q1</option>
        </select>
        <button onClick={execute} disabled={loading} className="btn-primary text-sm disabled:opacity-50">{loading ? "…" : "Execute"}</button>
      </div>
      {error && <p className="text-sm text-destructive font-mono">{error}</p>}
      {result && <ResultPanel data={result} label="Derive Result" />}
    </div>
  );
}

function QueryTab() {
  const [sparql, setSparql] = useState("SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10");
  const [result, setResult] = useState<QueryOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true); setError(null);
    try { setResult(await uor_query({ sparql })); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [sparql]);

  return (
    <div className="space-y-4">
      <textarea value={sparql} onChange={(e) => setSparql(e.target.value)} rows={3} className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
      <button onClick={execute} disabled={loading} className="btn-primary text-sm disabled:opacity-50">{loading ? "…" : "Execute"}</button>
      {error && <p className="text-sm text-destructive font-mono">{error}</p>}
      {result && <ResultPanel data={result} label="Query Result" />}
    </div>
  );
}

function VerifyTab() {
  const [derivationId, setDerivationId] = useState("");
  const [result, setResult] = useState<VerifyOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true); setError(null);
    try { setResult(await uor_verify({ derivation_id: derivationId })); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [derivationId]);

  return (
    <div className="space-y-4">
      <input value={derivationId} onChange={(e) => setDerivationId(e.target.value)} placeholder="urn:uor:derivation:sha256:..." className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      <button onClick={execute} disabled={loading || !derivationId.trim()} className="btn-primary text-sm disabled:opacity-50">{loading ? "…" : "Verify"}</button>
      {error && <p className="text-sm text-destructive font-mono">{error}</p>}
      {result && (
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold mb-3 ${result.verified ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {result.verified ? "✓ VERIFIED" : "✗ FAILED"}
          </div>
          <ResultPanel data={result} label="Verify Result" />
        </div>
      )}
    </div>
  );
}

function CorrelateTab() {
  const [a, setA] = useState("42");
  const [b, setB] = useState("43");
  const [result, setResult] = useState<CorrelateOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true); setError(null);
    try { setResult(await uor_correlate({ a: parseInt(a), b: parseInt(b) })); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [a, b]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input value={a} onChange={(e) => setA(e.target.value)} placeholder="Value A" className="flex-1 px-4 py-2 rounded-lg border border-border bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <input value={b} onChange={(e) => setB(e.target.value)} placeholder="Value B" className="flex-1 px-4 py-2 rounded-lg border border-border bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <button onClick={execute} disabled={loading} className="btn-primary text-sm disabled:opacity-50">{loading ? "…" : "Execute"}</button>
      </div>
      {error && <p className="text-sm text-destructive font-mono">{error}</p>}
      {result && (
        <div>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-2xl font-display font-bold text-primary">{(result.fidelity * 100).toFixed(1)}%</span>
            <span className="text-sm text-muted-foreground">fidelity</span>
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full" style={{ width: `${result.fidelity * 100}%` }} />
            </div>
          </div>
          <ResultPanel data={result} label="Correlate Result" />
        </div>
      )}
    </div>
  );
}

function PartitionTab() {
  const [mode, setMode] = useState("oneStep");
  const [result, setResult] = useState<PartitionOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const seeds = Array.from({ length: 256 }, (_, i) => i);
      setResult(await uor_partition({ seed_set: seeds, closure_mode: mode }));
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [mode]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm">
          <option value="oneStep">One Step</option>
          <option value="fixedPoint">Fixed Point</option>
          <option value="graphClosed">Graph Closed</option>
        </select>
        <button onClick={execute} disabled={loading} className="btn-primary text-sm disabled:opacity-50">{loading ? "…" : "Compute Partition"}</button>
      </div>
      {error && <p className="text-sm text-destructive font-mono">{error}</p>}
      {result && (
        <div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Stat label="Units" value={result.units_count} />
            <Stat label="Exterior" value={result.exterior_count} />
            <Stat label="Irreducible" value={result.irreducible_count} />
            <Stat label="Reducible" value={result.reducible_count} />
          </div>
          <ResultPanel data={result} label="Partition Result" />
        </div>
      )}
    </div>
  );
}

function ChatTab() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput("");
    setHistory((h) => [...h, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const mapped = mapNaturalLanguage(msg);
      if (!mapped) {
        setHistory((h) => [...h, { role: "agent", text: "I couldn't map that to a tool call. Try:\n• \"inverse of 85\"\n• \"correlate 42 and 43\"\n• \"xor(0x55, 0xAA)\"\n• \"verify urn:uor:derivation:sha256:...\"" }]);
        return;
      }

      let resultText = "";
      if (mapped.tool === "derive") {
        const r = await uor_derive({ term: mapped.input });
        resultText = `**uor_derive("${mapped.input}")**\n\nResult: ${r.result_value}\nIRI: ${r.result_iri}\nCanonical: ${r.canonical_form}\nGrade: ${r.epistemic_grade}\nDerivation: ${r.derivation_id}\nTime: ${r.executionTimeMs}ms\n\nReceipt: ${r.receipt.selfVerified ? "✓ Self-verified" : "✗ Failed"}`;
      } else if (mapped.tool === "correlate") {
        const [a, b] = mapped.input.split(",").map(Number);
        const r = await uor_correlate({ a, b });
        resultText = `**uor_correlate(${a}, ${b})**\n\nFidelity: ${(r.fidelity * 100).toFixed(1)}%\nDifference: ${r.totalDifference} bits\nTime: ${r.executionTimeMs}ms`;
      } else if (mapped.tool === "verify") {
        const r = await uor_verify({ derivation_id: mapped.input });
        resultText = `**uor_verify("${mapped.input}")**\n\n${r.verified ? "✓ VERIFIED" : "✗ FAILED"}\nCert chain: ${r.cert_chain.length} entries\nTime: ${r.executionTimeMs}ms`;
      }

      setHistory((h) => [...h, { role: "agent", text: resultText }]);
    } catch (e) {
      setHistory((h) => [...h, { role: "agent", text: `Error: ${String(e)}` }]);
    } finally {
      setLoading(false);
    }
  }, [input]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 max-h-80 overflow-auto space-y-3">
        {history.length === 0 && (
          <p className="text-xs text-muted-foreground">Try: "What is the inverse of 85?" or "correlate 42 and 43" or "xor(0x55, 0xAA)"</p>
        )}
        {history.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.role === "user" ? "text-foreground" : "text-muted-foreground"}`}>
            <span className="text-[10px] font-mono text-primary mr-2">{msg.role === "user" ? "YOU" : "UOR"}</span>
            <span className="whitespace-pre-wrap">{msg.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && send()}
          placeholder="What is the inverse of 85?"
          className="flex-1 px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button onClick={send} disabled={loading || !input.trim()} className="btn-primary text-sm disabled:opacity-50">
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ── Shared components ───────────────────────────────────────────────────────

function ResultPanel({ data, label }: { data: unknown; label: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      <pre className="p-3 rounded bg-muted text-muted-foreground overflow-auto max-h-64 text-[10px] leading-tight font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
      <p className="text-lg font-display font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

const AgentConsolePage = () => {
  const [activeTab, setActiveTab] = useState<TabId>("derive");

  return (
    <Layout>
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            Agent Console
          </h1>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            The 5 canonical tool functions — the "system calls" of the Semantic Web.
            Each tool produces a self-verified canonical receipt.
          </p>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="rounded-lg border border-border bg-card p-6">
            {activeTab === "derive" && <DeriveTab />}
            {activeTab === "query" && <QueryTab />}
            {activeTab === "verify" && <VerifyTab />}
            {activeTab === "correlate" && <CorrelateTab />}
            {activeTab === "partition" && <PartitionTab />}
            {activeTab === "chat" && <ChatTab />}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AgentConsolePage;
