/**
 * Sovereign Bus — Core Dispatcher.
 * ═════════════════════════════════════════════════════════════════
 *
 * Single entry point for the entire system.
 *
 *   bus.call("kernel/derive", payload)  →  SovereignResult
 *   bus.batch([...requests])            →  RpcResponse[]
 *
 * Local-first: if the method is registered as local, it never
 * leaves the device. Remote methods forward to the unified gateway.
 *
 * JSON-RPC 2.0 compliant.
 *
 * @version 1.0.0
 */

import type {
  RpcRequest,
  RpcResponse,
  RpcSuccess,
  RpcError,
  SovereignResult,
  BusContext,
} from "./types";
import { RPC_ERRORS } from "./types";
import { resolve, has, getMiddleware } from "./registry";

// ── ID Generator ──────────────────────────────────────────────────────────

let _nextId = 1;
function nextId(): number {
  return _nextId++;
}

// ── Remote Gateway ────────────────────────────────────────────────────────

function getGatewayUrl(): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (url) return `${url}/functions/v1/gateway`;
    throw new Error("[bus] No VITE_SUPABASE_PROJECT_ID or VITE_SUPABASE_URL configured");
  }
  return `https://${projectId}.supabase.co/functions/v1/gateway`;
}

async function callRemote<T>(req: RpcRequest): Promise<RpcResponse<SovereignResult<T>>> {
  const start = performance.now();
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const resp = await fetch(getGatewayUrl(), {
      method: "POST",
      headers,
      body: JSON.stringify(req),
    });

    if (!resp.ok) {
      return {
        jsonrpc: "2.0",
        id: req.id,
        error: {
          code: RPC_ERRORS.GATEWAY_ERROR.code,
          message: `Gateway HTTP ${resp.status}`,
          data: await resp.text().catch(() => null),
        },
      };
    }

    const body = await resp.json();
    // Gateway returns JSON-RPC envelope directly
    if (body.jsonrpc === "2.0") return body;

    // Legacy gateway that returns raw data
    return {
      jsonrpc: "2.0",
      id: req.id,
      result: {
        data: body.data ?? body,
        source: "remote" as const,
        elapsed: performance.now() - start,
      },
    };
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id: req.id,
      error: {
        code: RPC_ERRORS.GATEWAY_ERROR.code,
        message: err instanceof Error ? err.message : "Unknown gateway error",
      },
    };
  }
}

// ── Core Dispatcher ───────────────────────────────────────────────────────

/**
 * Call a method on the Sovereign Bus.
 *
 * @example
 * const result = await bus.call<MyResult>("kernel/derive", { content: "..." });
 * if (result.source === "local") { ... }
 */
export async function call<T = unknown>(
  method: string,
  params?: unknown,
): Promise<SovereignResult<T>> {
  const id = nextId();
  const req: RpcRequest = { jsonrpc: "2.0", id, method, params };

  const descriptor = resolve(method);
  if (!descriptor) {
    throw Object.assign(
      new Error(`[bus] Method not found: "${method}"`),
      { code: RPC_ERRORS.METHOD_NOT_FOUND.code },
    );
  }

  // Remote methods
  if (descriptor.remote) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw Object.assign(
        new Error(`[bus] Offline — "${method}" requires network`),
        { code: RPC_ERRORS.OFFLINE.code },
      );
    }
    const resp = await callRemote<T>(req);
    if ("error" in resp) {
      throw Object.assign(new Error(resp.error.message), {
        code: resp.error.code,
        data: resp.error.data,
      });
    }
    return resp.result;
  }

  // Local dispatch with middleware
  const [ns, op] = method.split("/", 2);
  const ctx: BusContext = {
    method,
    ns,
    op,
    params,
    startTime: performance.now(),
    meta: {},
  };

  const mws = getMiddleware();
  let result: unknown;

  // Build middleware chain
  const execute = async (): Promise<unknown> => {
    return descriptor.handler(params);
  };

  if (mws.length === 0) {
    result = await execute();
  } else {
    let idx = 0;
    const next = async (): Promise<unknown> => {
      if (idx < mws.length) {
        const mw = mws[idx++];
        result = await mw(ctx, next);
        return result;
      }
      result = await execute();
      return result;
    };
    await next();
  }

  const elapsed = performance.now() - ctx.startTime;

  return {
    data: result as T,
    source: "local",
    elapsed,
    uorAddress: (result as any)?.uorAddress ?? (result as any)?.ipv6 ?? undefined,
  };
}

/**
 * Batch multiple calls (JSON-RPC 2.0 batch).
 * All calls execute concurrently.
 */
export async function batch(
  calls: Array<{ method: string; params?: unknown }>,
): Promise<Array<SovereignResult<unknown> | Error>> {
  return Promise.all(
    calls.map(({ method, params }) =>
      call(method, params).catch((err: Error) => err),
    ),
  );
}

/**
 * Check if a method is available on the bus.
 */
export { has as canCall };

/**
 * Check if a method is available and the device can reach it
 * (local methods are always reachable; remote requires online).
 */
export function isReachable(method: string): boolean {
  const desc = resolve(method);
  if (!desc) return false;
  if (!desc.remote) return true;
  return typeof navigator === "undefined" || navigator.onLine;
}
