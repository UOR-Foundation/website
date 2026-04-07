

# Fix UOR Resolve + Add Three-Word Addressing

## Problem

1. **Resolve is broken**: When navigating to `/resolve?cid=...`, the registry lookup fails because the receipt was stored in a different browser context (the Oracle page). The in-memory `Map` only holds entries from the current session's encode operations.
2. **No three-word addressing**: The triword system (`src/lib/uor-triword.ts`) already exists with 256^3 = 16.7M unique addresses, but it's not integrated into the Resolve page or the receipt registry.

## Solution

### 1. Add triword to the receipt registry

**File: `src/modules/oracle/lib/receipt-registry.ts`**

- Add `triword` field to `EnrichedReceipt` (computed via `canonicalToTriword(cid)`)
- Index entries by triword in addition to CID and derivation ID
- Export a `lookupByTriword` function that uses `triwordToPrefix` to find matches

### 2. Fix resolve to work with any address format

**File: `src/modules/oracle/pages/ResolvePage.tsx`**

When resolving, detect the input format:
- If it looks like `word.word.word` → treat as triword, look up via triword index in registry. If not found, use `triwordToPrefix` to show the decoded bytes.
- If it starts with `b` (CID) or `urn:uor:` (derivation ID) → existing registry lookup
- If not found in registry for any format → instead of just switching to Encode mode, offer to **re-encode from pasted JSON** while showing what the address decodes to (triword breakdown, hash prefix)

### 3. Add triword as a fifth identity form in results

**File: `src/modules/oracle/pages/ResolvePage.tsx`**

In the Identity card, add a "Triword" row showing the formatted three-word address (e.g., "Meadow · Steep · Keep") with its breakdown (Observer / Observable / Context dimensions).

### 4. Support triword input in the search bar

**File: `src/modules/oracle/pages/ResolvePage.tsx`**

- Update placeholder to: `"Paste a CID, derivation ID, or triword (e.g. meadow.steep.keep)…"`
- Add a third mode tab: **Resolve** | **Encode** | remains two tabs but Resolve accepts all three formats
- When a triword is entered, show the triality breakdown (Observer / Observable / Context) alongside results

### 5. Make receipt badges show triword on hover

**File: `src/modules/oracle/pages/OraclePage.tsx`**

Update `ReceiptBadge` tooltip to show the triword alongside the derivation ID, and navigate using the triword as the URL param: `/resolve?w=meadow.steep.keep`

## Files Changed

| File | Change |
|------|--------|
| `src/modules/oracle/lib/receipt-registry.ts` | Add `triword` to `EnrichedReceipt`, index by triword, export `lookupByTriword` |
| `src/modules/oracle/pages/ResolvePage.tsx` | Accept triword input, show triword in Identity card with breakdown, fix resolve flow for missing entries |
| `src/modules/oracle/pages/OraclePage.tsx` | Show triword in receipt badges, use triword in navigation URL |

## Layout Change (Identity Card)

```text
  IDENTITY
  CID         bafy2bzace...
  Derivation  urn:uor:derivation:sha256:a3f...
  Triword     Meadow · Steep · Keep
              Observer: Meadow | Observable: Steep | Context: Keep
  Glyph       ⠣⠺⠁⠎...
  IPv6        fd00:0075:6f72:a3f0:...
```

