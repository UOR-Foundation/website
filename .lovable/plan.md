

## Align the Oracle with the Semantic Web — Backward-Compatible, Forward-Looking

### What This Is About

The Oracle already implements the W3C Semantic Web Tower when encoding web pages (extracting JSON-LD, Open Graph, RDFa, mapping to 8 layers). The goal is to deepen this alignment so that:

1. **Every object rendered in the Oracle visibly demonstrates Semantic Web compliance** — not just WebPages, but KnowledgeCards too
2. **The existing internet is absorbed losslessly** — all structured data a site already publishes is preserved, surfaced, and enhanced
3. **Programmable semantics become tangible** — users see and interact with the semantic layer, not just consume rendered text
4. **AI agents and humans share the same semantic surface** — every rendered object is simultaneously machine-queryable

### Current State

- **WebPage encoding** already extracts JSON-LD/OG/RDFa via `semantic-extract.ts` and shows the `SemanticWebTower` component
- **KnowledgeCards** (keyword search) have no semantic layer visualization — they stream AI text but don't show W3C compliance
- The `SemanticWebPage.tsx` (static `/semantic-web` page) describes the vision but doesn't connect to the live Oracle experience
- The `SemanticWebTower` component in the Oracle is a simple collapsible list — functional but not delightful

### Changes

#### 1. Semantic Web Tower on Every Object (Not Just WebPages)
**File: `HumanContentView.tsx`**
- Show `SemanticWebTower` for KnowledgeCards too (currently gated to `isWebPage` only)
- Compute layer values for KnowledgeCards: L0=content-addressed, L1=json-ld, L2=urdna2015, L3=wikidata (if QID present), L4=canonical-reduction, L5=singleProofHash, L6=deterministic-trust, Signature=CIDv1
- This makes every rendered object in the Oracle visibly W3C-aligned

#### 2. Existing Semantics Showcase — "What This Site Already Publishes"
**File: `src/modules/oracle/components/ExistingSemanticsBadge.tsx` (new)**
- When encoding a WebPage, show a compact badge strip of what structured data was found: `JSON-LD ✓`, `Open Graph ✓`, `RDFa ✗`, `Meta ✓`
- Each badge is tappable to reveal the raw extracted data (JSON-LD blocks, OG tags, etc.)
- This makes backward compatibility tangible — users see UOR absorbing what already exists

**File: `HumanContentView.tsx`** — Render `ExistingSemanticsBadge` for WebPage objects above the Tower

#### 3. Upgrade SemanticWebTower Visual — Animated Mini-Tower
**File: `src/modules/oracle/components/SemanticWebTower.tsx`**
- Replace the flat dot-list with a stacked mini-tower visualization (tiny colored bars, matching the static page's tower colors)
- Each active layer glows/pulses briefly when the object first loads
- Collapsed state shows a horizontal bar chart (8 tiny colored segments) instead of just "5/8 active" text
- Feels like a "semantic health meter" for the object

#### 4. Interoperability Proof — Live Standards Mapping
**File: `src/modules/oracle/components/InteropBadges.tsx` (new)**
- Below the tower, show small badges for every standard this object is interoperable with: `IPFS (CID)`, `JSON-LD 1.1`, `URDNA2015`, `PROV-O`, `Wikidata`, `ActivityPub`, `DID`
- Each badge links to the relevant W3C spec or standard
- This makes the "complete interoperability" promise visible and verifiable

**File: `HumanContentView.tsx`** — Render `InteropBadges` below the tower for all object types

#### 5. Semantic Web Tower on the Static Page Gets a Live Demo Link
**File: `SemanticWebPage.tsx`**
- Add a "Try It Live" CTA that navigates to `/search?q=semantic+web&immersive=true`
- Add a new section below the comparison table: "See It In Action" with 3 example links:
  - "Encode Wikipedia" → `/search?q=https://en.wikipedia.org/wiki/Semantic_Web`
  - "Ask the Oracle" → `/search?q=semantic+web&immersive=true`
  - "Encode any URL" → `/search` (focuses the input)
- This bridges the static informational page with the live experience

#### 6. Agent-Readable Semantic Header in Rendered Objects
**File: `ResolvePage.tsx`**
- When an object is rendered, inject a `<script type="application/ld+json">` into the page `<head>` containing the full canonical JSON-LD of the current object
- This means any AI agent or crawler visiting a rendered page gets full programmatic access to the semantic data — the same surface humans see
- Remove on navigation away (cleanup in useEffect)

### Files Changed

| File | Change |
|------|--------|
| `HumanContentView.tsx` | Show SemanticWebTower + ExistingSemanticsBadge + InteropBadges for all object types |
| `SemanticWebTower.tsx` | Visual upgrade: stacked colored bars, pulse animation, horizontal health meter in collapsed state |
| `ExistingSemanticsBadge.tsx` | **New** — Badge strip showing extracted structured data formats |
| `InteropBadges.tsx` | **New** — Standards interoperability badges with spec links |
| `SemanticWebPage.tsx` | Add "See It In Action" section with live Oracle links |
| `ResolvePage.tsx` | Inject JSON-LD `<script>` for current rendered object into `<head>` |

### What the User Experiences

1. **Search "quantum mechanics"** → KnowledgeCard renders with a glowing mini-tower showing 7/8 semantic layers active, plus badges showing `IPFS · JSON-LD · URDNA2015 · Wikidata · PROV-O` compatibility
2. **Paste a URL** → WebPage renders with "Existing Semantics" badges (`JSON-LD ✓ · Open Graph ✓ · RDFa ✗`) showing what the site already publishes, plus the full tower showing UOR completing the stack
3. **An AI agent visits the page** → finds full JSON-LD in the `<head>`, same data the human sees, programmable and machine-queryable
4. **Visit `/semantic-web`** → the static page now has "See It In Action" links that drop users directly into the live experience

