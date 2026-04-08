

# Streamlined Chain of Proofs — Zero-Mode Selection

## Problem
The current flow requires 3+ steps: toggle Chain mode → click checkboxes → click encode. The mode toggle is unintuitive and adds friction.

## Solution: Always-Selectable Chain Dots

Remove the separate "Chain mode" entirely. The chain connector dots on each proof card **are** the selection affordance — always tappable, no mode switch needed.

### UX Flow
1. Each proof card already shows a small dot on its left side. These dots become **always tappable**. One tap = select that proof (dot morphs into a filled checkmark). Another tap = deselect.
2. As soon as ≥1 proof is selected, the floating bottom bar slides up with count + "Copy Chain Address" + "Select All" + clear.
3. "Select All" button in the floating bar encodes the entire conversation chain in one click.
4. Remove the "Chain" toggle button from the header entirely — it's no longer needed.

### Visual Polish
- Unselected dots: subtle `bg-primary/20` with a gentle hover glow to hint tappability
- Selected dots: filled `CheckCircle2` in primary color with a micro spring animation
- Selected proof cards get a soft `border-primary/25` highlight
- Floating bar includes a "Select All" pill for the common "chain everything" case

### Technical Changes

**Single file: `ResolvePage.tsx`**

1. **Remove** `chainSelectMode` state and `toggleChainSelect` function entirely
2. **Remove** the "Chain" button from the Oracle header
3. **Make chain dots always interactive** — the dot on every proof card becomes a button that calls `toggleProofIndex(idx)` directly (currently this only works in chain select mode)
4. **Add hover states** to dots: `cursor-pointer`, subtle scale on hover
5. **Add "Select All"** button to the floating bar that sets all proof indices
6. The floating bar trigger changes from `chainSelectMode && selectedProofIndices.size > 0` to just `selectedProofIndices.size > 0`
7. Update `exitAiMode` to just clear `selectedProofIndices` (no `chainSelectMode` to reset)

### Result
- **0 clicks** to enter selection — just tap any proof dot
- **1 click** for "chain everything" via Select All in the floating bar
- **2 clicks** minimum for any chain: tap a dot → Copy Chain Address
- No mode switching, no cognitive overhead

