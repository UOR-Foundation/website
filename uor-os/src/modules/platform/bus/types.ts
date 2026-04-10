/**
 * Service Mesh — JSON-RPC 2.0 Types.
 * @ontology uor:ServiceMesh
 * ═════════════════════════════════════════════════════════════════
 *
 * Canonical envelope for every system call. Follows the JSON-RPC 2.0
 * specification exactly (https://www.jsonrpc.org/specification).
 *
 * One input. One output. Local or remote — same shape.
 *
 * @version 1.0.0
 */

// ── JSON-RPC 2.0 Request ──────────────────────────────────────────────────

export interface RpcRequest<P = unknown> {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly method: string;
  readonly params?: P;
}

// ── JSON-RPC 2.0 Response ─────────────────────────────────────────────────

export interface RpcSuccess<T = unknown> {
  readonly jsonrpc: "2.0";
  readonly id: string | number;
  readonly result: T;
}

export interface RpcError {
  readonly jsonrpc: "2.0";
  readonly id: string | number | null;
  readonly error: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

export type RpcResponse<T = unknown> = RpcSuccess<T> | RpcError;

// ── Sovereign Envelope (extends JSON-RPC result with UOR metadata) ────────

export interface SovereignResult<T = unknown> {
  /** The actual return data */
  data: T;
  /** UOR IPv6 address if content was addressed */
  uorAddress?: string;
  /** Whether resolved locally or via remote gateway */
  source: "local" | "remote";
  /** Execution time in ms */
  elapsed: number;
}

// ── Standard JSON-RPC 2.0 Error Codes ─────────────────────────────────────

export const RPC_ERRORS = {
  PARSE_ERROR:      { code: -32700, message: "Parse error" },
  INVALID_REQUEST:  { code: -32600, message: "Invalid request" },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found" },
  INVALID_PARAMS:   { code: -32602, message: "Invalid params" },
  INTERNAL_ERROR:   { code: -32603, message: "Internal error" },
  /** Custom: method exists but requires network and device is offline */
  OFFLINE:          { code: -32000, message: "Offline — method requires network" },
  /** Custom: upstream remote gateway error */
  GATEWAY_ERROR:    { code: -32001, message: "Gateway error" },
} as const;

// ── Module Registration ───────────────────────────────────────────────────

export type BusHandler<P = unknown, R = unknown> = (params: P) => Promise<R>;

export interface OperationDescriptor {
  /** Handler function */
  handler: BusHandler;
  /** If true, must go through remote gateway */
  remote?: boolean;
  /** Human-readable description */
  description?: string;
  /** JSON Schema for params (optional, used by introspect) */
  paramsSchema?: Record<string, unknown>;
}

export interface ModuleRegistration {
  /** Namespace prefix (e.g., "kernel", "graph", "oracle") */
  ns: string;
  /** Human-readable label */
  label: string;
  /**
   * Architecture layer (0–3):
   *   0 = Engine (pure computation, zero deps)
   *   1 = Knowledge Graph (pluggable storage)
   *   2 = Bus / API surface
   *   3 = UX / UI
   */
  layer?: 0 | 1 | 2 | 3;
  /** Local or remote module */
  defaultRemote?: boolean;
  /** Operations map: opName → descriptor */
  operations: Record<string, OperationDescriptor>;
}

// ── Middleware ─────────────────────────────────────────────────────────────

export interface BusContext {
  method: string;
  ns: string;
  op: string;
  params: unknown;
  startTime: number;
  meta: Record<string, unknown>;
}

export type NextFn = () => Promise<unknown>;
export type Middleware = (ctx: BusContext, next: NextFn) => Promise<unknown>;
