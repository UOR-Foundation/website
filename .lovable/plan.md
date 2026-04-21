

## Tighten `/blog/canonical-rust-crate` to MCP-intro length & clarity

Cut the article to ~350 words, MCP-intro voice: short declarative sentences, plain English, no internal jargon, no repetition. Keep the architecture diagram. Drop or fold sections that restate the thesis.

### What stays
- Header (kicker, title, deck, hero, source) — unchanged
- Architecture SVG diagram — unchanged
- Related posts — unchanged

### New body — five sections

1. **What it is** (2 sentences)
   UOR is an open standard, with a Rust reference implementation `uor-foundation`, that gives any structured object a 256-bit content-derived address. It's designed to sit underneath MCP, A2A, and any transport carrying typed objects between agents.

2. **Why it exists** (3 sentences)
   MCP and A2A specify how agents talk. Neither lets the receiver prove the object it got is the one the sender produced. Byte-level schemes like JCS (RFC 8785) break the moment a JSON library re-orders keys or re-encodes a number — the issue tracked across LangGraph, AutoGen, and CrewAI today.

3. **How it works** (kept short, keep `neg(bnot(x)) = succ(x)` line, keep the arrow line)
   Reduce the object to a canonical structural form, then hash it. The reduction is a deterministic operation over ℤ/256ℤ, formally verified in Lean 4. Reorder keys, swap encodings, round-trip through three serializers — the canonical form, and the fingerprint, don't change. Collision resistance comes from SHA-256, exactly as in Git or IPFS.

4. **Architecture** (keep the SVG + one-line intro, drop extra prose)

5. **Use it** (replace "What you write", "Rust pipeline", "What the certificate carries", "Where it differs from prior art", "Try it" — fold into one tight section)
   - 5-line Rust snippet (sender + receiver), unchanged
   - Three bullet links: Playground `/oracle`, `cargo add uor-foundation`, source on GitHub

### What gets cut
- "The gap it fills" (folded into Why it exists)
- "The Rust pipeline" prose about typestate (advanced detail; readers who care will read the crate)
- "What the certificate carries" (witt_bits, UorTime, Landauer) — too deep for an intro
- "Where it differs from prior art" full bulleted comparison — replaced by one sentence in §2 + one parenthetical in §3
- Spec link in footer (already linked from header / nav)

### Files
- `src/modules/community/pages/BlogCanonicalRustCrate.tsx` — replace body sections; header, diagram, related untouched.

### Out of scope
- `ArticleLayout`, blog-posts data, hero image, related-posts logic.

