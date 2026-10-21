# Rewrite the "Same Data, Different Bytes" post from the original paper

Rewrite the existing update post (`/blog/serialization-invariant-integrity`) using the full paper text (Gao & Clark, arXiv:2610.24916, NANDA Workshop at IEEE TPS-ISA 2026). Keep the joint MIT Project NANDA + UOR Foundation framing, cover image, and listing entries.

## Structure (Why / How / What, applied implicitly, no labels)

1. **Lead** - one paragraph: agents exchanging data need to know whether a copy matches what the owner published. Paper credit, venue, authors.
2. **The problem: a mismatch tells you nothing** - checksums hash bytes, not meaning. `34` vs `34.0` breaks the checksum just like changing `34` to `43` does. Small side-by-side example (reference / re-encoded copy A / altered copy B) showing checksum vs identifier result, from the paper's Fig. 1.
3. **The method in four steps** - numbered list: parse exactly (numbers kept as exact decimals) -> normalize text to Unicode NFC -> serialize with JCS (RFC 8785) and re-check no number lost precision -> SHA-256. Short table of what counts as "same" (whitespace, key order, `64`/`64.0`, `0.1`/`1e-1`, Unicode composition, escapes) vs "changed" (values, `7` vs `"7"`, array order, structure). Note: unsupported input is reported as such, never as a mismatch.
4. **Fitting into DataFacts** - identifier published next to the existing checksum with its processing profile; receiver recomputes and compares against the owner's record, not the forwarded copy's claim; missing record means "cannot verify".
5. **What the study found** - 36 datasets, 3 scenarios, 6 models across two providers, 3 repeats. Headline: +80.4 pts vs plain tools and +70.2 pts vs checksum on equivalent copies; +3.5 pts better evidence-backed rejection of altered data. Compact results table.
6. **Use cases** - 4 short cards: agent-to-agent data handoff, data pipelines that reformat JSON, dataset caching and mirrors, audit logs and reproducible AI inputs.
7. **Try it** - link to github.com/UOR-Foundation/uor-addr with copyable install commands for Rust (`cargo add uor-addr`), JS/TS (`npm install @uor-foundation/uor-addr`), Python (`pip install uor-addr`), plus a 3-line "hash two equivalent JSON values, get the same address" description pointing to the repo quickstart.
8. **Sources** - arXiv abstract, HTML version, DataFacts paper, RFC 8785 (JCS), Unicode NFC (UAX #15), Project NANDA, uor-addr repo.

## Style

- Existing post conventions: `text-fluid-body` text, `text-fluid-card-title` headings, no em dashes, plain human-first language, code in mono at body size, reuse `CopyableBlock` for install commands.

## Technical details

- Edit only `src/modules/community/pages/BlogSerializationInvariant.tsx`; update the excerpt in `src/data/blog-posts.ts` / `news-items.ts` if wording changes.
- Verify the page renders in the preview after the change.
