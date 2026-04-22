

## Land the single thesis in three places

Three surgical copy edits to `src/modules/community/pages/BlogCanonicalRustCrate.tsx`. Locations confirmed against current file. No structural changes, no other sections touched.

### Edit 1 — TL;DR (line 54)

Append the four-adjective payoff to the closing sentence.

**Find:** `…with no PKI, no registry, no middleman.`

**Replace with:** `…with no PKI, no registry, no middleman — a decentralized, universal, self-verifying identity for any structured object.`

### Edit 2 — "What it is" first paragraph (line 73)

Insert `decentralized` so the four-adjective thesis reads in parallel.

**Find:** `…a permanent, content-derived, self-verifying 256-bit identity, a universal data passport that travels…`

**Replace with:** `…a permanent, decentralized, content-derived, self-verifying 256-bit identity — a universal data passport that travels…`

(Comma → em-dash before "a universal data passport" for rhythm; matches Edit 1's punctuation.)

### Edit 3 — "Why it exists" closing paragraph (line 89)

Replace the mechanism-only ending with the payoff paragraph that names the gap, the move, and the four-adjective thesis.

**Find (the single `<p>` at line 88–89):**

> The obvious fix has already been tried. SEP-2395 (MCPS), which proposed canonical-JSON signing for MCP, was closed on **March 15, 2026** after canonical JSON was shown to produce different bytes in Node.js and Python. UOR solves this one level up, where re-serialization no longer breaks the hash.

**Replace with two paragraphs:**

> The obvious fix has already been tried. SEP-2395 (MCPS), which proposed canonical-JSON signing for MCP, was closed on **March 15, 2026** after canonical JSON was shown to produce different bytes in Node.js and Python.
>
> Every serious attempt to fix integrity at this layer has routed through an authority — a CA, a signing service, a registry, a revocation list — because byte-identity is too fragile to stand on its own. UOR moves the identity one level up, onto the object itself. Same math, every runtime, no middleman. What falls out is the primitive no existing system provides at this layer: **decentralized, universal, content-addressable, self-verifying identity for any object.** The fingerprint is the address. The address is derivable from the object alone, in any language.

The SEP-2395 link and `<strong>March 15, 2026</strong>` are preserved in the first sentence; only the trailing "UOR solves this one level up…" clause is removed and replaced with the new payoff paragraph.

### Guardrails

- No changes to: TL;DR demo block, "What it is" paragraphs 2+, comparison table, failure-modes table, architecture diagram, FourHashesProof, "Try it", "The surface", license, non-goals.
- The four-adjective phrasing stays identical across all three locations: **decentralized, universal, [content-addressable / content-derived], self-verifying** — never "distributed", "permissionless", or "trust-free".

