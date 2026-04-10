/**
 * Service Mesh — External Client.
 * @ontology uor:ServiceMesh
 * ═════════════════════════════════════════════════════════════════
 *
 * For external consumers (CLI, agents, other apps) that call the
 * Service Mesh API over HTTP. Constructs JSON-RPC 2.0 requests and
 * sends them to the unified gateway edge function.
 *
 * @version 1.0.0
 */

import type { RpcRequest, RpcResponse, SovereignResult, RpcError } from "./types";

export interface SovereignClientConfig {
  /** Full URL of the gateway endpoint */
  gatewayUrl: string;
  /** Optional auth token (Bearer) */
  authToken?: string;
  /** Optional API key (sent as `apikey` header) */
  apiKey?: string;
}

let _clientId = 1;

/**
 * Create an external sovereign API client.
 *
 * @example
 * const api = createSovereignClient({
 *   gatewayUrl: "https://xxx.supabase.co/functions/v1/gateway",
 *   authToken: "eyJ...",
 * });
 *
 * const result = await api.call("graph/query", { sparql: "..." });
 */
export function createSovereignClient(config: SovereignClientConfig) {
  async function call<T = unknown>(
    method: string,
    params?: unknown,
  ): Promise<SovereignResult<T>> {
    const id = _clientId++;
    const req: RpcRequest = { jsonrpc: "2.0", id, method, params };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) headers["apikey"] = config.apiKey;
    if (config.authToken) headers["Authorization"] = `Bearer ${config.authToken}`;

    const resp = await fetch(config.gatewayUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
    });

    if (!resp.ok) {
      throw new Error(`Gateway HTTP ${resp.status}: ${await resp.text()}`);
    }

    const body: RpcResponse<SovereignResult<T>> = await resp.json();

    if ("error" in body) {
      const err = body as RpcError;
      throw Object.assign(new Error(err.error.message), {
        code: err.error.code,
        data: err.error.data,
      });
    }

    return body.result;
  }

  async function batch(
    calls: Array<{ method: string; params?: unknown }>,
  ): Promise<Array<RpcResponse<SovereignResult<unknown>>>> {
    const reqs: RpcRequest[] = calls.map(({ method, params }) => ({
      jsonrpc: "2.0" as const,
      id: _clientId++,
      method,
      params,
    }));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) headers["apikey"] = config.apiKey;
    if (config.authToken) headers["Authorization"] = `Bearer ${config.authToken}`;

    const resp = await fetch(config.gatewayUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(reqs),
    });

    if (!resp.ok) {
      throw new Error(`Gateway HTTP ${resp.status}: ${await resp.text()}`);
    }

    return resp.json();
  }

  return { call, batch };
}
