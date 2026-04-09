

# UOR Engine Enforcement — Cryptographic Self-Verification

## Problem

The kernel declaration, minimality check, and namespace coverage audit exist as functions but are never enforced. The seal does not include the kernel hash, so the cryptographic proof doesn't actually prove the kernel is sound. The system declares but does not enforce.

## 4 Surgical Changes

### 1. Bake kernel hash into the seal (`types.ts` + `sovereign-boot.ts`)

Add `kernelHash: string` to `UorSeal`. Pass the kernel verification hash into `computeSeal()` so it becomes part of the `singleProofHash` input document as `"uor:kernelHash"`. If `!kernelResult.allPassed`, fail the boot (not just warn).

### 2. Enforce minimality at boot (`sovereign-boot.ts` + `tech-stack.ts`)

Call `validateMinimality()` during boot after stack validation. Log overlaps as warnings. The current `encode` overlap (Web Crypto + jsonld both `critical`) must be resolved: change Web Crypto's criticality to `"recommended"` since jsonld is the canonical encode pipeline and Web Crypto is its underlying primitive — not a competing framework.

### 3. Enforce namespace coverage at boot (`sovereign-boot.ts`)

Call `auditNamespaceCoverage()` after kernel verification. Log uncovered namespaces. Include coverage ratio in a new `kernelHealth` field on `BootReceipt`.

### 4. Add manifest traceability validation (`manifest.ts` + `sovereign-boot.ts`)

Create `validateManifestTraceability()` that checks every bus module's `kernelFunction` against the 7 valid kernel functions. Call it during bus-init phase. Orphan modules (with invalid `kernelFunction`) are logged as violations.

## Files to Modify

| File | Change |
|------|--------|
| `src/modules/boot/types.ts` | Add `kernelHash` to `UorSeal`, add `kernelHealth` to `BootReceipt` |
| `src/modules/boot/sovereign-boot.ts` | Wire kernel hash into seal, call minimality + coverage + manifest checks, fail on kernel failure |
| `src/modules/boot/tech-stack.ts` | Change Web Crypto criticality to `"recommended"` to resolve encode overlap |
| `src/modules/bus/manifest.ts` | Add `validateManifestTraceability()` function |

## Result

After these changes, the boot sequence becomes cryptographically self-enforcing:
- Kernel hash is in the seal — tampering with kernel functions invalidates the seal
- Minimality is checked — overlapping frameworks are detected and reported
- Namespace coverage is checked — the engine's own declarations are verified
- Manifest traceability is checked — no bus module can exist outside the 7 primitives

Nothing can exist in the system that the UOR engine does not declare. The seal proves it.

