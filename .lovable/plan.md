

## Duplicate Detection: "Discovered" vs "Confirmed"

### Terminology

In UOR, every piece of content already has an address. It's deterministic. We don't "create" addresses, we discover them. This gives us two natural, authentic states:

- **Discovered**: First time this content's address has been found. "Address discovered."
- **Confirmed**: Content already has a known address. "Address confirmed." This proves the system works: same content, same address, every time.

No jargon. Self-descriptive. True to UOR's philosophy that identity is inherent in content.

### Changes

**1. Remove the timestamp from the source object** (`ResolvePage.tsx`, line 367)

Drop `"uor:encodedAt"` so that identical content always produces the same address. Content identity should come from content alone.

**2. Add pre-encoding registry check** (`ResolvePage.tsx`, `handleEncode`)

Before calling `encode()`, import `singleProofHash` from `@/lib/uor-canonical` and `lookupReceipt` from the registry. Compute the CID, check if it already exists. If found, use the existing entry and flag `isConfirmed: true`. If not, encode normally and flag `isConfirmed: false`.

**3. Extend the `Result` interface** (line 82)

Add `isConfirmed: boolean` and `originalTimestamp?: number` (when confirmed, show when it was first discovered).

**4. Differentiate the UI response**

- **Discovered** (new): Green confetti. Toast: "Address discovered." A small badge near the address: `DISCOVERED` in green.
- **Confirmed** (existing): No confetti. A calm, confident blue badge: `CONFIRMED`. Toast: "Address confirmed. Same content, same address." Show "First discovered {relative time}" below the badge.

Both states display the full address and all identity forms identically. The distinction is purely in the status indicator.

**5. Additional navigation value**

When content is confirmed, show a small counter: "Confirmed 3 times" (tracked via a simple in-memory counter on each registry entry). This gives a sense of how frequently content is being referenced, useful for understanding which concepts are actively being used across the system.

### Technical detail

```
// handleEncode — revised flow
const contentObj = {
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "uor:UserContent",
  "uor:content": text,
};

const proof = await singleProofHash(contentObj);
const existing = lookupReceipt(proof.cid);

if (existing) {
  // Increment confirmation count on registry entry
  existing.confirmations = (existing.confirmations || 1) + 1;
  setResult({ source: existing.source, receipt: existing.receipt, isConfirmed: true, originalTimestamp: existing.createdAt });
  toast("Address confirmed.", { description: "Same content, same address." });
} else {
  const receipt = await encode(contentObj);
  setResult({ source: contentObj, receipt, isConfirmed: false });
  confetti(...);
  toast("Address discovered.", { description: receipt.triwordFormatted });
}
```

### Files modified

- `src/modules/oracle/pages/ResolvePage.tsx` — Remove timestamp, add pre-check, update UI states
- `src/modules/oracle/lib/receipt-registry.ts` — Add optional `confirmations` counter to `RegistryEntry`

