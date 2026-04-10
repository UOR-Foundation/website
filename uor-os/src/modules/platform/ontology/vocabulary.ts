/**
 * Canonical Vocabulary — Single Source of Truth
 * ═════════════════════════════════════════════════════════════════
 *
 * Every system concept declared once as a W3C SKOS Concept with
 * audience-specific labels and CNCF/K8s/UOR mappings.
 *
 * This file is THE canonical registry. All other terminology sources
 * (devops-glossary, cncf-compat/categories, namespace-registry)
 * derive from or validate against this vocabulary.
 *
 * @module ontology/vocabulary
 */

import type { SkosConcept, SkosConceptScheme } from "./types";

// ── Concepts ─────────────────────────────────────────────────────────────

const CONCEPTS: readonly SkosConcept[] = [
  // ── Networking & Communication ─────────────────────────────────────
  {
    "@id": "uor:ServiceMesh",
    "@type": "skos:Concept",
    "skos:prefLabel": "Service Mesh",
    "skos:altLabel": ["Sovereign Bus", "Message Bus", "Event Bus"],
    "skos:definition": "Central API surface for all inter-module communication with routing, load balancing, and observability.",
    "skos:scopeNote": "Use when referring to the system-wide message transport layer.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:narrower": ["uor:ServiceRegistry", "uor:ServiceDiscovery"],
    "skos:exactMatch": ["https://kubernetes.io/docs/concepts/services-networking/"],
    "skos:closeMatch": ["https://schema.org/SoftwareApplication"],
    "uor:namespace": "bus/",
    "uor:cncfCategory": "Service Mesh",
    "uor:k8sEquivalent": "kube-apiserver",
    "uor:cncfProject": "Istio / Linkerd / NATS",
    "uor:profileLabels": {
      developer: "Service Mesh",
      user: "Message System",
      scientist: "Communication Graph",
    },
  },
  {
    "@id": "uor:ServiceRegistry",
    "@type": "skos:Concept",
    "skos:prefLabel": "Service Registry",
    "skos:altLabel": ["Bus Manifest", "Module Directory"],
    "skos:definition": "Registry of all operations and endpoints available on the service mesh.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:broader": "uor:ServiceMesh",
    "skos:exactMatch": ["https://kubernetes.io/docs/concepts/services-networking/service/"],
    "uor:namespace": "bus/",
    "uor:cncfCategory": "Coordination & Service Discovery",
    "uor:k8sEquivalent": "Endpoints / Services",
    "uor:cncfProject": "etcd / CoreDNS",
    "uor:profileLabels": {
      developer: "Service Registry",
      user: "Module Directory",
      scientist: "Endpoint Catalog",
    },
  },
  {
    "@id": "uor:ServiceDiscovery",
    "@type": "skos:Concept",
    "skos:prefLabel": "Service Discovery",
    "skos:altLabel": ["DHT", "Name Lookup"],
    "skos:definition": "Distributed hash table for content-addressed name resolution and service location.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:broader": "uor:ServiceMesh",
    "skos:closeMatch": ["https://schema.org/SearchAction"],
    "uor:namespace": "uns/core/",
    "uor:cncfCategory": "Coordination & Service Discovery",
    "uor:k8sEquivalent": "kube-dns",
    "uor:cncfProject": "CoreDNS",
    "uor:profileLabels": {
      developer: "Service Discovery",
      user: "Name Lookup",
      scientist: "Distributed Hash Resolution",
    },
  },
  {
    "@id": "uor:mTLSTunnel",
    "@type": "skos:Concept",
    "skos:prefLabel": "mTLS Tunnel",
    "skos:altLabel": ["Conduit", "Encrypted Channel"],
    "skos:definition": "Encrypted session channel between participants with mutual TLS authentication.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:related": ["uor:ServiceMesh"],
    "uor:cncfCategory": "Security & Compliance",
    "uor:cncfProject": "SPIFFE / SPIRE",
    "uor:profileLabels": {
      developer: "mTLS Tunnel",
      user: "Secure Channel",
      scientist: "Authenticated Transport",
    },
  },

  // ── Container Runtime ──────────────────────────────────────────────
  {
    "@id": "uor:ContainerRuntime",
    "@type": "skos:Concept",
    "skos:prefLabel": "Container Runtime",
    "skos:altLabel": ["AppKernel", "Sidecar Proxy", "App Engine"],
    "skos:definition": "Isolation boundary with permission enforcement, rate limiting, and resource management.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:narrower": ["uor:Container"],
    "skos:exactMatch": ["https://kubernetes.io/docs/concepts/containers/"],
    "skos:closeMatch": ["https://schema.org/SoftwareApplication"],
    "uor:namespace": "compose/",
    "uor:cncfCategory": "Container Runtime",
    "uor:k8sEquivalent": "containerd + envoy",
    "uor:cncfProject": "containerd / CRI-O",
    "uor:profileLabels": {
      developer: "Container Runtime",
      user: "App Engine",
      scientist: "Computation Substrate",
    },
  },
  {
    "@id": "uor:Container",
    "@type": "skos:Concept",
    "skos:prefLabel": "Container",
    "skos:altLabel": ["UorContainer", "App Instance"],
    "skos:definition": "Content-addressed runtime instance bridging build artifacts to execution.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:broader": "uor:ContainerRuntime",
    "skos:exactMatch": ["https://kubernetes.io/docs/concepts/containers/"],
    "uor:namespace": "uns/build/",
    "uor:cncfCategory": "Container Runtime",
    "uor:k8sEquivalent": "Pod / Container",
    "uor:cncfProject": "containerd / CRI-O",
    "uor:profileLabels": {
      developer: "Container",
      user: "App Instance",
      scientist: "Runtime Object",
    },
  },

  // ── Orchestration ──────────────────────────────────────────────────
  {
    "@id": "uor:Reconciler",
    "@type": "skos:Concept",
    "skos:prefLabel": "Reconciliation Controller",
    "skos:altLabel": ["Reconciler", "Sovereign Reconciler", "Auto-repair"],
    "skos:definition": "Continuous desired-state ↔ actual-state diff loop that converges system to declared intent.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:related": ["uor:DeploymentManifest"],
    "skos:exactMatch": ["https://kubernetes.io/docs/concepts/architecture/controller/"],
    "uor:namespace": "compose/",
    "uor:cncfCategory": "Scheduling & Orchestration",
    "uor:k8sEquivalent": "kube-controller-manager",
    "uor:cncfProject": "Kubernetes",
    "uor:profileLabels": {
      developer: "Reconciliation Controller",
      user: "Auto-repair",
      scientist: "Convergence Loop",
    },
  },
  {
    "@id": "uor:Scheduler",
    "@type": "skos:Concept",
    "skos:prefLabel": "Scheduler",
    "skos:altLabel": ["Orchestrator", "Placement Engine"],
    "skos:definition": "Application lifecycle management with placement decisions and health monitoring.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:related": ["uor:Reconciler", "uor:HPA"],
    "uor:namespace": "compose/",
    "uor:cncfCategory": "Scheduling & Orchestration",
    "uor:k8sEquivalent": "kube-scheduler + kubelet",
    "uor:cncfProject": "Kubernetes",
    "uor:profileLabels": {
      developer: "Scheduler",
      user: "Task Manager",
      scientist: "Placement Optimizer",
    },
  },
  {
    "@id": "uor:HPA",
    "@type": "skos:Concept",
    "skos:prefLabel": "Horizontal Pod Autoscaler",
    "skos:altLabel": ["Auto-Scaler", "HPA"],
    "skos:definition": "Metric-driven replica scaling that adjusts workload capacity based on observed load.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:related": ["uor:Scheduler"],
    "uor:namespace": "compose/",
    "uor:cncfCategory": "Scheduling & Orchestration",
    "uor:k8sEquivalent": "HPA",
    "uor:cncfProject": "KEDA",
    "uor:profileLabels": {
      developer: "Horizontal Pod Autoscaler",
      user: "Auto-scaler",
      scientist: "Capacity Controller",
    },
  },
  {
    "@id": "uor:RollingDeployment",
    "@type": "skos:Concept",
    "skos:prefLabel": "Rolling Deployment",
    "skos:altLabel": ["Rolling Update", "Zero-Downtime Deploy"],
    "skos:definition": "Zero-downtime version transitions with health gates between batches.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "compose/",
    "uor:cncfCategory": "Continuous Integration & Delivery",
    "uor:k8sEquivalent": "Deployment strategy: RollingUpdate",
    "uor:profileLabels": {
      developer: "Rolling Deployment",
      user: "Seamless Update",
      scientist: "Incremental Transition",
    },
  },

  // ── Configuration & Manifests ──────────────────────────────────────
  {
    "@id": "uor:DeploymentManifest",
    "@type": "skos:Concept",
    "skos:prefLabel": "Deployment Manifest",
    "skos:altLabel": ["AppBlueprint", "App Blueprint", "Pod Spec"],
    "skos:definition": "Declarative JSON-LD application identity, resource requirements, and desired state.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:related": ["uor:Reconciler"],
    "uor:namespace": "compose/",
    "uor:cncfCategory": "Application Definition & Image Build",
    "uor:k8sEquivalent": "Deployment / Pod spec",
    "uor:cncfProject": "Helm",
    "uor:profileLabels": {
      developer: "Deployment Manifest",
      user: "App Blueprint",
      scientist: "Declarative Specification",
    },
  },
  {
    "@id": "uor:IaC",
    "@type": "skos:Concept",
    "skos:prefLabel": "Infrastructure as Code",
    "skos:altLabel": ["Static Blueprints", "IaC", "Declarative Config"],
    "skos:definition": "Declarative configuration enforced by the reconciliation controller.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "compose/",
    "uor:cncfCategory": "Automation & Configuration",
    "uor:k8sEquivalent": "ConfigMap / kustomize",
    "uor:cncfProject": "Crossplane / Cloud Custodian",
    "uor:profileLabels": {
      developer: "Infrastructure as Code",
      user: "System Configuration",
      scientist: "Declarative State",
    },
  },

  // ── Lifecycle & Init ───────────────────────────────────────────────
  {
    "@id": "uor:InitSystem",
    "@type": "skos:Concept",
    "skos:prefLabel": "Init System",
    "skos:altLabel": ["Sovereign Boot", "Boot Sequence", "Bootstrap"],
    "skos:definition": "Deterministic module initialization sequence with dependency resolution.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "boot/",
    "uor:cncfCategory": "Container Runtime",
    "uor:k8sEquivalent": "kubelet bootstrap",
    "uor:cncfProject": "systemd",
    "uor:profileLabels": {
      developer: "Init System",
      user: "Boot Sequence",
      scientist: "Initialization DAG",
    },
  },

  // ── Observability ──────────────────────────────────────────────────
  {
    "@id": "uor:HealthProbe",
    "@type": "skos:Concept",
    "skos:prefLabel": "Liveness / Readiness Probe",
    "skos:altLabel": ["Connectivity Probes", "Health Check"],
    "skos:definition": "Periodic health checks for service availability and readiness.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:closeMatch": ["https://schema.org/CheckAction"],
    "uor:namespace": "observable/",
    "uor:cncfCategory": "Observability & Analysis",
    "uor:k8sEquivalent": "livenessProbe / readinessProbe",
    "uor:profileLabels": {
      developer: "Liveness / Readiness Probe",
      user: "Health Check",
      scientist: "Availability Sensor",
    },
  },
  {
    "@id": "uor:ClusterEvent",
    "@type": "skos:Concept",
    "skos:prefLabel": "Cluster Event",
    "skos:altLabel": ["ComposeEvent", "System Event"],
    "skos:definition": "Lifecycle and state-change events emitted by the orchestration engine.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "observable/",
    "uor:cncfCategory": "Observability & Analysis",
    "uor:k8sEquivalent": "kubectl get events",
    "uor:profileLabels": {
      developer: "Cluster Event",
      user: "System Event",
      scientist: "State Transition Event",
    },
  },
  {
    "@id": "uor:ErrorBudget",
    "@type": "skos:Concept",
    "skos:prefLabel": "SLO Error Budget",
    "skos:altLabel": ["Error Budget"],
    "skos:definition": "Allowable failure margin before automated remediation triggers.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:cncfCategory": "Observability & Analysis",
    "uor:cncfProject": "OpenSLO",
    "uor:profileLabels": {
      developer: "SLO Error Budget",
      user: "Reliability Margin",
      scientist: "Failure Tolerance Bound",
    },
  },

  // ── Security ───────────────────────────────────────────────────────
  {
    "@id": "uor:IntegrityAttestation",
    "@type": "skos:Concept",
    "skos:prefLabel": "Integrity Attestation",
    "skos:altLabel": ["UOR Seal", "Security Seal", "Provenance Proof"],
    "skos:definition": "Cryptographic proof of artifact provenance and integrity using content-addressed hashing.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "cert/",
    "uor:cncfCategory": "Security & Compliance",
    "uor:k8sEquivalent": "Admission Webhook",
    "uor:cncfProject": "Sigstore / cosign",
    "uor:profileLabels": {
      developer: "Integrity Attestation",
      user: "Security Seal",
      scientist: "Cryptographic Witness",
    },
  },
  {
    "@id": "uor:RuntimeSecurity",
    "@type": "skos:Concept",
    "skos:prefLabel": "Runtime Security",
    "skos:altLabel": ["Shield", "Security Shield", "Runtime Guard"],
    "skos:definition": "Static and runtime security analysis layer enforcing policies at execution time.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "uns/shield/",
    "uor:cncfCategory": "Security & Compliance",
    "uor:k8sEquivalent": "PodSecurityPolicy",
    "uor:cncfProject": "Falco / OPA",
    "uor:profileLabels": {
      developer: "Runtime Security",
      user: "Security Shield",
      scientist: "Policy Enforcement Layer",
    },
  },

  // ── Storage & Identity ─────────────────────────────────────────────
  {
    "@id": "uor:ContentAddressedStore",
    "@type": "skos:Concept",
    "skos:prefLabel": "Content-Addressed Store",
    "skos:altLabel": ["CAS", "Object Store", "UOR Store"],
    "skos:definition": "Storage system where objects are addressed by the hash of their content, ensuring immutability and deduplication.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "store/",
    "uor:cncfCategory": "Cloud Native Storage",
    "uor:profileLabels": {
      developer: "Content-Addressed Store",
      user: "Object Storage",
      scientist: "Hash-Indexed Repository",
    },
  },
  {
    "@id": "uor:KnowledgeGraph",
    "@type": "skos:Concept",
    "skos:prefLabel": "Knowledge Graph",
    "skos:altLabel": ["RDF Graph", "Semantic Graph", "Triple Store"],
    "skos:definition": "W3C RDF-based directed graph of all system entities and their relationships.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "query/",
    "uor:cncfCategory": "Database",
    "uor:profileLabels": {
      developer: "Knowledge Graph",
      user: "Information Map",
      scientist: "Semantic Network",
    },
  },
  {
    "@id": "uor:Namespace",
    "@type": "skos:Concept",
    "skos:prefLabel": "Namespace",
    "skos:altLabel": ["Sovereign Space", "Space", "Scope"],
    "skos:definition": "Logical isolation boundary for resource grouping and access control.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:cncfCategory": "Scheduling & Orchestration",
    "uor:k8sEquivalent": "Namespace",
    "uor:profileLabels": {
      developer: "Namespace",
      user: "Space",
      scientist: "Partition",
    },
  },

  // ── Build & CI/CD ──────────────────────────────────────────────────
  {
    "@id": "uor:ImageBuild",
    "@type": "skos:Concept",
    "skos:prefLabel": "Image Build",
    "skos:altLabel": ["Uorfile Build", "Container Build"],
    "skos:definition": "Process of assembling layers into a content-addressed container image.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "uns/build/",
    "uor:cncfCategory": "Application Definition & Image Build",
    "uor:k8sEquivalent": "docker build",
    "uor:cncfProject": "Buildpacks / Kaniko",
    "uor:profileLabels": {
      developer: "Image Build",
      user: "App Packaging",
      scientist: "Artifact Construction",
    },
  },
  {
    "@id": "uor:ImageRegistry",
    "@type": "skos:Concept",
    "skos:prefLabel": "Image Registry",
    "skos:altLabel": ["Container Registry", "Artifact Registry"],
    "skos:definition": "OCI-compatible registry for storing and distributing container images.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "uns/build/",
    "uor:cncfCategory": "Application Definition & Image Build",
    "uor:cncfProject": "Harbor / Distribution",
    "uor:profileLabels": {
      developer: "Image Registry",
      user: "App Store",
      scientist: "Artifact Repository",
    },
  },

  // ── Observability Tooling ──────────────────────────────────────────
  {
    "@id": "uor:DistributedTracing",
    "@type": "skos:Concept",
    "skos:prefLabel": "Distributed Tracing",
    "skos:altLabel": ["Trace", "Span"],
    "skos:definition": "End-to-end request tracing across service boundaries using W3C Trace Context.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "trace/",
    "uor:cncfCategory": "Observability & Analysis",
    "uor:cncfProject": "OpenTelemetry / Jaeger",
    "uor:profileLabels": {
      developer: "Distributed Tracing",
      user: "Request Tracking",
      scientist: "Causal Path Analysis",
    },
  },
  {
    "@id": "uor:Metrics",
    "@type": "skos:Concept",
    "skos:prefLabel": "Metrics",
    "skos:altLabel": ["Telemetry", "Observables"],
    "skos:definition": "Numeric time-series measurements of system behavior and performance.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "observable/",
    "uor:cncfCategory": "Observability & Analysis",
    "uor:cncfProject": "Prometheus / Thanos",
    "uor:profileLabels": {
      developer: "Metrics",
      user: "System Stats",
      scientist: "Time-Series Observables",
    },
  },

  // ── Networking (Advanced) ──────────────────────────────────────────
  {
    "@id": "uor:Ingress",
    "@type": "skos:Concept",
    "skos:prefLabel": "Ingress",
    "skos:altLabel": ["Gateway", "Edge Router"],
    "skos:definition": "External traffic entry point with routing rules, TLS termination, and load balancing.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:closeMatch": ["https://schema.org/EntryPoint"],
    "uor:cncfCategory": "Service Mesh",
    "uor:k8sEquivalent": "Ingress / Gateway API",
    "uor:cncfProject": "Envoy / Contour",
    "uor:profileLabels": {
      developer: "Ingress",
      user: "Entry Point",
      scientist: "Traffic Admission",
    },
  },
  {
    "@id": "uor:NetworkPolicy",
    "@type": "skos:Concept",
    "skos:prefLabel": "Network Policy",
    "skos:altLabel": ["Firewall Rules", "ACL"],
    "skos:definition": "Declarative rules controlling which services can communicate with each other.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:cncfCategory": "Cloud Native Network",
    "uor:k8sEquivalent": "NetworkPolicy",
    "uor:cncfProject": "Cilium / Calico",
    "uor:profileLabels": {
      developer: "Network Policy",
      user: "Access Rules",
      scientist: "Communication Constraints",
    },
  },

  // ── State & Data ───────────────────────────────────────────────────
  {
    "@id": "uor:StateMachine",
    "@type": "skos:Concept",
    "skos:prefLabel": "State Machine",
    "skos:altLabel": ["Lifecycle FSM", "State Controller"],
    "skos:definition": "Finite state machine governing resource lifecycle transitions.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "state/",
    "uor:profileLabels": {
      developer: "State Machine",
      user: "Status Tracker",
      scientist: "Finite Automaton",
    },
  },
  {
    "@id": "uor:Morphism",
    "@type": "skos:Concept",
    "skos:prefLabel": "Morphism",
    "skos:altLabel": ["Transform", "Mapping", "Derivation"],
    "skos:definition": "Structure-preserving transformation between mathematical objects (UOR prime decompositions).",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "morphism/",
    "uor:profileLabels": {
      developer: "Morphism",
      user: "Transform",
      scientist: "Structure-Preserving Map",
    },
  },
  {
    "@id": "uor:Proof",
    "@type": "skos:Concept",
    "skos:prefLabel": "Derivation Proof",
    "skos:altLabel": ["Proof", "Verification Certificate"],
    "skos:definition": "Cryptographic certificate proving the derivation chain of a computed result.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:namespace": "proof/",
    "uor:cncfCategory": "Security & Compliance",
    "uor:profileLabels": {
      developer: "Derivation Proof",
      user: "Verification",
      scientist: "Formal Certificate",
    },
  },

  // ── Platform ───────────────────────────────────────────────────────
  {
    "@id": "uor:Webhook",
    "@type": "skos:Concept",
    "skos:prefLabel": "Webhook",
    "skos:altLabel": ["Callback", "Event Hook"],
    "skos:definition": "HTTP callback triggered by system events for external integration.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:cncfCategory": "Serverless",
    "uor:k8sEquivalent": "Admission Webhook / MutatingWebhook",
    "uor:profileLabels": {
      developer: "Webhook",
      user: "Notification",
      scientist: "Event Callback",
    },
  },
  {
    "@id": "uor:CRD",
    "@type": "skos:Concept",
    "skos:prefLabel": "Custom Resource Definition",
    "skos:altLabel": ["CRD", "Extension Type"],
    "skos:definition": "User-defined resource type that extends the system's API surface.",
    "skos:inScheme": "uor:SystemOntology",
    "uor:cncfCategory": "Scheduling & Orchestration",
    "uor:k8sEquivalent": "CustomResourceDefinition",
    "uor:cncfProject": "Kubernetes",
    "uor:profileLabels": {
      developer: "Custom Resource Definition",
      user: "Custom Type",
      scientist: "Schema Extension",
    },
  },
  {
    "@id": "uor:Operator",
    "@type": "skos:Concept",
    "skos:prefLabel": "Operator",
    "skos:altLabel": ["Controller", "Automation Agent"],
    "skos:definition": "Domain-specific controller that encodes operational knowledge for managing a complex workload.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:closeMatch": ["https://schema.org/SoftwareApplication"],
    "skos:related": ["uor:Reconciler", "uor:CRD"],
    "uor:cncfCategory": "Scheduling & Orchestration",
    "uor:k8sEquivalent": "Operator",
    "uor:cncfProject": "Operator Framework",
    "uor:profileLabels": {
      developer: "Operator",
      user: "Automation Agent",
      scientist: "Domain Controller",
    },
  },
  {
    "@id": "uor:ConfigMap",
    "@type": "skos:Concept",
    "skos:prefLabel": "ConfigMap",
    "skos:altLabel": ["Configuration", "Settings Map"],
    "skos:definition": "Key-value configuration data decoupled from container images.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:closeMatch": ["https://schema.org/PropertyValue"],
    "uor:cncfCategory": "Automation & Configuration",
    "uor:k8sEquivalent": "ConfigMap",
    "uor:profileLabels": {
      developer: "ConfigMap",
      user: "Settings",
      scientist: "Configuration State",
    },
  },
  {
    "@id": "uor:Secret",
    "@type": "skos:Concept",
    "skos:prefLabel": "Secret",
    "skos:altLabel": ["Sealed Secret", "Credential"],
    "skos:definition": "Sensitive data (keys, tokens, passwords) stored with encryption at rest.",
    "skos:inScheme": "uor:SystemOntology",
    "skos:closeMatch": ["https://schema.org/PropertyValue"],
    "uor:namespace": "uns/build/",
    "uor:cncfCategory": "Key Management",
    "uor:k8sEquivalent": "Secret",
    "uor:cncfProject": "Vault",
    "uor:profileLabels": {
      developer: "Secret",
      user: "Credential",
      scientist: "Encrypted Datum",
    },
  },
] as const;

