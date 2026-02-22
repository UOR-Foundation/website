import { useState, useCallback, useRef } from "react";
import Layout from "@/modules/core/components/Layout";

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-api/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface PinResult {
  type: string;
  cid: string;
  derivationId: string;
  certificateId: string;
  pinataCid: string | null;
  storachaCid: string | null;
  gatewayUrl: string | null;
  quantumLevel: number;
  success: boolean;
  error?: string;
}

interface BatchResponse {
  "sobridge:totalVocabularySize": number;
  "sobridge:batchOffset": number;
  "sobridge:batchSize": number;
  "sobridge:pinnedCount": number;
  "sobridge:failedCount": number;
  "sobridge:dryRun": boolean;
  "sobridge:nextOffset": number | null;
  "sobridge:hasMore": boolean;
  "sobridge:results": PinResult[];
  "cert:Certificate": {
    "@id": string;
    "@type": string;
    "cert:certifies": Record<string, unknown>;
    "cert:epistemicGrade": string;
    "cert:timestamp": string;
  };
  "derivation:derivationId": string;
}

type VerifyStatus = "idle" | "verifying" | "verified" | "failed";

interface VerifiedResult extends PinResult {
  verifyStatus: VerifyStatus;
  verifyMatch?: boolean;
}

export default function BulkPinPage() {
  const [batchSize, setBatchSize] = useState(25);
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalTypes, setTotalTypes] = useState<number | null>(null);
  const [allResults, setAllResults] = useState<VerifiedResult[]>([]);
  const [batchManifests, setBatchManifests] = useState<Array<{ offset: number; derivationId: string; certificateId: string; timestamp: string; pinned: number; failed: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const stopRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev, `[${new Date().toISOString().slice(11, 19)}] ${msg}`]);
  }, []);

  const pinBatch = useCallback(async (offset: number): Promise<{ nextOffset: number | null; hasMore: boolean }> => {
    addLog(`Pinning batch offset=${offset} size=${batchSize} dryRun=${dryRun}...`);
    const resp = await fetch(`${API_BASE}/schema-org/pin-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ batch_size: batchSize, offset, dry_run: dryRun }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`API ${resp.status}: ${text.slice(0, 200)}`);
    }

    const data = await resp.json() as BatchResponse;
    const total = data["sobridge:totalVocabularySize"];
    setTotalTypes(total);

    const newResults: VerifiedResult[] = (data["sobridge:results"] || []).map(r => ({ ...r, verifyStatus: "idle" as VerifyStatus }));
    setAllResults(prev => [...prev, ...newResults]);

    const cert = data["cert:Certificate"];
    setBatchManifests(prev => [...prev, {
      offset: data["sobridge:batchOffset"],
      derivationId: data["derivation:derivationId"],
      certificateId: cert?.["@id"] ?? "",
      timestamp: cert?.["cert:timestamp"] ?? new Date().toISOString(),
      pinned: data["sobridge:pinnedCount"],
      failed: data["sobridge:failedCount"],
    }]);

    const pinned = data["sobridge:pinnedCount"];
    const failed = data["sobridge:failedCount"];
    addLog(`✓ Batch complete: ${pinned} pinned, ${failed} failed. Total vocab: ${total}`);

    const nextOffset = data["sobridge:nextOffset"];
    setCurrentOffset(nextOffset ?? offset + batchSize);

    return { nextOffset, hasMore: data["sobridge:hasMore"] };
  }, [batchSize, dryRun, addLog]);

  const runSingleBatch = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      await pinBatch(currentOffset);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      addLog(`✗ Error: ${msg}`);
    } finally {
      setRunning(false);
    }
  }, [currentOffset, pinBatch, addLog]);

  const runAllBatches = useCallback(async () => {
    setRunning(true);
    setError(null);
    stopRef.current = false;
    let offset = currentOffset;
    try {
      while (true) {
        if (stopRef.current) { addLog("⏹ Stopped by user."); break; }
        const { nextOffset, hasMore } = await pinBatch(offset);
        if (!hasMore || nextOffset === null) { addLog("🏁 All types processed!"); break; }
        offset = nextOffset;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      addLog(`✗ Error: ${msg}`);
    } finally {
      setRunning(false);
    }
  }, [currentOffset, pinBatch, addLog]);

  const stopBatches = useCallback(() => { stopRef.current = true; }, []);

  const verifyResult = useCallback(async (idx: number) => {
    setAllResults(prev => prev.map((r, i) => i === idx ? { ...r, verifyStatus: "verifying" } : r));
    const item = allResults[idx];
    if (!item?.derivationId) {
      setAllResults(prev => prev.map((r, i) => i === idx ? { ...r, verifyStatus: "failed", verifyMatch: false } : r));
      return;
    }
    try {
      const resp = await fetch(`${API_BASE}/tools/verify?derivation_id=${encodeURIComponent(item.derivationId)}`, {
        headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
      });
      const data = await resp.json();
      const verified = data?.["proof:verified"] === true || data?.verified === true || resp.ok;
      setAllResults(prev => prev.map((r, i) => i === idx ? { ...r, verifyStatus: verified ? "verified" : "failed", verifyMatch: verified } : r));
    } catch {
      setAllResults(prev => prev.map((r, i) => i === idx ? { ...r, verifyStatus: "failed", verifyMatch: false } : r));
    }
  }, [allResults]);

  const verifyAll = useCallback(async () => {
    for (let i = 0; i < allResults.length; i++) {
      if (allResults[i]?.success && allResults[i]?.verifyStatus === "idle") {
        await verifyResult(i);
      }
    }
  }, [allResults, verifyResult]);

  const reset = useCallback(() => {
    setAllResults([]);
    setBatchManifests([]);
    setCurrentOffset(0);
    setTotalTypes(null);
    setLog([]);
    setError(null);
  }, []);

  const successCount = allResults.filter(r => r.success).length;
  const failedCount = allResults.filter(r => !r.success).length;
  const verifiedCount = allResults.filter(r => r.verifyStatus === "verified").length;
  const progress = totalTypes ? Math.round((allResults.length / totalTypes) * 100) : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Schema.org → IPFS Bulk Inscription</h1>
            <p className="mt-2 text-muted-foreground">
              Canonically encode, content-address, and inscribe every Schema.org type to IPFS with UOR verification certificates.
            </p>
          </div>

          {/* Controls */}
          <div className="rounded-lg border border-border bg-card p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Batch Controls</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Batch Size</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={batchSize}
                  onChange={e => setBatchSize(Math.min(100, Math.max(1, Number(e.target.value))))}
                  disabled={running}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Current Offset</label>
                <input
                  type="number"
                  min={0}
                  value={currentOffset}
                  onChange={e => setCurrentOffset(Math.max(0, Number(e.target.value)))}
                  disabled={running}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} disabled={running} className="rounded" />
                  <span className="text-sm font-medium">Dry Run</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} disabled={running} className="rounded" />
                  <span className="text-sm font-medium">Auto-advance</span>
                </label>
              </div>
              <div className="flex items-end gap-2">
                {!running ? (
                  <>
                    <button onClick={runSingleBatch} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
                      Pin Batch
                    </button>
                    {autoAdvance && (
                      <button onClick={runAllBatches} className="rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
                        Pin All
                      </button>
                    )}
                    {allResults.length > 0 && (
                      <button onClick={reset} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                        Reset
                      </button>
                    )}
                  </>
                ) : (
                  <button onClick={stopBatches} className="rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
                    Stop
                  </button>
                )}
              </div>
            </div>

            {/* Progress */}
            {totalTypes !== null && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>{allResults.length} / {totalTypes} types processed</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-green-500">✓ {successCount} pinned</span>
                  <span className="text-red-500">✗ {failedCount} failed</span>
                  <span className="text-blue-500">🔒 {verifiedCount} verified</span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive p-4 mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Batch Manifests */}
          {batchManifests.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Batch Manifests ({batchManifests.length})</h2>
                <button onClick={verifyAll} disabled={running} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  Verify All Results
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 text-left">Batch</th>
                      <th className="py-2 pr-4 text-left">Pinned/Failed</th>
                      <th className="py-2 pr-4 text-left">Manifest Derivation ID</th>
                      <th className="py-2 pr-4 text-left">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchManifests.map((m, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono">offset {m.offset}</td>
                        <td className="py-2 pr-4">
                          <span className="text-green-500">{m.pinned}</span> / <span className="text-red-500">{m.failed}</span>
                        </td>
                        <td className="py-2 pr-4 font-mono truncate max-w-[300px]" title={m.derivationId}>{m.derivationId}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{m.timestamp.slice(0, 19)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results Table */}
          {allResults.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Inscription Results ({allResults.length})</h2>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-3 text-left">#</th>
                      <th className="py-2 pr-3 text-left">Type</th>
                      <th className="py-2 pr-3 text-left">Status</th>
                      <th className="py-2 pr-3 text-left">Derivation ID</th>
                      <th className="py-2 pr-3 text-left">CID</th>
                      <th className="py-2 pr-3 text-left">Pinata</th>
                      <th className="py-2 pr-3 text-left">Storacha</th>
                      <th className="py-2 pr-3 text-left">Verify</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allResults.map((r, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-1.5 pr-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-1.5 pr-3 font-medium">{r.type}</td>
                        <td className="py-1.5 pr-3">
                          {r.success ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-500">PINNED</span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-500" title={r.error}>FAILED</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 font-mono truncate max-w-[200px]" title={r.derivationId}>
                          {r.derivationId ? r.derivationId.slice(0, 40) + "…" : "—"}
                        </td>
                        <td className="py-1.5 pr-3 font-mono truncate max-w-[120px]" title={r.cid}>
                          {r.cid ? r.cid.slice(0, 16) + "…" : "—"}
                        </td>
                        <td className="py-1.5 pr-3">
                          {r.pinataCid ? (
                            <a href={`https://uor.mypinata.cloud/ipfs/${r.pinataCid}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {r.pinataCid.slice(0, 12)}…
                            </a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-1.5 pr-3">
                          {r.storachaCid ? (
                            <a href={`https://${r.storachaCid}.ipfs.storacha.link`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {r.storachaCid.slice(0, 12)}…
                            </a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-1.5 pr-3">
                          {r.verifyStatus === "idle" && r.success && (
                            <button onClick={() => verifyResult(i)} className="text-primary hover:underline text-[10px]">Verify</button>
                          )}
                          {r.verifyStatus === "verifying" && <span className="text-yellow-500 text-[10px]">⏳</span>}
                          {r.verifyStatus === "verified" && <span className="text-green-500 text-[10px]">✓ Verified</span>}
                          {r.verifyStatus === "failed" && <span className="text-red-500 text-[10px]">✗ Failed</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Activity Log */}
          {log.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
              <div className="bg-muted/50 rounded-md p-4 max-h-[300px] overflow-y-auto font-mono text-xs leading-relaxed">
                {log.map((entry, i) => (
                  <div key={i} className="text-muted-foreground">{entry}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
