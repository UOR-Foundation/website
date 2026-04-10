/**
 * CNCF Compatibility — Category Registry.
 * ═════════════════════════════════════════════════════════════════
 *
 * Maps every CNCF landscape category to its UOR equivalent modules.
 * This is the canonical reference for CNCF ↔ UOR interoperability.
 *
 * @version 1.0.0
 */

import type { CncfCategoryDescriptor } from "./types";

/**
 * CNCF_CATEGORIES — complete mapping of CNCF landscape categories
 * to UOR modules, with maturity status.
 */
export const CNCF_CATEGORIES: CncfCategoryDescriptor[] = [
  {
    category: "Container Runtime",
    description: "Run containers with content-addressed isolation and lifecycle management",
    uorModules: ["uns/build/container", "compose/app-kernel"],
    cncfProjects: ["containerd", "CRI-O", "Lima"],
    uorMaturity: "complete",
    iconKey: "Box",
  },
  {
    category: "Scheduling & Orchestration",
    description: "Declarative desired-state reconciliation with auto-scaling and rolling updates",
    uorModules: ["compose/orchestrator", "compose/reconciler", "compose/auto-scaler", "compose/rolling-update"],
    cncfProjects: ["Kubernetes", "KEDA", "Knative", "Crossplane", "Volcano", "Karmada", "Kubeflow", "Fluid"],
    uorMaturity: "complete",
    iconKey: "Workflow",
  },
  {
    category: "Coordination & Service Discovery",
    description: "Distributed hash table and name resolution for service discovery",
    uorModules: ["uns/core/dht", "uns/core/resolver"],
    cncfProjects: ["CoreDNS", "etcd"],
    uorMaturity: "complete",
    iconKey: "Radar",
  },
  {
    category: "Cloud Native Network",
    description: "Content-addressed networking with IPv6 overlay",
    uorModules: ["uns/core/address", "uns/core/ipv6"],
    cncfProjects: ["Cilium", "CNI"],
    uorMaturity: "complete",
    iconKey: "Network",
  },
  {
    category: "Streaming & Messaging",
    description: "Sovereign Bus message routing with CloudEvents envelope support",
    uorModules: ["bus/registry", "cncf-compat/cloudevents"],
    cncfProjects: ["CloudEvents", "NATS", "Strimzi"],
    uorMaturity: "partial",
    iconKey: "Radio",
  },
  {
    category: "Service Proxy",
    description: "Bus-level request routing with rate limiting and permission enforcement",
    uorModules: ["compose/app-kernel", "bus/registry"],
    cncfProjects: ["Envoy", "Contour"],
    uorMaturity: "complete",
    iconKey: "ArrowLeftRight",
  },
  {
    category: "Cloud Native Storage",
    description: "Content-addressed key-value and object storage",
    uorModules: ["uns/store", "uns/ledger"],
    cncfProjects: ["CubeFS", "Rook", "Longhorn"],
    uorMaturity: "complete",
    iconKey: "HardDrive",
  },
  {
    category: "Application Definition & Image Build",
    description: "Uorfile parser and content-addressed image builder (Dockerfile superset)",
    uorModules: ["uns/build/uorfile", "uns/build/docker-compat"],
    cncfProjects: ["Helm", "Dapr", "Buildpacks", "Artifact Hub", "Backstage", "KubeVela", "KubeVirt", "Operator Framework"],
    uorMaturity: "complete",
    iconKey: "FileCode",
  },
  {
    category: "Container Registry",
    description: "Content-addressed image registry with push, pull, tag, and history",
    uorModules: ["uns/build/registry"],
    cncfProjects: ["Harbor", "Dragonfly"],
    uorMaturity: "complete",
    iconKey: "Archive",
  },
  {
    category: "Security & Compliance",
    description: "Certificate authority, shield analysis, trust graph, and policy enforcement",
    uorModules: ["uns/trust", "uns/shield", "certificate"],
    cncfProjects: ["cert-manager", "Falco", "in-toto", "OPA", "Kyverno", "TUF", "Keycloak", "Kubescape", "Notary Project", "OpenFGA"],
    uorMaturity: "complete",
    iconKey: "ShieldCheck",
  },
  {
    category: "Key Management",
    description: "Post-quantum cryptographic key generation with Dilithium-3 and trust graph",
    uorModules: ["uns/core/keypair", "uns/trust/auth"],
    cncfProjects: ["SPIFFE", "SPIRE"],
    uorMaturity: "complete",
    iconKey: "Key",
  },
  {
    category: "Observability",
    description: "System event bus, stream projection, and telemetry with OTLP export",
    uorModules: ["observable/system-event-bus", "observable/stream-projection", "cncf-compat/otlp"],
    cncfProjects: ["Prometheus", "Jaeger", "OpenTelemetry", "Fluentd", "Cortex", "Thanos"],
    uorMaturity: "partial",
    iconKey: "Activity",
  },
  {
    category: "Continuous Integration & Delivery",
    description: "Pipeline spec with cascaded build/test/deploy stages",
    uorModules: ["cncf-compat/pipeline"],
    cncfProjects: ["Argo", "Flux", "OpenKruise"],
    uorMaturity: "partial",
    iconKey: "GitBranch",
  },
  {
    category: "Automation & Configuration",
    description: "Blueprint-driven declarative configuration with reconciler enforcement",
    uorModules: ["compose/static-blueprints", "compose/reconciler"],
    cncfProjects: ["KubeEdge", "Cloud Custodian", "metal3-io", "OpenYurt"],
    uorMaturity: "complete",
    iconKey: "Settings",
  },
  {
    category: "Service Mesh",
    description: "Sovereign Bus with per-app kernel isolation and permission enforcement",
    uorModules: ["bus/registry", "compose/app-kernel"],
    cncfProjects: ["Istio", "Linkerd"],
    uorMaturity: "complete",
    iconKey: "Globe",
  },
  {
    category: "Database",
    description: "Verifiable SQL ledger and content-addressed KV store",
    uorModules: ["uns/ledger", "uns/store"],
    cncfProjects: ["TiKV", "Vitess"],
    uorMaturity: "complete",
    iconKey: "Database",
  },
  {
    category: "Chaos Engineering",
    description: "Fault injection into reconciler for resilience testing",
    uorModules: ["cncf-compat/chaos"],
    cncfProjects: ["Chaos Mesh", "Litmus"],
    uorMaturity: "planned",
    iconKey: "Zap",
  },
  {
    category: "API Gateway",
    description: "Ingress routing table mapping external HTTP to bus operations",
    uorModules: ["cncf-compat/gateway"],
    cncfProjects: ["Emissary-Ingress"],
    uorMaturity: "planned",
    iconKey: "Router",
  },
  {
    category: "Remote Procedure Call",
    description: "Bus-native RPC with content-addressed envelopes",
    uorModules: ["bus/registry"],
    cncfProjects: ["gRPC"],
    uorMaturity: "partial",
    iconKey: "Plug",
  },
  {
    category: "ML Serving",
    description: "Model serving via compute functions with content-addressed weights",
    uorModules: ["uns/compute"],
    cncfProjects: ["KServe"],
    uorMaturity: "planned",
    iconKey: "Brain",
  },
  {
    category: "Continuous Optimization",
    description: "Auto-scaler metric-driven resource optimization",
    uorModules: ["compose/auto-scaler"],
    cncfProjects: ["OpenCost"],
    uorMaturity: "partial",
    iconKey: "TrendingUp",
  },
  {
    category: "Feature Flagging",
    description: "Dynamic feature gates via blueprint configuration",
    uorModules: ["compose/static-blueprints"],
    cncfProjects: ["OpenFeature"],
    uorMaturity: "planned",
    iconKey: "ToggleRight",
  },
  {
    category: "System Audit",
    description: "Canonical compliance audit tracing every module export to UOR atomic primitives",
    uorModules: ["canonical-compliance"],
    cncfProjects: ["OPA", "Falco"],
    uorMaturity: "complete",
    iconKey: "ShieldCheck",
  },
];

/** Lookup a CNCF category descriptor by name. */
export function getCncfCategory(name: string): CncfCategoryDescriptor | undefined {
  return CNCF_CATEGORIES.find((c) => c.category === name);
}

/** Get categories by maturity status. */
export function getCncfCategoriesByMaturity(
  maturity: CncfCategoryDescriptor["uorMaturity"],
): CncfCategoryDescriptor[] {
  return CNCF_CATEGORIES.filter((c) => c.uorMaturity === maturity);
}
