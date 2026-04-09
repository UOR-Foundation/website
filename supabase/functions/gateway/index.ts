/**
 * Sovereign Gateway — Unified JSON-RPC 2.0 Edge Function.
 * ═════════════════════════════════════════════════════════════════
 *
 * Single entry point for all remote bus calls.
 * Replaces scattered edge functions with one canonical gateway.
 *
 * POST /gateway
 * Body: JSON-RPC 2.0 request (single or batch array)
 *
 * Dispatches to: oracle, store, scrape, audio, wolfram, social
 *
 * @version 1.0.0
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── JSON-RPC 2.0 Types ───────────────────────────────────────────────────

interface RpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

interface RpcSuccess {
  jsonrpc: "2.0";
  id: string | number;
  result: unknown;
}

interface RpcError {
  jsonrpc: "2.0";
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
}

type RpcResponse = RpcSuccess | RpcError;

const ERRORS = {
  PARSE_ERROR:      { code: -32700, message: "Parse error" },
  INVALID_REQUEST:  { code: -32600, message: "Invalid request" },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found" },
  INVALID_PARAMS:   { code: -32602, message: "Invalid params" },
  INTERNAL_ERROR:   { code: -32603, message: "Internal error" },
  UNAUTHORIZED:     { code: -32001, message: "Unauthorized" },
};

function success(id: string | number, result: unknown): RpcSuccess {
  return { jsonrpc: "2.0", id, result: { data: result, source: "remote", elapsed: 0 } };
}

function error(id: string | number | null, err: { code: number; message: string }, data?: unknown): RpcError {
  return { jsonrpc: "2.0", id, error: { ...err, data } };
}

// ── Auth Helper ───────────────────────────────────────────────────────────

function getSupabaseClient(authHeader?: string | null) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined,
  );
}

async function getUser(authHeader?: string | null) {
  if (!authHeader) return null;
  const supabase = getSupabaseClient(authHeader);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── Remote Handlers ───────────────────────────────────────────────────────

type Handler = (params: any, userId?: string | null) => Promise<unknown>;

const HANDLERS: Record<string, Record<string, Handler>> = {
  oracle: {
    ask: async (params) => {
      // Forward to existing uor-oracle edge function
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/uor-oracle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: params?.query }],
            model: params?.model ?? "google/gemini-2.5-flash",
            conversationId: params?.conversationId,
          }),
        },
      );
      if (!resp.ok) {
        throw new Error(`Oracle upstream error: ${resp.status}`);
      }
      return resp.json();
    },
  },

  store: {
    write: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/inscribe-ipfs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            content: params?.content,
            contentType: params?.contentType ?? "application/json",
          }),
        },
      );
      if (!resp.ok) throw new Error(`Store write error: ${resp.status}`);
      return resp.json();
    },
    read: async (params) => {
      const cid = params?.cid ?? params?.uorAddress;
      if (!cid) throw new Error("Provide cid or uorAddress");
      const gatewayUrl = Deno.env.get("PINATA_GATEWAY_URL");
      const gatewayToken = Deno.env.get("PINATA_GATEWAY_TOKEN");
      const url = `${gatewayUrl}/ipfs/${cid}?pinataGatewayToken=${gatewayToken}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Store read error: ${resp.status}`);
      return resp.json().catch(() => resp.text());
    },
  },

  scrape: {
    url: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/firecrawl-scrape`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            url: params?.url,
            options: {
              formats: params?.formats ?? ["markdown"],
              onlyMainContent: params?.onlyMainContent ?? true,
            },
          }),
        },
      );
      if (!resp.ok) throw new Error(`Scrape error: ${resp.status}`);
      return resp.json();
    },
    search: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/firecrawl-scrape`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "search",
            query: params?.query,
            limit: params?.limit ?? 8,
          }),
        },
      );
      if (!resp.ok) throw new Error(`Search error: ${resp.status}`);
      return resp.json();
    },
  },

  wolfram: {
    compute: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/wolfram-compute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ input: params?.input, format: params?.format }),
        },
      );
      if (!resp.ok) throw new Error(`Wolfram error: ${resp.status}`);
      return resp.json();
    },
  },

  audio: {
    tts: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ text: params?.text, voice: params?.voice }),
        },
      );
      if (!resp.ok) throw new Error(`Audio TTS error: ${resp.status}`);
      return resp.json();
    },
    transcribe: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/audio-transcribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ audio: params?.audio, format: params?.format }),
        },
      );
      if (!resp.ok) throw new Error(`Audio transcribe error: ${resp.status}`);
      return resp.json();
    },
    stream: async (params) => {
      return { error: "audio/stream requires WebSocket — use direct edge function", method: "audio/stream" };
    },
  },

  social: {
    send: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ to: params?.to, message: params?.message, platform: params?.platform }),
        },
      );
      if (!resp.ok) throw new Error(`Social send error: ${resp.status}`);
      return resp.json();
    },
    webhook: async (params) => {
      return { received: true, platform: params?.platform, timestamp: new Date().toISOString() };
    },
  },

  continuity: {
    save: async (params, userId) => {
      if (!userId) throw new Error("continuity/save requires authentication");
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/continuity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ action: "save", userId, state: params?.state }),
        },
      );
      if (!resp.ok) throw new Error(`Continuity save error: ${resp.status}`);
      return resp.json();
    },
    restore: async (params, userId) => {
      if (!userId) throw new Error("continuity/restore requires authentication");
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/continuity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ action: "restore", userId, sessionId: params?.sessionId }),
        },
      );
      if (!resp.ok) throw new Error(`Continuity restore error: ${resp.status}`);
      return resp.json();
    },
    chain: async (params, userId) => {
      if (!userId) throw new Error("continuity/chain requires authentication");
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/continuity`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ action: "chain", userId, parentId: params?.parentId, state: params?.state }),
        },
      );
      if (!resp.ok) throw new Error(`Continuity chain error: ${resp.status}`);
      return resp.json();
    },
  },

  mcp: {
    connect: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/uor-mcp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ action: "connect", serverUrl: params?.serverUrl }),
        },
      );
      if (!resp.ok) throw new Error(`MCP connect error: ${resp.status}`);
      return resp.json();
    },
    call: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/uor-mcp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ action: "call", tool: params?.tool, args: params?.args }),
        },
      );
      if (!resp.ok) throw new Error(`MCP call error: ${resp.status}`);
      return resp.json();
    },
    discover: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/uor-mcp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ action: "discover", serverUrl: params?.serverUrl }),
        },
      );
      if (!resp.ok) throw new Error(`MCP discover error: ${resp.status}`);
      return resp.json();
    },
  },

  sparql: {
    query: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/sparql-query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ query: params?.query }),
        },
      );
      if (!resp.ok) throw new Error(`SPARQL query error: ${resp.status}`);
      return resp.json();
    },
    update: async (params) => {
      const resp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/sparql-query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ query: params?.query, update: true }),
        },
      );
      if (!resp.ok) throw new Error(`SPARQL update error: ${resp.status}`);
      return resp.json();
    },
  },
};

// ── Dispatch ──────────────────────────────────────────────────────────────

async function dispatch(req: RpcRequest, userId?: string | null): Promise<RpcResponse> {
  const start = performance.now();
  const [ns, op] = req.method.split("/", 2);

  if (!ns || !op) {
    return error(req.id, ERRORS.INVALID_REQUEST, `Method must be "ns/op", got: ${req.method}`);
  }

  const nsHandlers = HANDLERS[ns];
  if (!nsHandlers) {
    return error(req.id, ERRORS.METHOD_NOT_FOUND, `Unknown namespace: ${ns}`);
  }

  const handler = nsHandlers[op];
  if (!handler) {
    return error(
      req.id,
      ERRORS.METHOD_NOT_FOUND,
      `Unknown operation: ${op} in namespace ${ns}. Available: ${Object.keys(nsHandlers).join(", ")}`,
    );
  }

  try {
    const result = await handler(req.params, userId);
    const elapsed = performance.now() - start;
    return {
      jsonrpc: "2.0",
      id: req.id,
      result: { data: result, source: "remote", elapsed: Math.round(elapsed) },
    };
  } catch (err) {
    return error(req.id, ERRORS.INTERNAL_ERROR, err instanceof Error ? err.message : String(err));
  }
}

// ── Introspection ─────────────────────────────────────────────────────────

function discover(): RpcSuccess {
  const modules = Object.entries(HANDLERS).map(([ns, ops]) => ({
    ns,
    methods: Object.keys(ops).map((op) => `${ns}/${op}`),
  }));
  return {
    jsonrpc: "2.0",
    id: 0,
    result: {
      data: {
        version: "1.0.0",
        protocol: "JSON-RPC 2.0",
        gateway: true,
        modules,
        totalMethods: modules.reduce((sum, m) => sum + m.methods.length, 0),
      },
      source: "remote",
      elapsed: 0,
    },
  };
}

// ── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify(error(null, ERRORS.INVALID_REQUEST, "Only POST allowed")),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify(error(null, ERRORS.PARSE_ERROR)),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Auth (optional — some methods may not require it)
  const authHeader = req.headers.get("Authorization");
  const user = await getUser(authHeader).catch(() => null);
  const userId = user?.id ?? null;

  // Introspection shortcut
  if (!Array.isArray(body) && (body as any)?.method === "rpc/discover") {
    return new Response(
      JSON.stringify(discover()),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Batch or single
  if (Array.isArray(body)) {
    const results = await Promise.all(
      body.map((r: RpcRequest) => dispatch(r, userId)),
    );
    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Validate single request
  const rpcReq = body as RpcRequest;
  if (!rpcReq.jsonrpc || rpcReq.jsonrpc !== "2.0" || !rpcReq.method) {
    return new Response(
      JSON.stringify(error(rpcReq?.id ?? null, ERRORS.INVALID_REQUEST)),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const result = await dispatch(rpcReq, userId);
  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
