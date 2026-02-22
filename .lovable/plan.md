

# Modular Coherence Overhaul: Complete UOR Module Registry and Certificate System

## Summary

The codebase has 26 frontend modules in `src/modules/`, but only **7** are registered in the UOR Module Registry (`src/lib/uor-registry.ts`). This means **19 modules** lack UOR certificates, breaking the fundamental promise that every module is self-verifying, content-addressed, and interoperable. Additionally, several modules have inconsistent `module.json` schema formats (some use `u:dependencies` while others use `dependencies`), and the API endpoint structure in the edge function is a single 7,400-line monolith rather than a modular, auditable system.

This plan delivers three things:
1. Every module gets a UOR certificate (registered in the Module Registry)
2. All `module.json` manifests follow a single canonical schema
3. The `/navigate` API endpoint exposes a per-module endpoint map so any agent can discover which API endpoints belong to which module

---

## Problem Analysis

### 1. Registry Gap: 7 of 26 modules registered

**Currently registered** (in `uor-registry.ts`):
- core, landing, framework, community, projects, donate, api-explorer

**Missing from registry** (19 modules with NO certificate):
- ring-core, identity, triad, derivation, kg-store, epistemic, jsonld, shacl, sparql, resolver, semantic-index, morphism, observable, trace, state, self-verify, agent-tools, code-kg, dashboard

### 2. Manifest Schema Inconsistency

Two competing schemas exist across `module.json` files:

**Schema A** (older modules: core, landing, community, projects, donate, api-explorer):
```json
{
  "name": "...",
  "exports": [...],
  "dependencies": { "core": "^1.0.0" },
  "routes": [...],
  "assets": [...]
}
```

**Schema B** (newer modules: morphism, dashboard, self-verify, state):
```json
{
  "schema:name": "...",
  "u:namespace": ["..."],
  "u:dependencies": ["ring-core", "identity"]
}
```

This inconsistency means the registry's `canonicalJsonLd()` produces different shapes for semantically identical declarations, breaking CID determinism across the system.

### 3. API Endpoint-to-Module Mapping is Implicit

The 7,400-line edge function has no formal mapping between API endpoints and modules. Agents (and humans) cannot programmatically determine which module owns which endpoint.

---

## Implementation Plan

### Phase 1: Standardize All Module Manifests

Normalize all 26 `module.json` files to a single canonical schema (Schema A with UOR extensions). This is the foundation for deterministic CID computation.

**Canonical schema:**
```json
{
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "uor:Module",
  "name": "<module-name>",
  "version": "1.0.0",
  "description": "<one-line description>",
  "uor:specification": "1.0.0",
  "uor:namespaces": ["<prefix:>", ...],
  "exports": ["<exported-symbol>", ...],
  "dependencies": { "<module-name>": "^1.0.0", ... },
  "routes": ["/path", ...],
  "api_endpoints": ["/kernel/op/verify", ...],
  "assets": []
}
```

**Files to normalize** (6 modules using Schema B):
- `src/modules/morphism/module.json`
- `src/modules/dashboard/module.json`
- `src/modules/self-verify/module.json`
- `src/modules/state/module.json`
- `src/modules/observable/module.json`
- `src/modules/trace/module.json`

Changes: rename `schema:name` to `name`, `u:dependencies` array to `dependencies` object, `u:namespace` to `uor:namespaces`, add `exports`/`routes`/`assets` fields.

Additionally, add the new `api_endpoints` field to every module that owns API endpoints, creating the formal module-to-endpoint mapping:

| Module | API Endpoints |
|---|---|
| ring-core | `/kernel/op/verify`, `/kernel/op/verify/all`, `/kernel/op/compute`, `/kernel/op/operations`, `/kernel/op/correlate` |
| identity | `/kernel/address/encode`, `/kernel/schema/datum`, `/kernel/schema/triad` |
| derivation | `/kernel/derive`, `/bridge/derivation`, `/tools/derive` |
| triad | (consumed by identity/datum -- no standalone endpoint) |
| kg-store | `/bridge/graph/query`, `/store/write`, `/store/resolve`, `/store/read/:cid`, `/store/verify/:cid`, `/store/write-context`, `/store/gateways` |
| shacl | `/bridge/shacl/shapes`, `/bridge/shacl/validate` |
| sparql | `/bridge/sparql`, `/sparql/federation-plan` |
| resolver | `/bridge/resolver`, `/bridge/resolver/entity`, `/bridge/partition`, `/tools/partition`, `/tools/correlate` |
| morphism | `/user/morphism/transforms`, `/bridge/morphism/transform`, `/bridge/morphism/isometry`, `/bridge/morphism/coerce`, `/bridge/gnn/graph`, `/bridge/gnn/ground` |
| observable | `/bridge/observable/metrics`, `/bridge/observable/metric`, `/bridge/observable/stratum`, `/bridge/observable/path`, `/bridge/observable/curvature`, `/bridge/observable/holonomy`, `/bridge/observable/stream` |
| state | `/user/state`, `/store/pod-context`, `/store/pod-write`, `/store/pod-read`, `/store/pod-list` |
| self-verify | `/bridge/proof/critical-identity`, `/bridge/proof/coherence`, `/bridge/cert/involution`, `/cert/issue`, `/cert/portability` |
| agent-tools | `/tools/derive`, `/tools/query`, `/tools/verify`, `/tools/correlate`, `/tools/partition` |
| jsonld | `/bridge/emit`, `/schema-org/extend` |
| epistemic | (grading is embedded in all responses -- no standalone endpoint) |
| trace | `/bridge/trace` |
| semantic-index | (consumed internally by resolver -- no standalone endpoint) |
| code-kg | (frontend-only visualization) |
| dashboard | (frontend-only -- no API endpoint) |
| core | (frontend layout -- no API endpoint) |
| landing | (frontend homepage -- no API endpoint) |
| community | (frontend content -- no API endpoint) |
| projects | (frontend content -- no API endpoint) |
| donate | (frontend content -- no API endpoint) |
| api-explorer | (frontend interactive docs -- no API endpoint) |

