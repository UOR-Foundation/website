

## Identity Hub: Holographic Address Projections

Replace the current static 4-row Identity card with an interactive Identity Hub that anchors on IPv6 as the primary address, then lets users generate and explore all canonical projections of that same identity across protocols.

### Design

The Identity section becomes two parts:

**Part 1 — Primary Identity (always visible)**
IPv6 as the hero address, displayed prominently in primary color with larger font. Below it, the triword as a human-friendly alias. Both copyable.

**Part 2 — "Express as…" projection gallery (expandable)**
A button labeled "Express in other formats" toggles open a categorized grid of all hologram projections. Each projection is a small card showing:
- Protocol icon/emoji + name (e.g. 🌐 DID, ⚡ Lightning, 🔗 IPFS CID)
- The generated address value (truncated, mono font)
- Fidelity badge: green dot for lossless, amber dot for lossy
- Copy button

Categories (matching the hologram tier structure):
1. **Foundational** — CID, JSON-LD URN, DID, Verifiable Credential
2. **Native** — IPv6 (already shown above), Braille Glyph, Emoji (new)
3. **Federation** — WebFinger, ActivityPub, AT Protocol
4. **Enterprise** — OIDC, GS1, OCI, Solid, OpenBadges
5. **Infrastructure** — SCITT, MLS, DNS-SD, STAC, Croissant, CRDT
6. **Blockchain** — Bitcoin OP_RETURN, Hash Lock, Lightning, Zcash, Nostr
7. **Fun** — Emoji (new projection), Braille

### New: Emoji Projection
Add an `emoji` projection to `specs.ts`. Maps each byte of the hash to one of 256 curated emoji from stable Unicode blocks. Deterministic, lossless (32 emoji = 256 bits), visually delightful.

### Implementation

**File: `src/modules/uns/core/hologram/specs.ts`**
- Add `emoji` projection: maps each of 32 hash bytes to a curated emoji from a fixed 256-emoji alphabet. Lossless, 32 characters.

**File: `src/modules/oracle/components/IdentityHub.tsx`** (new)
- Takes `receipt: EnrichedReceipt` as prop
- Reconstructs `ProjectionInput` from `receipt.hashHex` and `receipt.cid`
- Calls `project(input)` to get all projections
- Renders: primary IPv6 + triword hero, then expandable categorized grid
- Each projection card: emoji/icon, name, truncated value, fidelity dot, copy button
- Categories rendered as labeled sections with subtle dividers
- Animated expand/collapse with framer-motion

**File: `src/modules/oracle/pages/ResolvePage.tsx`**
- Replace the Identity Card section (lines ~1414-1450) with `<IdentityHub receipt={result.receipt} />`
- Remove the Engine row (move engine indicator elsewhere or into a tooltip)

### Visual Spec
- Primary IPv6: 16px mono, primary color, full width
- Triword: 14px, muted, italic
- Projection cards: compact rows within category sections, alternating subtle bg
- Category headers: 10px uppercase, tracking 0.15em, primary/40
- Fidelity: 6px dot (green = lossless, amber = lossy) with tooltip showing loss warning
- Expand button: subtle "Show all formats →" link, animates the grid open

### Technical Details
- `hashBytes` reconstructed from `receipt.hashHex` via standard hex→Uint8Array conversion
- All projections computed client-side from the hologram registry — no API calls
- Emoji alphabet: 256 entries from stable Unicode blocks (animals, nature, food, objects, symbols) — deterministic mapping by byte index

