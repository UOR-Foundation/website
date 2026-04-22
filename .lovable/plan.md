

## Merge Tools into "Try it" — tighten, unify, remove repo reference

Goal: collapse two sections into one cohesive surface that reads as a single, deliberate "here's the endpoint, here are the clients, here's the surface" block. Match the visual language of the other tables in the article (same table chrome, same cell padding, same uppercase header tracking) so a technical reader's eye flows without friction.

### Changes to `src/modules/community/pages/BlogCanonicalRustCrate.tsx`

**1. Delete the standalone `<section><h2>Tools</h2>…</section>` block (lines 296–331)** entirely, including the humuhumu repo footer.

**2. Restructure the existing "Try it" section (lines 278–294)** into one clean flow:

```
H2: Try it

[Lead paragraph — tightened]
Connect any MCP-compatible agent in under a minute. No install, no signup, no config. 
The same canonical endpoint works everywhere:
  https://mcp.uor.foundation/mcp   [live pill]

[McpInstallTabs — unchanged]

H3: The surface
Three tools. That's the whole API.

[Tools table — restyled to match the comparison tables above:
 same `not-prose figure` wrapper, same border/card chrome,
 same uppercase tracking-[0.18em] muted headers,
 same px-5 py-5 cell padding, same text-[15px] md:text-base sizing]

  TOOL                    | RETURNS              | WHAT IT DOES
  uor.encode_address      | sha256:<64-hex>      | 256-bit content address of a UTF-8 string (≤1000 chars), SHA-256 over RFC 8785 JCS.
  uor.verify_passport     | { valid, reason? }   | Re-derive a payload's fingerprint and compare to a claimed passport. Stateless.
  uor.verify_receipt      | { valid, reason? }   | Verify an Ed25519-signed MCPS receipt using only the key embedded in it. No network, no PKI.

[Closing line — single sentence, no italic block, no humuhumu link]
Every response carries a `uor.passport` envelope in `_meta` — and a `uor.mcps.receipt` when MCPS is enabled. Reference Rust implementation at github.com/uor-foundation.
```

### Why this works

- **One section, one job.** "Try it" now answers both "how do I connect?" and "what can I call?" without making the reader scroll past a section break to find the API surface.
- **Returns column promoted.** A technical reader scans return shapes first; splitting "What it does" from "Returns" makes the table readable at a glance instead of as prose-in-a-cell.
- **Visual parity.** Same table chrome as the comparison and SEP-2395 tables → the article reads as one document, not three pages stitched together.
- **No repo confusion.** The humuhumu reference is dropped; the canonical `github.com/uor-foundation` link (already imported as `GITHUB_ORG_URL`) is the single source of truth and stays in the closing line.
- **Word count down by ~40%.** Removed "Source is 250 KB of Rust — review it yourself", "no tool call required", the duplicated "Roadmap and reference Rust implementation at…" small-tag, and the italic envelope block — all redundant with what the section already proves.

### Technical details

- Reuse the exact `<figure className="not-prose my-8 overflow-x-auto rounded-xl border border-border bg-card">` + `<table className="w-full text-[15px] md:text-base leading-relaxed">` pattern from the "How it compares" table.
- Tool names and return shapes in `<code>` (the prose CSS already gives `<code>` the right monospace + subtle background).
- `<h3>` for "The surface" (article prose styles already define h3 sizing — no custom classes needed, preserves uniform typography).
- Drop the `<small>…Roadmap…</small>` line — the closing sentence absorbs that link.
- Net: one section deleted, one section restructured, no new components, no new imports.

