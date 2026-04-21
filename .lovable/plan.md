

## Reframe `/blog/canonical-rust-crate` — "A universal data passport for your AI agent"

Rewrite the post as one focused, trustworthy story for engineers building agentic systems. MCP-docs voice: clean, concise, declarative, no jargon, no hype.

### Header

- **Kicker:** `Standards`
- **Title:** `A universal data passport for your AI agent`
- **Deck:** "An open standard with a Rust reference implementation that gives every structured object a stable, content-derived identity — one that survives the round-trips real agents put it through."
- **Date:** `April 2, 2026`
- **Hero image:** `src/assets/project-uor-identity.jpg`
- **Hero caption:** `An open standard for structured-object identity between agents.`
- **Source link:** `crates.io/crates/uor-foundation`

### Body — six short sections, ~600 words total

No internal terminology. No "imagine", "breakthrough", "revolutionary". Sentence-case headings. One idea per paragraph, ≤3 sentences. Code in fenced blocks. External standards by canonical names only.

1. **The problem** — The same JSON tool-call leaves an agent, passes through a queue, gets re-serialized by another runtime, and arrives with a different hash. MCP and A2A standardize how agents talk; neither lets the receiver prove the object is the one the sender produced. Byte-level integrity (RFC 8785 / JCS) breaks at the first legitimate re-serialization. This is the class of issue showing up across LangGraph, AutoGen, and CrewAI deserialization and state-mismatch threads.

2. **A data passport** — A short, content-derived identifier that travels with the object. Identical meaning produces an identical identifier across languages, runtimes, and serializers. Different meaning always produces a different one.

3. **How it works** — Reduce the object to a canonical structural form, then hash it with a standard cryptographic hash (SHA-256 by default, pluggable). The canonicalization step is small, deterministic, and formally verified in Lean 4. Collision resistance comes from the hash you already trust.
   ```
   object → canonical form → SHA-256 → 256-bit identity
   ```

4. **What you write** —
   ```rust
   use uor_foundation::prelude::*;

   let cert = identify(&tool_call)?;          // sender
   assert_eq!(cert.fingerprint(), expected);  // receiver
   ```
   No keys. No registry. No network. No PKI. The receiver re-runs the same function and compares.

5. **Where it sits next to what you know** —
   - **Git, IPFS, Sigstore** — perfect when the object *is* its bytes; breaks when the bytes legitimately change.
   - **JCS / RFC 8785** — fixes byte order at one moment in time; ends at the first deserialize.
   - **W3C Subresource Integrity** — closest cousin. SRI re-derives a script's identity on arrival; this is SRI for structured objects.
   - **JSON-LD + URDNA2015** — solves canonicalization for RDF; this generalizes the idea and removes the PKI dependency.

6. **What it isn't, and how to try it** — Not a PKI, ledger, namespace, or filesystem. Compose with those when you need them. The Rust crate is the reference implementation; the same pipeline runs in your browser on the playground.
   - Playground: `/oracle`
   - Install: `cargo add uor-foundation`
   - Source: `github.com/uor-foundation`
   - Spec: `/framework`

### Files changed

- `src/modules/community/pages/BlogCanonicalRustCrate.tsx` — new title, deck, kicker, hero import (`@/assets/project-uor-identity.jpg`), new caption, body rewritten to the six sections above. Related-posts logic unchanged.

### Out of scope

- No changes to `ArticleLayout`, CSS, share rail, other blog posts, or `blog-posts.ts`.
- No new image generation.