### Phase 2: Register All 26 Modules in the Registry

Update `src/lib/uor-registry.ts` to import and register all 26 module manifests.

**Add 19 new imports:**
```typescript
import ringCoreManifest from "@/modules/ring-core/module.json";
import identityManifest from "@/modules/identity/module.json";
import triadManifest from "@/modules/triad/module.json";
import derivationManifest from "@/modules/derivation/module.json";
import kgStoreManifest from "@/modules/kg-store/module.json";
import epistemicManifest from "@/modules/epistemic/module.json";
import jsonldManifest from "@/modules/jsonld/module.json";
import shaclManifest from "@/modules/shacl/module.json";
import sparqlManifest from "@/modules/sparql/module.json";
import resolverManifest from "@/modules/resolver/module.json";
import semanticIndexManifest from "@/modules/semantic-index/module.json";
import morphismManifest from "@/modules/morphism/module.json";
import observableManifest from "@/modules/observable/module.json";
import traceManifest from "@/modules/trace/module.json";
import stateManifest from "@/modules/state/module.json";
import selfVerifyManifest from "@/modules/self-verify/module.json";
import agentToolsManifest from "@/modules/agent-tools/module.json";
import codeKgManifest from "@/modules/code-kg/module.json";
import dashboardManifest from "@/modules/dashboard/module.json";
```

**Add to `RAW_MANIFESTS` map** -- all 19 new entries alongside the existing 7 (total: 26).

This ensures every module automatically gets:
- A CIDv1 content hash (deterministic identity)
- A UOR Braille address (algebraic identity)
- A `cert:ModuleCertificate` (self-verification receipt)

### Phase 3: Update UorMetadata to Emit Complete Module Graph

The `UorMetadata` component already injects module certificates as JSON-LD into the document head. After Phase 2, it will automatically emit all 26 modules instead of just 7. No code changes needed in `UorMetadata.tsx` -- it reads from `getAllModules()` which will now return 26 entries.

### Phase 4: Update the Verification Dashboard

The footer verification badge (`UorVerification.tsx`) displays certificate counts. After registration, it will show "26 modules verified" instead of "7 modules verified". No code changes needed -- it reads from the same registry API.

### Phase 5: Add Module Endpoint Map to `/navigate` API Response

Update the edge function's `frameworkIndex()` handler to include a `module_registry` section that maps each module to its owned endpoints. This provides the programmatic discovery layer that enables any agent to find which module serves which capability.

Add to the `/navigate` response:
```json
{
  "module_registry": {
    "ring-core": {
      "description": "Ring arithmetic CPU -- Z/(2^n)Z",
      "endpoints": ["/kernel/op/verify", "/kernel/op/compute", "..."]
    },
    "identity": {
      "description": "Content-addressed identity via Braille bijection",
      "endpoints": ["/kernel/address/encode", "/kernel/schema/datum", "..."]
    }
  }
}
```

### Phase 6: Attribution Protocol Persistence

Move the in-memory `attributionStore` array in the edge function to use the existing `uor_certificates` database table, so attribution records survive across function restarts.

---

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/modules/morphism/module.json` | Normalize to Schema A |
| `src/modules/dashboard/module.json` | Normalize to Schema A |
| `src/modules/self-verify/module.json` | Normalize to Schema A |
| `src/modules/state/module.json` | Normalize to Schema A |
| `src/modules/observable/module.json` | Normalize to Schema A |
| `src/modules/trace/module.json` | Normalize to Schema A |
| `src/lib/uor-registry.ts` | Import + register all 26 modules |
| `supabase/functions/uor-api/index.ts` | Add `module_registry` to `/navigate`, persist attribution to DB |
| `public/.well-known/uor.json` | Update `conformance.ring_elements` to reflect 26 registered modules |

### Files NOT Modified
- `src/modules/core/components/UorMetadata.tsx` -- automatically picks up new modules
- `src/modules/core/components/UorVerification.tsx` -- automatically picks up new modules
- `src/lib/uor-certificate.ts` -- no changes needed
- `src/lib/uor-address.ts` -- no changes needed
- `src/lib/uor-content-registry.ts` -- content certificates are separate from module certificates

### Verification Criteria
- After deployment, the footer verification badge should report **26 modules verified**
- The JSON-LD in `document.head` should contain 26 module entries
- `GET /v1/navigate` should return a `module_registry` block with all modules and their endpoints
- Every `module.json` should follow the canonical schema (auditable by comparing keys)
- Attribution records should persist across edge function cold starts

