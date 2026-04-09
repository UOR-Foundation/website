

# Security Audit: Sovereign Boot Sequence with UOR Seal

## Executive Summary

The design is architecturally sound for its stated goals — client-side integrity monitoring and device transparency. However, there are **7 concrete security findings** and **4 hardening recommendations** that should be addressed before implementation. The most critical issue is the timestamp in the seal input, which undermines the continuous monitoring claim.

## Finding 1: Timestamp Breaks Continuous Seal Verification (CRITICAL)

The seal input includes `timestamp: new Date().toISOString()`. This means the seal derivation ID is unique to the boot moment. When the monitor re-verifies every 30s, it **cannot recompute the same seal** — the current time differs from the boot time.

**Fix**: The monitor must store the original `sealInput` object (or its canonical N-Quads bytes) and re-hash that exact input. It should NOT rebuild the input document with a new timestamp. The timestamp is part of the sealed payload, not a moving target.

```text
Monitor approach:
  WRONG:  rebuild sealInput with now() → hash → compare  (always different)
  RIGHT:  store original canonicalBytes → re-hash → compare derivationId
          + independently re-verify ring (256 elements)
          + independently re-verify manifestHash
```

## Finding 2: sessionStorage Is Not Tamper-Proof (HIGH)

The plan stores the seal in `sessionStorage("uor:seal")`. Any browser extension, devtools console, or XSS payload can overwrite this value. If the monitor reads a tampered seal from sessionStorage and compares against a tampered seal, it passes silently.

**Fix**: Keep the seal in a **JavaScript closure** (module-scoped `let`), not in sessionStorage. sessionStorage can be used for display/caching only — never as the source of truth for verification. The closure is inaccessible to external scripts without a direct module import.

```text
// Module-private. not in window, not in storage, not in DOM
let _sealedBytes: Uint8Array | null = null;
let _sealedId: string | null = null;
```

## Finding 3: Device Provenance Is Trivially Spoofable (MEDIUM)

`window.location.hostname` can be overridden by a determined attacker (proxy, DNS hijack, or simply `Object.defineProperty(location, 'hostname', ...)`). The plan claims "tamper-proof" provenance — this is overstated for a client-side system.

**Recommendation**: Be honest in the UI language. Instead of "tamper-proof", use "self-reported device context." The provenance is a **best-effort signal** baked into the seal for auditability, not a hard security boundary. Document this limitation explicitly.

The provenance should also include `navigator.userAgent`, `screen.width × height`, and `performance.now()` jitter as additional signals — these increase the cost of spoofing without claiming invulnerability.

## Finding 4: "128-bit Post-Quantum Security" Claim Needs Precision (MEDIUM)

The claim is that SHA-256 provides 128-bit security against Grover's algorithm. This is correct for **preimage resistance** but the system's threat model is actually **collision resistance** (can an attacker produce a different input with the same seal?). SHA-256 collision resistance under Grover is ~2^85 (birthday bound halved), not 2^128.

**However**: This is still computationally infeasible. The fix is purely in documentation — state "128-bit preimage resistance, ~85-bit collision resistance under quantum" to be precise. For true 128-bit post-quantum collision resistance, the system would need SHA-384 or SHA-512/256.

**Recommendation**: Consider SHA-512/256 as a future option. It's a drop-in replacement (same output size) with better quantum collision margins, and is faster on 64-bit hardware.

## Finding 5: Ring Verification Is Redundant After First Pass (LOW)

Verifying `neg(bnot(x)) ≡ succ(x)` for all 256 elements every 30 seconds checks **compiled code** that cannot change at runtime (JavaScript/WASM functions are immutable once loaded). If the functions pass at boot, they will pass forever in that session.

**Recommendation**: Run the full 256-element verification at boot only. The 30s monitor should verify a **random sample** (e.g., 8 random elements) plus a **canary value** (e.g., x=0 and x=255). This reduces monitor CPU cost from 256 to 10 operations while maintaining detection capability against hypothetical memory corruption.

## Finding 6: No Protection Against WASM Binary Replacement (MEDIUM)

The adapter loads WASM from `src/lib/wasm/uor-foundation/uor_wasm_shim`. If an attacker can serve a modified WASM binary (e.g., via CDN compromise or service worker injection), the ring operations could return correct results for the 256-element verification while behaving incorrectly for other inputs or leaking data.

**Recommendation**: Compute a SHA-256 hash of the WASM binary bytes at load time and include it in the seal input as `wasmBinaryHash`. This creates a binding between the specific binary loaded and the seal — a different binary produces a different seal, detectable by any external verifier who knows the expected hash.

```text
sealInput = {
  ...existing fields,
  "uor:wasmBinaryHash": sha256(wasmBytes),  // NEW
}
```

## Finding 7: Custom Event Dispatch Is Observable by Attackers (LOW)

The plan dispatches `"uor:seal-broken"` and `"uor:seal-heartbeat"` via `window.dispatchEvent()`. Any script on the page can listen to these events and suppress or forge them (e.g., catching `seal-broken` and preventing propagation).

**Recommendation**: Use only the `SystemEventBus` (module-internal singleton) for security-critical events. CustomEvents on `window` are fine for UI updates but should not be the primary trust channel.

## Hardening Recommendations

### H1: Lean the Seal Input

Remove `engineType` from the seal — it leaks implementation details and an attacker who forces a TS fallback could use this to predict seal values. Instead, include only the ring verification results (which implicitly reveal engine correctness).

Minimal seal input:
```text
{
  "@type": "uor:SystemSeal",
  "uor:ringTableHash": <sha256 of 256 boolean results>,
  "uor:manifestHash": <sha256 of canonical bus manifest>,
  "uor:deviceContext": <sha256 of provenance object>,
  "uor:sessionNonce": <crypto.getRandomValues(16 bytes)>,
  "uor:bootedAt": <ISO timestamp>
}
```

The `sessionNonce` prevents cross-session replay — even identical hardware + identical code produces a unique seal per session.

### H2: Make the Monitor Interval Jittered

A fixed 30s interval creates a predictable window. Use `25s + random(0-10s)` to prevent timing-based attacks that modify state between checks.

### H3: Freeze Critical Objects

After boot, `Object.freeze()` the seal object and the engine contract to prevent runtime property mutation:

```typescript
Object.freeze(seal);
Object.freeze(engine);
```

### H4: Add Subresource Integrity for WASM

If the WASM binary is loaded via fetch, add SRI hash verification. If loaded via static import, ensure the build pipeline includes integrity checks.

## Revised Files Summary

The file list in the plan is correct. No files should be added or removed. The changes above affect the **implementation** within those files, not the file structure.

| File | Security Change |
|---|---|
| `sovereign-boot.ts` | Store seal in closure, not sessionStorage; add sessionNonce; add wasmBinaryHash |
| `seal-monitor.ts` | Re-hash stored bytes (not rebuild); jitter interval; use SystemEventBus only |
| `types.ts` | Add `sessionNonce` to UorSeal; rename provenance to "self-reported" |
| `EngineStatusIndicator.tsx` | Use "self-reported context" language; freeze displayed seal |

## Verdict

The architecture is **sound**. The `singleProofHash()` pipeline (URDNA2015 → SHA-256 → derivation ID) is the correct primitive and is well-implemented in `uor-canonical.ts`. The ring verification is mathematically complete. The device transparency concept is valuable.

The 7 findings above are implementation-level fixes — none require architectural changes. The most important are: (1) fix the timestamp/re-verification logic, (2) keep the seal in a closure, and (3) add a session nonce to prevent replay. With these applied, the system achieves its stated security properties within the constraints of a client-side runtime.

