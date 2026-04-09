/**
 * Sovereign Bus — Self-Describing API (Introspection).
 * ═════════════════════════════════════════════════════════════════
 *
 * bus.call("rpc/discover") returns the full method catalog.
 * Enables auto-generated docs, CLI completion, and agent discovery.
 *
 * @version 1.0.0
 */

import { register, listModules, allDescriptors } from "./registry";

export interface MethodInfo {
  method: string;
  description?: string;
  remote: boolean;
  paramsSchema?: Record<string, unknown>;
}

export interface DiscoverResult {
  version: string;
  protocol: "JSON-RPC 2.0";
  modules: Array<{
    ns: string;
    label: string;
    methods: MethodInfo[];
  }>;
  totalMethods: number;
}

function handleDiscover(): DiscoverResult {
  const mods = listModules();
  const descriptors = allDescriptors();
  let total = 0;

  const modules = mods.map((mod) => {
    const methods: MethodInfo[] = Object.entries(mod.operations).map(
      ([opName, desc]) => {
        total++;
        return {
          method: `${mod.ns}/${opName}`,
          description: desc.description,
          remote: desc.remote ?? mod.defaultRemote ?? false,
          paramsSchema: desc.paramsSchema,
        };
      },
    );
    return { ns: mod.ns, label: mod.label, methods };
  });

  return {
    version: "1.0.0",
    protocol: "JSON-RPC 2.0",
    modules,
    totalMethods: total,
  };
}

function handleListMethods(): string[] {
  return Array.from(allDescriptors().keys());
}

/** Register the rpc namespace for introspection */
export function registerIntrospect(): void {
  register({
    ns: "rpc",
    label: "RPC Introspection",
    operations: {
      discover: {
        handler: async () => handleDiscover(),
        description: "Returns the full method catalog with schemas and metadata",
      },
      methods: {
        handler: async () => handleListMethods(),
        description: "Returns a flat list of all registered method names",
      },
      ping: {
        handler: async () => ({ pong: true, timestamp: Date.now() }),
        description: "Health check — returns immediately",
      },
    },
  });
}
