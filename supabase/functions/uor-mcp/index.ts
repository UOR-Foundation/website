/**
 * UOR MCP Server — Model Context Protocol gateway to the UOR Framework.
 *
 * Exposes the 5 canonical UOR agent tools as MCP tools so any LLM client
 * (Claude Desktop, Cursor, GPT, etc.) can ground its responses in
 * content-addressed, algebraically verified ring computations.
 *
 * Transport: Streamable HTTP (MCP 2025-03-26 spec)
 * Stack:     mcp-lite ≥ 0.10.0 + Hono
 * Auth:      Public (verify_jwt = false), same as the underlying UOR API
 */

import { Hono } from "npm:hono@4";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";

// ── Configuration ───────────────────────────────────────────────────────────

const UOR_API_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1/uor-api`;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

// ── Internal API helper ─────────────────────────────────────────────────────

async function callUorApi(
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string>,
  body?: unknown
): Promise<unknown> {
  let url = `${UOR_API_BASE}${path}`;
  if (params && Object.keys(params).length > 0) {
    url += "?" + new URLSearchParams(params).toString();
  }

  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };

  const resp = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`UOR API ${method} ${path} → ${resp.status}: ${text}`);
  }

  return resp.json();
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const mcpServer = new McpServer({
  name: "uor-mcp",
  version: "1.0.0",
});

// ── Tool 1: uor_derive ─────────────────────────────────────────────────────

mcpServer.tool({
  name: "uor_derive",
  description:
    "Parse and canonicalize a ring expression in Z/(2^n)Z. Returns a content-addressed IRI, derivation ID, canonical form, epistemic grade, and an auditable receipt. Every result is algebraically verified before emission.",
  inputSchema: {
    type: "object" as const,
    properties: {
      term: {
        type: "string",
        description:
          'Ring expression to derive, e.g. "neg(42)", "add(7,3)", "xor(bnot(15),1)". Max 500 chars.',
        maxLength: 500,
      },
      quantum: {
        type: "integer",
        description:
          "Quantum level (0 = 8-bit / 256 elements, 1 = 16-bit / 65536 elements). Default: 0.",
        minimum: 0,
        maximum: 3,
        default: 0,
      },
    },
    required: ["term"],
  },
  handler: async (args: Record<string, unknown>) => {
    const term = String(args.term ?? "").slice(0, 500);
    const quantum = Number(args.quantum ?? 0);
    const n = 8 * (quantum + 1);

    const data = await callUorApi("GET", "/tools/derive", {
      term,
      n: String(n),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },
});

// ── Tool 2: uor_verify ─────────────────────────────────────────────────────

mcpServer.tool({
  name: "uor_verify",
  description:
    "Re-derive and verify a previous computation by its derivation ID. Returns verification status, certificate chain, and trace IRI. Use this to confirm that a prior result is still algebraically valid.",
  inputSchema: {
    type: "object" as const,
    properties: {
      derivation_id: {
        type: "string",
        description:
          'SHA-256 derivation ID, e.g. "urn:uor:derivation:sha256:abc123...".',
        maxLength: 200,
      },
    },
    required: ["derivation_id"],
  },
  handler: async (args: Record<string, unknown>) => {
    const derivation_id = String(args.derivation_id ?? "").slice(0, 200);

    const data = await callUorApi("GET", "/tools/verify", {
      id: derivation_id,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },
});

// ── Tool 3: uor_query ──────────────────────────────────────────────────────

mcpServer.tool({
  name: "uor_query",
  description:
    "Execute a SPARQL 1.1 query over the UOR knowledge graph. The graph contains all derived datums, their triad decompositions, partition classifications, and derivation records. Returns JSON results.",
  inputSchema: {
    type: "object" as const,
    properties: {
      sparql: {
        type: "string",
        description:
          'SPARQL 1.1 query string, e.g. "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10". Max 2000 chars.',
        maxLength: 2000,
      },
    },
    required: ["sparql"],
  },
  handler: async (args: Record<string, unknown>) => {
    const sparql = String(args.sparql ?? "").slice(0, 2000);

    const data = await callUorApi("POST", "/tools/query", undefined, {
      sparql,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },
});

// ── Tool 4: uor_correlate ──────────────────────────────────────────────────

mcpServer.tool({
  name: "uor_correlate",
  description:
    "Compute the algebraic correlation (Hamming fidelity) between two values in Z/(2^n)Z. Returns XOR distance, Hamming distance, fidelity score (0–1), and whether the values are algebraically identical.",
  inputSchema: {
    type: "object" as const,
    properties: {
      a: {
        type: "integer",
        description: "First value (0–255 for Q0, 0–65535 for Q1).",
        minimum: 0,
      },
      b: {
        type: "integer",
        description: "Second value (0–255 for Q0, 0–65535 for Q1).",
        minimum: 0,
      },
      quantum: {
        type: "integer",
        description: "Quantum level. Default: 0.",
        minimum: 0,
        maximum: 3,
        default: 0,
      },
    },
    required: ["a", "b"],
  },
  handler: async (args: Record<string, unknown>) => {
    const a = Number(args.a ?? 0);
    const b = Number(args.b ?? 0);
    const quantum = Number(args.quantum ?? 0);
    const n = 8 * (quantum + 1);

    const data = await callUorApi("GET", "/tools/correlate", {
      a: String(a),
      b: String(b),
      n: String(n),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },
});

// ── Tool 5: uor_partition ──────────────────────────────────────────────────

mcpServer.tool({
  name: "uor_partition",
  description:
    "Classify ring elements into the 4 algebraic partition sets: Units, Exterior, Irreducible, Reducible. Optionally verifies closure properties. Use to understand the algebraic structure of values in Z/(2^n)Z.",
  inputSchema: {
    type: "object" as const,
    properties: {
      seed_set: {
        type: "array",
        items: { type: "integer", minimum: 0, maximum: 65535 },
        description:
          "Array of seed values to classify, e.g. [0, 1, 2, 42, 255]. Max 256 elements.",
        maxItems: 256,
      },
      closure_mode: {
        type: "string",
        description:
          'Closure verification mode: "none", "oneStep", or "full". Default: "oneStep".',
        enum: ["none", "oneStep", "full"],
        default: "oneStep",
      },
      quantum: {
        type: "integer",
        description: "Quantum level. Default: 0.",
        minimum: 0,
        maximum: 3,
        default: 0,
      },
    },
    required: ["seed_set"],
  },
  handler: async (args: Record<string, unknown>) => {
    const seed_set = (args.seed_set as number[]) ?? [];
    const closure_mode = String(args.closure_mode ?? "oneStep");
    const quantum = Number(args.quantum ?? 0);
    const n = 8 * (quantum + 1);

    const data = await callUorApi("POST", "/tools/partition", undefined, {
      seed_set: seed_set.slice(0, 256),
      closure_mode,
      n,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  },
});

// ── Resources ───────────────────────────────────────────────────────────────

mcpServer.resource({
  uri: "uor://llms.md",
  name: "UOR Agent Quick Card",
  description:
    "What UOR is, what the 5 tools do, and how to use them — optimised for LLM consumption.",
  mimeType: "text/markdown",
  handler: async () => {
    const resp = await fetch("https://uor.foundation/llms.md");
    const text = await resp.text();
    return {
      contents: [{ uri: "uor://llms.md", mimeType: "text/markdown", text }],
    };
  },
});

mcpServer.resource({
  uri: "uor://openapi.json",
  name: "UOR OpenAPI Specification",
  description:
    "Full OpenAPI 3.1.0 specification for the UOR REST API — all endpoints, schemas, and examples.",
  mimeType: "application/json",
  handler: async () => {
    const resp = await fetch("https://uor.foundation/openapi.json");
    const text = await resp.text();
    return {
      contents: [
        { uri: "uor://openapi.json", mimeType: "application/json", text },
      ],
    };
  },
});

// ── HTTP Transport ──────────────────────────────────────────────────────────

const transport = new StreamableHttpTransport();
const app = new Hono();

// Health check at root
app.get("/", (c) =>
  c.json({
    name: "uor-mcp",
    version: "1.0.0",
    protocol: "MCP 2025-03-26",
    transport: "Streamable HTTP",
    tools: 5,
    resources: 2,
    connect: "/mcp",
  })
);

// MCP endpoint — all methods
app.all("/mcp", async (c) => {
  // Handle CORS preflight
  if (c.req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const response = await transport.handleRequest(c.req.raw, mcpServer);

  // Inject CORS headers into the response
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
});

// Fallback CORS preflight for any path
app.options("*", (c) => new Response(null, { headers: CORS_HEADERS }));

Deno.serve(app.fetch);
