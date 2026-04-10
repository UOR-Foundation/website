/**
 * Service Mesh — Trace Module.
 * @ontology uor:ServiceMesh
 * Layer 1 — local. Record, verify, and replay execution traces.
 * @version 1.0.0
 */
import { register } from "../registry";

const _traces: Array<{ method: string; params: unknown; result: unknown; timestamp: number; cid?: string }> = [];

register({
  ns: "trace",
  label: "Trace",
  layer: 1,
  operations: {
    record: {
      handler: async (params: any) => {
        const entry = {
          method: params?.method ?? "unknown",
          params: params?.params,
          result: params?.result,
          timestamp: Date.now(),
          cid: params?.cid,
        };
        _traces.push(entry);
        return { index: _traces.length - 1, recorded: true };
      },
      description: "Record a trace entry",
    },
    verify: {
      handler: async (params: any) => {
        const { singleProofHash } = await import("@/modules/kernel/engine");
        const entries = params?.entries ?? _traces;
        const results = await Promise.all(
          entries.map(async (e: any, i: number) => {
            if (!e.cid) return { index: i, valid: true, reason: "no-cid" };
            const proof = await singleProofHash({ method: e.method, params: e.params, result: e.result });
            return { index: i, valid: proof.cid === e.cid, expected: e.cid, actual: proof.cid };
          }),
        );
        return { valid: results.every((r: any) => r.valid), entries: results };
      },
      description: "Verify integrity of a trace chain",
    },
    replay: {
      handler: async (params: any) => {
        const from = params?.from ?? 0;
        const to = params?.to ?? _traces.length;
        return { entries: _traces.slice(from, to), total: _traces.length };
      },
      description: "Replay recorded trace entries",
    },
  },
});
