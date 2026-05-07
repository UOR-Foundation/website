## Goal

Tighten the Overview "What it is, why it exists, how it works" section so it reads as a precise, developer-grade reference card — not a marketing block.

## Visual changes

1. **Drop the long sentence headline.** Replace `What it is, why it exists, how it works` with a single short title (`Overview`) — the eyebrow + column labels already carry that meaning. Removes the awkward 2-line wrapped headline dominating the section.

2. **Number the columns (01 / 02 / 03).** Small mono numerals in `text-primary/60` above each title. Signals sequence (problem → approach → outcome) and gives the grid a technical, spec-sheet feel.

3. **Promote column titles, demote eyebrow.** Column titles become `font-display` uppercase at `text-fluid-subheading`, not the tiny tracked-eyebrow style. Each column reads as its own mini-section.

4. **Add a thin top rule per column** (`border-t border-border/60 pt-6`) instead of relying only on whitespace. Crisp, grid-like, reminiscent of developer docs (Stripe, Linear, Rust docs).

5. **Tighten body copy** — shorter sentences, parallel structure across the three columns, mono inline tokens for technical nouns (`URLs`, `SHA-256`, `IPv6`, `CID`, `uor-foundation`).

6. **Body type:** drop to `text-[15px] leading-[1.65]` with `text-foreground/75` — denser, more reference-like than `text-fluid-body` at 1.7.

7. **Grid:** `md:grid-cols-3 gap-x-12 gap-y-10` with column titles aligned to a baseline; remove the existing `mb-12` heading gap.

## Final copy (parallel, crisp)

- **01 — Problem.** Identifiers like URLs, paths, and database keys point to a *location*, not the data. Whoever owns the location decides what you receive. Move a file or flip a byte and the same identifier silently returns something different.
- **02 — Approach.** Canonicalize the data, hash the canonical form, use the hash as the address. Same content → same address. Anyone with the bytes recomputes and verifies it locally. No registry, no signing key, no trusted third party.
- **03 — Output.** `uor-foundation` (Rust crate, WASM bindings for JS/TS). One call returns canonical bytes, a SHA-256 derivation ID, an IPv6 / CID / human-readable address, and a one-line verifier.

## Out of scope

- No changes to hero, Install section, or other pages.
- No new dependencies, icons, or animations.
- File touched: `src/modules/core/pages/StandardPage.tsx` only.
