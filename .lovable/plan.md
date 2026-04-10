

# DevOps Alignment Gate — Terminology Standardization & Wiring Verification

## Audit Summary

After evaluating the system from a DevOps perspective, the architecture is remarkably well-mapped to CNCF/K8s patterns. The `cncf-compat/categories.ts` already defines a 22-category mapping. However, there are concrete gaps between the system's *internal terminology* and what a DevOps engineer would expect, plus several wiring issues where subsystems aren't connected to the canonical pipelines they claim to use.

### Key Findings

**Terminology Misalignments** (confusing for experienced DevOps engineers):

| Current Term | Standard DevOps Term | Impact |
|---|---|---|
| `Sovereign Bus` | **Service Mesh / Message Bus** | "Sovereign" is opaque; experienced devs won't find it via search |
| `AppKernel` | **Container Runtime** / **Sidecar Proxy** | Conflates two concepts — it's actually the isolation + proxy layer |
| `Sovereign Reconciler` | **Reconciliation Controller** | Fine, but comments say "K8s equivalent" — just call the concepts what they are |
| `AppBlueprint` | **Pod Spec / Deployment Manifest** | "Blueprint" is fine but comments should cross-reference K8s terms consistently |
| `Sovereign Boot` | **Init System / systemd** | "Boot" is close, but the init sequence is really systemd-equivalent |
| `UorContainer` | **Container** | Correct, but no `docker`-style CLI help text in the system monitor |
| `SealStatus` | **Integrity Attestation** | "Seal" maps to Sigstore/cosign attestation — label it so |
| `useConnectivity` features | **Liveness Probes / Readiness Probes** | The 6 service checks are exactly K8s health probes — label them |
| `ComposeEvent` | **Cluster Event** | Matches `kubectl get events` — surface it as such |
| `error budget` | **SLO Error Budget** | Correct term, but not labeled as SLO anywhere |

**Wiring Gaps** (subsystems not connected to canonical infrastructure):

1. **`useConnectivity` features are not registered as bus operations** — The 6 service probes (oracle, kgSync, dataBank, webBridge, voice, auth) are computed client-side but never emit health events to the `SystemEventBus`, meaning the reconciler can't act on them.

2. **CNCF category maturity claims are unverified** — `categories.ts` marks 14 categories as "complete" but there's no gate checking whether the referenced `uorModules` actually exist and export the claimed interfaces.

3. **Observability gap** — The OTLP adapter (`cncf-compat/otlp.ts`) creates spans but nothing collects them. The `SystemEventBus` emits events but they're not formatted as CloudEvents despite the adapter existing.

4. **Pipeline module is "planned" but exists** — `cncf-compat/pipeline.ts` exports `createPipeline` and `executePipeline` but the category registry marks CI/CD as "planned".

5. **No health endpoint convention** — Each service has its own health check pattern. K8s uses `/healthz`, `/readyz`, `/livez`. The bus should expose `*/healthz` for every registered module.

## Proposal: DevOps Alignment Gate + Terminology Glossary

### 1. New Gate: `devops-alignment-gate.ts` (~100 lines)
**File**: `src/modules/canonical-compliance/gates/devops-alignment-gate.ts`

A compliance gate that verifies:
- **CNCF category integrity**: For each category marked "complete", verify that every listed `uorModule` path resolves to a real module with exports
- **Health probe coverage**: Check that every registered bus module has a healthcheck operation registered (or is explicitly exempt)
- **Event bus wiring**: Verify that connectivity features emit to `SystemEventBus` (check for `SystemEventBus.emit` calls in connectivity-related modules)
- **Maturity accuracy**: Flag categories marked "complete" or "partial" where the referenced module paths don't exist
- **Terminology consistency**: Static list of internal→standard term mappings, flagging any module docstring that uses non-standard terminology without a cross-reference

Scoring: Each missing health probe = -2, each broken module reference = -5, each maturity mismatch = -8.

### 2. DevOps Glossary Registry (~60 lines)
**File**: `src/modules/canonical-compliance/devops-glossary.ts`

A canonical mapping of internal terms → standard DevOps/CNCF terms, consumed by:
- The gate (for verification)
- The System Monitor (for tooltip labels)
- Future documentation generation

```typescript
const DEVOPS_GLOSSARY: GlossaryEntry[] = [
  { internal: "Sovereign Bus", standard: "Service Mesh / Message Bus", k8s: "kube-apiserver", cncf: "Istio/Linkerd" },
  { internal: "AppKernel", standard: "Container Runtime + Sidecar", k8s: "containerd + envoy", cncf: "containerd" },
  { internal: "Reconciler", standard: "Reconciliation Controller", k8s: "kube-controller-manager", cncf: "Kubernetes" },
  { internal: "AppBlueprint", standard: "Deployment Manifest", k8s: "Deployment/Pod spec", cncf: "Helm chart" },
  { internal: "Sovereign Boot", standard: "Init System", k8s: "kubelet bootstrap", cncf: "systemd" },
  { internal: "UorContainer", standard: "Container", k8s: "Pod/Container", cncf: "containerd/CRI-O" },
  { internal: "UOR Seal", standard: "Integrity Attestation", k8s: "admission webhook", cncf: "Sigstore/cosign" },
  { internal: "Connectivity Probes", standard: "Liveness/Readiness Probes", k8s: "livenessProbe/readinessProbe" },
  { internal: "ComposeEvent", standard: "Cluster Event", k8s: "kubectl get events" },
  { internal: "Error Budget", standard: "SLO Error Budget", k8s: "N/A", cncf: "OpenSLO" },
  { internal: "Bus Manifest", standard: "Service Registry", k8s: "endpoints/services", cncf: "CoreDNS/etcd" },
  { internal: "DHT", standard: "Service Discovery", k8s: "kube-dns", cncf: "CoreDNS" },
  { internal: "Conduit", standard: "mTLS Tunnel", k8s: "N/A", cncf: "SPIFFE/SPIRE" },
  { internal: "Shield", standard: "Runtime Security", k8s: "PodSecurityPolicy", cncf: "Falco/OPA" },
];
```

### 3. Update `gates/index.ts` to register the new gate

Auto-registers via side-effect import, same pattern as existing gates.

### 4. Fix Maturity Mismatch in `cncf-compat/categories.ts` (~3 lines)

Change CI/CD category from `"planned"` to `"partial"` since `pipeline.ts` already exports working functions.

## Files

| File | Action | Lines |
|---|---|---|
| `src/modules/canonical-compliance/devops-glossary.ts` | Create | ~60 |
| `src/modules/canonical-compliance/gates/devops-alignment-gate.ts` | Create | ~100 |
| `src/modules/canonical-compliance/gates/index.ts` | Update | ~2 lines (add import) |
| `src/modules/cncf-compat/categories.ts` | Update | ~1 line (fix maturity) |