// ── Concept Scheme ───────────────────────────────────────────────────────

export const SYSTEM_ONTOLOGY: SkosConceptScheme = {
  "@id": "uor:SystemOntology",
  "@type": "skos:ConceptScheme",
  "skos:prefLabel": "UOR System Ontology",
  "skos:definition":
    "Canonical W3C SKOS vocabulary for the UOR operating system. Single source of truth for all system terminology with audience-specific labels and CNCF/Kubernetes mappings.",
  "dcterms:created": "2025-01-01T00:00:00Z",
  "dcterms:modified": new Date().toISOString(),
  version: "1.0.0",
  concepts: CONCEPTS,
};

/** All concepts as a flat array. */
export const ALL_CONCEPTS: readonly SkosConcept[] = CONCEPTS;

/** Index by @id for O(1) lookup. */
export const CONCEPT_INDEX: ReadonlyMap<string, SkosConcept> = new Map(
  CONCEPTS.map((c) => [c["@id"], c]),
);

/** Index by lowercase prefLabel and altLabels for fuzzy term resolution. */
export const LABEL_INDEX: ReadonlyMap<string, SkosConcept> = new Map(
  CONCEPTS.flatMap((c) => [
    [c["skos:prefLabel"].toLowerCase(), c],
    ...c["skos:altLabel"].map(
      (alt) => [alt.toLowerCase(), c] as [string, SkosConcept],
    ),
  ]),
);

