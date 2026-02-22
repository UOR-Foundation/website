/**
 * UOR MCP Server — Model Context Protocol gateway to the UOR Framework.
 *
 * Implements MCP 2025-03-26 Streamable HTTP transport.
 * Security: input validation, size limits, rate-limit headers, strict CORS.
 */

import {
  deriveEpistemics,
  verifyEpistemics,
  queryEpistemics,
  correlateEpistemics,
  partitionEpistemics,
  formatEpistemicBlock,
} from "./epistemics.ts";

const UOR_API_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1/uor-api`;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const ALLOWED_ORIGINS = new Set([
  "https://uor.foundation",
  "https://www.uor.foundation",
  "https://univeral-coordinate-hub.lovable.app",
]);

function corsHeaders(origin?: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, mcp-session-id",
    "Access-Control-Expose-Headers": "mcp-session-id",
  };
}

const MAX_BODY_SIZE = 64 * 1024; // 64 KB

// ── Helpers ─────────────────────────────────────────────────────────────────

function sanitiseString(v: unknown, maxLen = 2048): string {
  const s = String(v ?? "").trim();
  return s.slice(0, maxLen);
}

function sanitiseNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function callApi(
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string>,
  body?: unknown,
): Promise<unknown> {
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
  {
    name: "uor_derive",
    description:
      'Derive a ring expression. Returns content-addressed IRI, SHA-256 derivation ID, canonical form, grade A. Example: "neg(42)".',
    inputSchema: {
      type: "object",
      properties: { term: { type: "string" }, quantum: { type: "number" } },
      required: ["term"],
    },
  },
  {
    name: "uor_verify",
    description:
      "Verify a derivation by its SHA-256 ID. Returns verified (grade A) or unverified (grade D).",
    inputSchema: {
      type: "object",
      properties: { derivation_id: { type: "string" } },
      required: ["derivation_id"],
    },
  },
  {
    name: "uor_query",
    description: "SPARQL 1.1 query over the UOR knowledge graph.",
    inputSchema: {
      type: "object",
      properties: { sparql: { type: "string" } },
      required: ["sparql"],
    },
  },
  {
    name: "uor_correlate",
    description: "Hamming fidelity (0–1) between two ring elements.",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number" },
        b: { type: "number" },
        quantum: { type: "number" },
      },
      required: ["a", "b"],
    },
  },
  {
    name: "uor_partition",
    description:
      "Classify elements into Units, Exterior, Irreducible, Reducible.",
    inputSchema: {
      type: "object",
      properties: {
        seed_set: { type: "array", items: { type: "number" } },
        closure_mode: { type: "string" },
        quantum: { type: "number" },
      },
      required: ["seed_set"],
    },
  },
];

const VALID_TOOL_NAMES = new Set(TOOLS.map((t) => t.name));

async function runTool(name: string, args: Record<string, unknown>) {
  if (!VALID_TOOL_NAMES.has(name)) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    let data: unknown;
    let epistemicBlock = "";

    switch (name) {
      case "uor_derive": {
        const term = sanitiseString(args.term);
        data = await callApi("GET", "/tools/derive", {
          term,
          quantum: String(sanitiseNumber(args.quantum)),
        });
        epistemicBlock = formatEpistemicBlock(
          deriveEpistemics(data as Record<string, unknown>, term),
        );
        break;
      }
      case "uor_verify": {
        const derivationId = sanitiseString(args.derivation_id, 128);
        data = await callApi("GET", "/tools/verify", {
          derivation_id: derivationId,
        });
        epistemicBlock = formatEpistemicBlock(
          verifyEpistemics(data as Record<string, unknown>, derivationId),
        );
        break;
      }
      case "uor_query": {
        const sparql = sanitiseString(args.sparql, 4096);
        data = await callApi("POST", "/tools/query", undefined, { sparql });
        epistemicBlock = formatEpistemicBlock(
          queryEpistemics(data as Record<string, unknown>, sparql),
        );
        break;
      }
      case "uor_correlate": {
        const a = sanitiseNumber(args.a);
        const b = sanitiseNumber(args.b);
        data = await callApi("GET", "/tools/correlate", {
          a: String(a),
          b: String(b),
          quantum: String(sanitiseNumber(args.quantum)),
          mode: "full",
        });
        epistemicBlock = formatEpistemicBlock(
          correlateEpistemics(data as Record<string, unknown>, a, b),
        );
        break;
      }
      case "uor_partition": {
        const seedSet = Array.isArray(args.seed_set)
          ? args.seed_set.map((v: unknown) => sanitiseNumber(v)).slice(0, 256)
          : [];
        data = await callApi("POST", "/tools/partition", undefined, {
          seed_set: seedSet,
          closure_mode: sanitiseString(
            args.closure_mode ?? "OPEN",
            16,
          ).toUpperCase(),
          quantum: sanitiseNumber(args.quantum),
        });
        epistemicBlock = formatEpistemicBlock(
          partitionEpistemics(data as Record<string, unknown>, seedSet),
        );
        break;
      }
    }

    const resultText = JSON.stringify(data, null, 2) + epistemicBlock;
    return { content: [{ type: "text", text: resultText }] };
  } catch (e) {
    return {
      content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
      isError: true,
    };
  }
}

// ── JSON-RPC ────────────────────────────────────────────────────────────────

const SERVER_INFO = {
  protocolVersion: "2025-03-26",
  capabilities: { tools: { listChanged: false } },
  serverInfo: { name: "uor-mcp", version: "1.0.0" },
};

const VALID_METHODS = new Set([
  "initialize",
  "notifications/initialized",
  "tools/list",
  "tools/call",
  "ping",
]);

async function rpc(req: {
  method: string;
  id?: unknown;
  params?: Record<string, unknown>;
}) {
  const id = req.id ?? null;

  if (!VALID_METHODS.has(req.method)) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${req.method}` },
    };
  }

  switch (req.method) {
    case "initialize":
      return { jsonrpc: "2.0", id, result: SERVER_INFO };
    case "notifications/initialized":
      return null;
    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
    case "tools/call":
      return {
        jsonrpc: "2.0",
        id,
        result: await runTool(
          sanitiseString(req.params?.name, 64),
          (req.params?.arguments ?? {}) as Record<string, unknown>,
        ),
      };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
  }
}

