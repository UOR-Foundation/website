

# Chain of Proofs — Selectable Multi-Proof Addressing

## Concept

Each Oracle response already produces a **Proof of Thought** (individual UOR address). This feature adds a **Chain of Proofs** layer: the user can select any combination of proofs in a conversation — consecutive or not — and encode them into a single composite UOR address. That address can be searched to reveal exactly the selected chain segment.

## UX Design

### Visual Chain Indicator

A thin vertical line connects all Proof of Thought cards in the conversation, with small chain-link nodes at each proof. This makes the "chain" metaphor visible.

### Selection Mode

- A small **"Chain"** toggle button appears in the Oracle header bar (next to the close button). Clicking it enters **chain selection mode**.
- In this mode, each Proof of Thought card gets a checkbox overlay. The user taps/clicks the proofs they want to include (any combination — consecutive or not).
- A floating bottom bar appears showing: the count of selected proofs, a "Copy Chain Address" button, and a "Cancel" button.
- When the user clicks "Copy Chain Address":
  1. A composite JSON-LD object is built containing all selected proofs (ordered by conversation position).
  2. `encode()` produces a single UOR address for the composite.
  3. The triword is copied to clipboard with a toast confirmation.
  4. The composite is registered in the receipt registry, so searching that triword reveals the chain.

### Search Resolution

When the chain address is looked up via UOR Search, the result card shows:
- A "Chain of Proofs" label (instead of single proof)
- The individual proofs listed in order, each with its own triword
- The original query/response pairs for each link

## Technical Plan

### 1. New state in ResolvePage.tsx

```typescript
const [chainSelectMode, setChainSelectMode] = useState(false);
const [selectedProofIndices, setSelectedProofIndices] = useState<Set<number>>(new Set());
```

### 2. Chain toggle in Oracle header

Add a `Link` icon button next to the close button. Toggles `chainSelectMode`. Only visible when there are 2+ proofs in the conversation.

### 3. Proof card checkbox overlay

When `chainSelectMode` is true, each Proof of Thought card renders a small circular checkbox (left side). Tapping toggles that index in `selectedProofIndices`. Selected cards get a subtle emerald border highlight.

### 4. Floating selection bar

When `selectedProofIndices.size > 0`, a bottom bar slides up with:
- `"{n} proofs selected"` label
- "Generate Chain Address" button (primary style)
- Cancel / clear button

### 5. Chain encoding function

```typescript
async function encodeChain(indices: Set<number>) {
  const selected = [...indices].sort().map(i => aiMessages[i]);
  const chainSource = {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "uor:ChainOfProofs",
    "uor:links": selected.map((msg, idx) => ({
      "@type": "uor:ProofOfThought",
      "uor:position": idx,
      "uor:query": aiMessages[/* find preceding user msg */].content,
      "uor:response": msg.content,
      "uor:proofAddress": msg.proof?.triword,
    })),
    "uor:chainLength": selected.length,
    "uor:timestamp": new Date().toISOString(),
  };
  const receipt = await encode(chainSource);
  return receipt;
}
```

### 6. Search result rendering for chains

When `result.source["@type"] === "uor:ChainOfProofs"`, render a special chain view showing each link with its triword, query, and response — instead of raw JSON.

### 7. Connecting line between proof cards

In the messages list, when there are multiple proof cards, render a thin `border-l border-primary/15` line connecting them, with small dot nodes. This is purely cosmetic — always visible, not just in selection mode.

## Files

| File | Change |
|------|--------|
| `src/modules/oracle/pages/ResolvePage.tsx` | Add chain selection mode, floating bar, chain encode, visual chain connector, chain result rendering |