// ── Graph Materialization ─────────────────────────────────────────────────

/**
 * Materialize all SKOS concepts into the Knowledge Graph as proper triples.
 * This makes the ontology queryable via SPARQL alongside all other data.
 *
 * Fire-and-forget. Idempotent — concepts are keyed by their @id.
 */
export async function materializeToGraph(): Promise<number> {
  try {
    const { grafeoStore } = await import("@/modules/data/knowledge-graph/grafeo-store");
    const { anchor } = await import("@/modules/data/knowledge-graph/anchor");

    let count = 0;
    for (const concept of CONCEPTS) {
      await grafeoStore.putNode({
        uorAddress: `urn:uor:ontology:${concept["@id"]}`,
        label: concept["skos:prefLabel"],
        nodeType: "skos:Concept",
        rdfType: "http://www.w3.org/2004/02/skos/core#Concept",
        properties: {
          "@id": concept["@id"],
          prefLabel: concept["skos:prefLabel"],
          altLabels: concept["skos:altLabel"],
          definition: concept["skos:definition"],
          cncfCategory: concept["uor:cncfCategory"] ?? null,
          k8sEquivalent: concept["uor:k8sEquivalent"] ?? null,
          cncfProject: concept["uor:cncfProject"] ?? null,
          profileLabels: concept["uor:profileLabels"],
          namespace: concept["uor:namespace"] ?? null,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncState: "local",
      });
      count++;
    }

    anchor("ontology", "vocabulary:materialized", {
      label: `Materialized ${count} SKOS concepts to KG`,
      properties: { conceptCount: count },
    }).catch(() => {});

    console.log(`[Ontology] Materialized ${count} SKOS concepts to Knowledge Graph`);
    return count;
  } catch (err) {
    console.warn("[Ontology] Failed to materialize vocabulary:", err);
    return 0;
  }
}
