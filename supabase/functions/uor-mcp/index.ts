/**
 * UOR MCP Server — Model Context Protocol gateway to the UOR Framework.
 *
 * Implements MCP 2025-03-26 Streamable HTTP transport natively.
 * The 5 canonical UOR agent tools are exposed as MCP tools so any LLM client
 * can ground its responses in content-addressed, algebraically verified computations.
 */

const UOR_API_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1/uor-api`;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, mcp-session-id",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

async function callApi(method: "GET" | "POST", path: string, params?: Record<string, string>, body?: unknown): Promise<unknown> {
  let url = `${UOR_API_BASE}${path}`;
  if (params) url += "?" + new URLSearchParams(params).toString();
  const r = await fetch(url, {
    method,
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json();
}

// ── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  { name: "uor_derive", description: 'Derive a ring expression. Returns content-addressed IRI, SHA-256 derivation ID, canonical form, grade A. Example: "neg(42)".', inputSchema: { type: "object", properties: { term: { type: "string" }, quantum: { type: "number" } }, required: ["term"] } },
  { name: "uor_verify", description: "Verify a derivation by its SHA-256 ID. Returns verified (grade A) or unverified (grade D).", inputSchema: { type: "object", properties: { derivation_id: { type: "string" } }, required: ["derivation_id"] } },
  { name: "uor_query", description: "SPARQL 1.1 query over the UOR knowledge graph.", inputSchema: { type: "object", properties: { sparql: { type: "string" } }, required: ["sparql"] } },
  { name: "uor_correlate", description: "Hamming fidelity (0–1) between two ring elements.", inputSchema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" }, quantum: { type: "number" } }, required: ["a", "b"] } },
  { name: "uor_partition", description: "Classify elements into Units, Exterior, Irreducible, Reducible.", inputSchema: { type: "object", properties: { seed_set: { type: "array", items: { type: "number" } }, closure_mode: { type: "string" }, quantum: { type: "number" } }, required: ["seed_set"] } },
];

async function runTool(name: string, args: Record<string, unknown>) {
  try {
    let data: unknown;
    switch (name) {
      case "uor_derive": data = await callApi("GET", "/tools/derive", { term: String(args.term ?? ""), quantum: String(args.quantum ?? 0) }); break;
      case "uor_verify": data = await callApi("GET", "/tools/verify", { derivation_id: String(args.derivation_id ?? "") }); break;
      case "uor_query": data = await callApi("POST", "/tools/query", undefined, { sparql: String(args.sparql ?? "") }); break;
      case "uor_correlate": data = await callApi("GET", "/tools/correlate", { a: String(args.a ?? 0), b: String(args.b ?? 0), quantum: String(args.quantum ?? 0), mode: "full" }); break;
      case "uor_partition": data = await callApi("POST", "/tools/partition", undefined, { seed_set: args.seed_set, closure_mode: String(args.closure_mode ?? "OPEN").toUpperCase(), quantum: Number(args.quantum ?? 0) }); break;
      default: return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  } catch (e) {
    return { content: [{ type: "text", text: `Error: ${(e as Error).message}` }], isError: true };
  }
}

// ── JSON-RPC ────────────────────────────────────────────────────────────────

const SERVER_INFO = {
  protocolVersion: "2025-03-26",
  capabilities: { tools: { listChanged: false } },
  serverInfo: { name: "uor-mcp", version: "1.0.0" },
};

async function rpc(req: { method: string; id?: unknown; params?: Record<string, unknown> }) {
  const id = req.id ?? null;
  switch (req.method) {
    case "initialize": return { jsonrpc: "2.0", id, result: SERVER_INFO };
    case "notifications/initialized": return null;
    case "tools/list": return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
    case "tools/call": return { jsonrpc: "2.0", id, result: await runTool(String(req.params?.name), (req.params?.arguments ?? {}) as Record<string, unknown>) };
    case "ping": return { jsonrpc: "2.0", id, result: {} };
    default: return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${req.method}` } };
  }
}

// ── Serve ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const p = url.pathname;
  const sub = p.includes("/uor-mcp") ? p.slice(p.indexOf("/uor-mcp") + 8) : p;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  // Root: discovery
  if (req.method === "GET" && (sub === "" || sub === "/")) {
    return json({ name: "uor-mcp", version: "1.0.0", protocol: "MCP 2025-03-26", tools: TOOLS.map(t => t.name), mcp_endpoint: "/mcp", docs: "https://uor.foundation/llms.md" });
  }

  // MCP endpoint
  if (sub === "/mcp") {
    if (req.method === "POST") {
      let body;
      try { body = await req.json(); } catch { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400); }
      if (Array.isArray(body)) {
        const results = (await Promise.all(body.map(rpc))).filter(Boolean);
        return results.length ? json(results) : new Response(null, { status: 202, headers: CORS });
      }
      const result = await rpc(body);
      return result ? json(result) : new Response(null, { status: 202, headers: CORS });
    }
    if (req.method === "GET") {
      // SSE endpoint
      const enc = new TextEncoder();
      const stream = new ReadableStream({ start(c) { c.enqueue(enc.encode("event: endpoint\ndata: /mcp\n\n")); setTimeout(() => c.close(), 100); } });
      return new Response(stream, { headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }
    if (req.method === "DELETE") return new Response(null, { status: 204, headers: CORS });
  }

  return json({ error: "Not found" }, 404);
});
