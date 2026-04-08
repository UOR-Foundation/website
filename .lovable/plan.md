

# "Continue in Oracle" — Seamless Address → Conversation Bridge

## What it does

When viewing any content-addressed result (especially `uor:OracleExchange` entries), a prominent **"Continue in Oracle"** button appears that instantly opens AI Mode pre-populated with the original conversation context. For non-Oracle content, a **"Discuss in Oracle"** button seeds the conversation with that content as context.

## Layout

```text
┌─────────────────────────────────────────┐
│  ← panda.royal.cosmos              🔍  │
├─────────────────────────────────────────┤
│  ADDRESS                                │
│  PANDA · ROYAL · COSMOS                 │
│  IPv6 / CID / engine                    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ✨ Continue in Oracle →         │    │  ← NEW: prominent CTA
│  └─────────────────────────────────┘    │
│                                         │
│  CONTENT                                │
│  { "@type": "uor:OracleExchange", … }  │
│                                         │
│  ⟳ Verify determinism                  │
└─────────────────────────────────────────┘
```

## Changes — Single file: `src/modules/oracle/pages/ResolvePage.tsx`

### 1. Detect OracleExchange content
After a result loads, check if `result.source["@type"] === "uor:OracleExchange"`. This determines the button label and how the conversation is seeded.

### 2. "Continue in Oracle" button (for OracleExchange)
- Placed between the address block and the content block — visually prominent
- Styled as a subtle gradient pill with a Sparkles icon
- On click:
  - Extract `uor:query` and `uor:response` from the source
  - Pre-populate `aiMessages` with `[{role: "user", content: query}, {role: "assistant", content: response, proof: result.receipt}]`
  - Switch to `aiMode = true` and clear the result view
  - The user lands in Oracle with full prior context, ready to continue

### 3. "Discuss in Oracle" button (for non-OracleExchange content)
- Same position, slightly different label: "Discuss in Oracle →"
- On click:
  - Create a system-like user message: "I'm looking at this content-addressed object: [JSON summary]. Help me understand or build on it."
  - Switch to AI mode with that seed message
  - Oracle responds in context of the discovered content

### 4. Animation
- Button enters with a spring animation (slight delay after the address block)
- Transition from result view → AI mode uses a smooth crossfade (opacity + y-translate)

### 5. Chain-of-proof continuity
- When the conversation continues, new proofs reference the same content lineage
- The pre-populated assistant message carries the original `proof` (receipt), maintaining the chain

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Add "Continue/Discuss in Oracle" CTA in result view, wire click to pre-populate AI mode with content from the address, smooth transition |

