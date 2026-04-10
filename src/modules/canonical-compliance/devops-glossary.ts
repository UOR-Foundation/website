/**
 * DevOps Glossary — Canonical Terminology Registry
 * ═════════════════════════════════════════════════════════════════
 *
 * Maps internal system terminology to industry-standard DevOps/CNCF
 * equivalents so experienced engineers can orient instantly.
 *
 * Consumed by:
 *   - devops-alignment-gate (verification)
 *   - System Monitor (tooltip labels)
 *   - Documentation generation
 *
 * @module canonical-compliance/devops-glossary
 */

export interface GlossaryEntry {
  /** Internal system term */
  readonly internal: string;
  /** Standard DevOps / industry term */
  readonly standard: string;
  /** Kubernetes equivalent (if any) */
  readonly k8s?: string;
  /** CNCF project equivalent (if any) */
  readonly cncf?: string;
  /** Brief explanation of the mapping */
  readonly note?: string;
}

export const DEVOPS_GLOSSARY: readonly GlossaryEntry[] = [
  {
    internal: "Sovereign Bus",
    standard: "Service Mesh / Message Bus",
    k8s: "kube-apiserver",
    cncf: "Istio / Linkerd / NATS",
    note: "Central API surface for all inter-module communication",
  },
  {
    internal: "AppKernel",
    standard: "Container Runtime + Sidecar Proxy",
    k8s: "containerd + envoy",
    cncf: "containerd / CRI-O",
    note: "Isolation boundary with permission enforcement and rate limiting",
  },
  {
    internal: "Reconciler",
    standard: "Reconciliation Controller",
    k8s: "kube-controller-manager",
    cncf: "Kubernetes",
    note: "Continuous desired-state ↔ actual-state diff loop",
  },
  {
    internal: "AppBlueprint",
    standard: "Deployment Manifest",
    k8s: "Deployment / Pod spec",
    cncf: "Helm chart",
    note: "Declarative JSON-LD application identity and resource spec",
  },
  {
    internal: "Sovereign Boot",
    standard: "Init System",
    k8s: "kubelet bootstrap",
    cncf: "systemd",
    note: "Deterministic module initialization sequence",
  },
  {
    internal: "UorContainer",
    standard: "Container",
    k8s: "Pod / Container",
    cncf: "containerd / CRI-O",
    note: "Content-addressed runtime instance bridging build artifacts to execution",
  },
  {
    internal: "UOR Seal",
    standard: "Integrity Attestation",
    k8s: "Admission Webhook",
    cncf: "Sigstore / cosign",
    note: "Cryptographic proof of artifact provenance and integrity",
  },
  {
    internal: "Connectivity Probes",
    standard: "Liveness / Readiness Probes",
    k8s: "livenessProbe / readinessProbe",
    note: "Periodic health checks for service availability",
  },
  {
    internal: "ComposeEvent",
    standard: "Cluster Event",
    k8s: "kubectl get events",
    note: "Lifecycle and state-change events emitted by the compose engine",
  },
  {
    internal: "Error Budget",
    standard: "SLO Error Budget",
    cncf: "OpenSLO",
    note: "Allowable failure margin before remediation triggers",
  },
  {
    internal: "Bus Manifest",
    standard: "Service Registry",
    k8s: "Endpoints / Services",
    cncf: "CoreDNS / etcd",
    note: "Registry of all operations available on the bus",
  },
  {
    internal: "DHT",
    standard: "Service Discovery",
    k8s: "kube-dns",
    cncf: "CoreDNS",
    note: "Distributed hash table for content-addressed name resolution",
  },
  {
    internal: "Conduit",
    standard: "mTLS Tunnel",
    cncf: "SPIFFE / SPIRE",
    note: "Encrypted session channel between participants",
  },
  {
    internal: "Shield",
    standard: "Runtime Security",
    k8s: "PodSecurityPolicy",
    cncf: "Falco / OPA",
    note: "Static and runtime security analysis layer",
  },
  {
    internal: "Orchestrator",
    standard: "Scheduler + Kubelet",
    k8s: "kube-scheduler + kubelet",
    cncf: "Kubernetes",
    note: "Application lifecycle management with placement and health monitoring",
  },
  {
    internal: "Auto-Scaler",
    standard: "Horizontal Pod Autoscaler",
    k8s: "HPA",
    cncf: "KEDA",
    note: "Metric-driven replica scaling",
  },
  {
    internal: "Rolling Update",
    standard: "Rolling Deployment",
    k8s: "Deployment strategy: RollingUpdate",
    note: "Zero-downtime version transitions with health gates",
  },
  {
    internal: "Static Blueprints",
    standard: "Infrastructure as Code",
    k8s: "ConfigMap / kustomize",
    cncf: "Crossplane / Cloud Custodian",
    note: "Declarative configuration enforced by reconciler",
  },
] as const;

/** Look up the standard DevOps term for an internal concept. */
export function lookupStandard(internalTerm: string): GlossaryEntry | undefined {
  return DEVOPS_GLOSSARY.find(
    (e) => e.internal.toLowerCase() === internalTerm.toLowerCase(),
  );
}

/** Get all glossary entries as a formatted markdown table. */
export function glossaryToMarkdown(): string {
  const lines = [
    "| Internal Term | Standard DevOps | K8s Equivalent | CNCF Project |",
    "|---|---|---|---|",
  ];
  for (const e of DEVOPS_GLOSSARY) {
    lines.push(
      `| ${e.internal} | ${e.standard} | ${e.k8s ?? "—"} | ${e.cncf ?? "—"} |`,
    );
  }
  return lines.join("\n");
}