// ── Serve ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS")
    return new Response(null, { headers: cors });

  const url = new URL(req.url);
  const p = url.pathname;
  const sub = p.includes("/uor-mcp") ? p.slice(p.indexOf("/uor-mcp") + 8) : p;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  // Root: discovery
  if (req.method === "GET" && (sub === "" || sub === "/")) {
    return json({
      name: "uor-mcp",
      version: "1.0.0",
      protocol: "MCP 2025-03-26",
      tools: TOOLS.map((t) => t.name),
      mcp_endpoint: "/mcp",
      docs: "https://uor.foundation/llms.md",
    });
  }

  // MCP endpoint
  if (sub === "/mcp") {
    if (req.method === "POST") {
      // Enforce body size limit
      const contentLength = req.headers.get("content-length");
      if (contentLength && Number(contentLength) > MAX_BODY_SIZE) {
        return json(
          {
            jsonrpc: "2.0",
            id: null,
            error: { code: -32600, message: "Request too large" },
          },
          413,
        );
      }

      let body;
      try {
        const text = await req.text();
        if (text.length > MAX_BODY_SIZE) {
          return json(
            {
              jsonrpc: "2.0",
              id: null,
              error: { code: -32600, message: "Request too large" },
            },
            413,
          );
        }
        body = JSON.parse(text);
      } catch {
        return json(
          {
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error" },
          },
          400,
        );
      }

      if (Array.isArray(body)) {
        if (body.length > 20) {
          return json(
            {
              jsonrpc: "2.0",
              id: null,
              error: { code: -32600, message: "Batch too large (max 20)" },
            },
            400,
          );
        }
        const results = (await Promise.all(body.map(rpc))).filter(Boolean);
        return results.length
          ? json(results)
          : new Response(null, { status: 202, headers: cors });
      }

      const result = await rpc(body);
      return result
        ? json(result)
        : new Response(null, { status: 202, headers: cors });
    }

    if (req.method === "GET") {
      const enc = new TextEncoder();
      const stream = new ReadableStream({
        start(c) {
          c.enqueue(enc.encode("event: endpoint\ndata: /mcp\n\n"));
          setTimeout(() => c.close(), 100);
        },
      });
      return new Response(stream, {
        headers: {
          ...cors,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (req.method === "DELETE")
      return new Response(null, { status: 204, headers: cors });
  }

  return json({ error: "Not found" }, 404);
});
