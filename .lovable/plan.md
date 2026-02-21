

# UOR-Compliant Modular Architecture with Content-Addressed Verification

## Current State Assessment

### What works well
- Seven self-contained modules, each with a `module.json` JSON-LD manifest
- Barrel exports (`index.ts`) per module with clean public APIs
- Typed contracts (`types.ts`) per module
- Dependency declarations in manifests (e.g., `landing` depends on `core`)
- Existing CID computation and canonical JSON-LD serialization in the edge function (`store.ts`)

### What does not work
1. **Manifests are dead files.** No code reads, validates, or uses `module.json` at build or runtime. They are documentation, not infrastructure.
2. **No content addressing.** Modules have no verifiable identity. Nothing proves a module is what it claims to be.
3. **No runtime registry.** `App.tsx` hardcodes every route and import. The manifest's `routes` and `dependencies` fields are ignored.
4. **No verification.** There is no mechanism to check that a module's actual exports match its declared manifest.
5. **The `ModuleManifest` TypeScript interface exists** but is never instantiated or used beyond being exported as a type.
6. **CID computation lives only in Deno** (edge function). The browser has no access to these utilities.

---

## Plan

### Phase 1: Browser-Compatible UOR Addressing Library

Create `src/lib/uor-address.ts` porting the core content-addressing functions from the edge function to the browser using the Web Crypto API (already available in all modern browsers):

- `canonicalJsonLd(obj)` -- deterministic JSON-LD serialization with sorted keys
- `computeCid(bytes)` -- CIDv1 / dag-json / sha2-256 / base32lower
- `computeUorAddress(bytes)` -- Braille bijection address
- `computeModuleIdentity(manifest)` -- takes a manifest object, canonicalizes it, and returns `{ cid, uorAddress, canonicalBytes }`

These are pure functions with zero dependencies.

### Phase 2: Module Manifest Registry

Create `src/lib/uor-registry.ts` that:

1. Imports all seven `module.json` files statically (Vite handles JSON imports natively)
2. On initialization, computes the CID and UOR address for each module manifest
3. Validates that declared dependencies exist in the registry
4. Validates that declared exports match the actual barrel export keys
5. Exposes a typed registry: `getModule(name)` returns the manifest plus its computed identity
6. Exposes `getAllModules()` for iteration
7. Exposes `verifyModule(name)` that recomputes the CID and compares it to the stored one

### Phase 3: Enhance Module Manifests with Identity Fields

Add computed identity fields to each `module.json`:

```json
{
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "uor:Module",
  "name": "core",
  "version": "1.0.0",
  "store:cid": "bafy...",
  "store:uorAddress": { "u:glyph": "...", "u:length": 42 }
}
```

These fields are self-referential (the CID is computed from the manifest without these fields, then embedded). The verification function strips them before recomputing, exactly matching the `stripSelfReferentialFields` pattern already used in the edge function.

### Phase 4: Component-Level Verification Certificates

Create `src/lib/uor-certificate.ts` with a `generateCertificate` function that takes any component's descriptive attributes and produces a UOR verification receipt:

```typescript
interface UorCertificate {
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld";
  "@type": "cert:ModuleCertificate";
  "cert:subject": string;        // module or component name
  "cert:cid": string;            // CIDv1
  "store:uorAddress": {
    "u:glyph": string;
    "u:length": number;
  };
  "cert:computedAt": string;     // ISO timestamp
  "cert:specification": "1.0.0";
}
```

Generate certificates for:
- All 7 module manifests
- The route table (App.tsx route configuration as a JSON-LD object)
- The navigation contract (navItems array)
- The UOR layer definitions (FrameworkLayers data)
- The project maturity data
- The research categories

### Phase 5: Verification Console and Metadata Exposure

Create `src/modules/core/components/UorVerification.tsx`:

- A small, unobtrusive verification badge in the footer (or accessible via a keyboard shortcut)
- When activated, it runs verification on all registered modules
- Displays each module's name, CID, UOR address, and verification status (pass/fail)
- This serves as a live demonstration of UOR's content-addressing capability on the website itself

Additionally, inject `<script type="application/ld+json">` into the page head with the site's module graph and certificates, making the site machine-readable and self-describing.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/uor-address.ts` | Browser-compatible CID, canonical JSON-LD, and UOR address computation |
| `src/lib/uor-registry.ts` | Module manifest registry with dependency validation and identity computation |
| `src/lib/uor-certificate.ts` | Certificate generation for components and data objects |
| `src/modules/core/components/UorVerification.tsx` | Verification UI component |
| `src/modules/core/components/UorMetadata.tsx` | JSON-LD metadata injector for `<head>` |

## Files to Modify

| File | Changes |
|------|---------|
| 7x `module.json` files | Add computed `store:cid` and `store:uorAddress` identity fields |
| `src/modules/core/types.ts` | Extend `ModuleManifest` interface with identity fields and certificate type |
| `src/modules/core/index.ts` | Export new verification and metadata components |
| `src/modules/core/components/Layout.tsx` | Mount `UorMetadata` in head and `UorVerification` badge |
| `src/App.tsx` | Initialize the module registry on app startup |

## What Does Not Change
- Visual design, layout, animations
- All page content and messaging
- Navigation structure and routing behavior
- Edge function code (it already has its own implementation)
- Any external-facing behavior (this is internal infrastructure)

---

## Technical Details

### Why this approach works with the existing UOR framework

The edge function's `store.ts` already implements exactly this pattern for stored objects:
1. Canonicalize the JSON-LD object (sorted keys, deterministic serialization)
2. Compute SHA-256 digest of the canonical bytes
3. Encode as CIDv1 with dag-json codec
4. Compute UOR address via Braille bijection
5. Embed the identity back into the object (self-referential)
6. Verify by stripping self-referential fields and recomputing

We are applying the same pattern to module manifests and component data. The functions are identical; we are simply porting them from Deno to the browser.

### Dependency graph enforced by the registry

```text
core (no dependencies)
  |
  +-- landing (depends on core)
  +-- framework (depends on core)
  +-- community (depends on core)
  +-- projects (depends on core)
  +-- donate (depends on core)
  +-- api-explorer (depends on core)
```

The registry will validate this graph at startup and log warnings for any undeclared cross-module imports.

### Certificate rehydration capability

Because each certificate captures all canonical attributes of its subject, and because the CID is deterministically derived from those attributes, a certificate can be used to:
1. Verify that the current component matches its declared identity
2. Detect any unauthorized modification (the CID will not match)
3. In theory, reconstruct the full attribute set from the canonical bytes (the "rehydration" the user described)

