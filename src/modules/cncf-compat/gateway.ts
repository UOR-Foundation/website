/**
 * CNCF Compatibility — API Gateway / Ingress.
 * ═════════════════════════════════════════════════════════════════
 *
 * Maps external HTTP paths to internal Sovereign Bus operations.
 * Equivalent to Envoy / Emissary-Ingress / Kubernetes Ingress.
 *
 * Uses kernel::morphism::Morphism to translate external requests
 * into internal bus operations.
 *
 * @version 1.0.0
 */

import type { GatewayConfig, IngressRoute } from "./types";

/** In-memory gateway registry. */
const _gateways = new Map<string, GatewayConfig>();

/**
 * Create a gateway configuration.
 */
export function createGateway(
  name: string,
  routes: IngressRoute[],
  tls?: GatewayConfig["tls"],
): GatewayConfig {
  const config: GatewayConfig = {
    "@type": "uor:Gateway",
    name,
    routes,
    tls,
  };
  _gateways.set(name, config);
  return config;
}

/**
 * Resolve an incoming request to a bus target.
 */
export function resolveRoute(
  gatewayName: string,
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
): IngressRoute | null {
  const gw = _gateways.get(gatewayName);
  if (!gw) return null;

  return (
    gw.routes.find(
      (r) =>
        path.startsWith(r.path) &&
        r.methods.includes(method),
    ) ?? null
  );
}

/**
 * List all registered gateways.
 */
export function listGateways(): GatewayConfig[] {
  return Array.from(_gateways.values());
}

/**
 * Remove a gateway.
 */
export function removeGateway(name: string): boolean {
  return _gateways.delete(name);
}

/**
 * Clear all gateways (testing/reset).
 */
export function clearGateways(): void {
  _gateways.clear();
}
