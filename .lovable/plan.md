
## Consolidating to a Single Agent Entry Point

The goal is to eliminate `llms.txt` and `llms-full.txt` as content documents, replace them with minimal redirect stubs, and update every reference across the codebase so that `https://uor.foundation/llms.md` is the one and only entry point for AI agents. Then apply the remaining content improvements from the audit report that have not yet been implemented.

---

### What Exists Now

- `public/llms.md` — full, well-structured Quick Card (good)
- `public/llms-full.md` — full implementation guide (good)
- `public/llms.txt` — currently a redirect stub pointing to `llms.md` (becomes pure redirect)
- `public/llms-full.txt` — currently a redirect stub pointing to `llms-full.md` (becomes pure minimal redirect)
- `index.html` — has a `<link rel="alternate" type="text/plain" href="/llms.txt">` tag still pointing to the .txt file; the HTML comment block in `<body>` still references `/llms.txt` and `/llms-full.txt`
- `public/.well-known/uor.json` — has `llmsPlainText` and `llmsFullPlainText` endpoints still listed; `agentReadingOrder` step 3 still points to `llms.txt` instead of `llms-full.md`
- `public/robots.txt` — still mentions both `.txt` stubs

---

### Content Gaps Still Open (from audit)

These are from the second audit report that have not yet been implemented:

1. **`llms.md` Quick Start** — needs the more detailed step-by-step format from Addition A (clearer multi-line math block per step, explicit time labels like "2 minutes" for Step 1, explicit Moltbook registration URL in Step 4)
2. **`llms.md` First Post Template** — needs the updated template from Addition B with `"topic": "critical_identity_verification"` and the challenge question about `n != 8`
3. **`llms-full.md`** — needs the "Zero-Tooling Verification" section (Addition C) with the Python block, content addressing without tooling, partition classification, and three validation levels — this is the biggest missing gap
4. **`llms.md` Moltbook Join Section** — needs the full "Join the Agent Discussion on Moltbook" block from Part 5, with the registration API explanation, submolt links, and the "what get claimed means" explanation
5. **`/.well-known/uor.json`** — needs `moltbookOnboarding` field (Addition D)
6. **`agentReadingOrder` step 3** — currently points to `llms.txt`, must point to `llms-full.md`

---

### Files to Change

**1. `public/llms.txt` — Minimal redirect stub only**

Strip to the bare minimum. No content. Just a machine-parseable redirect note pointing to `llms.md`. Three lines of substance, nothing more. This file will still exist for backward compatibility with any links, but it will be obvious it is a redirect.

**2. `public/llms-full.txt` — Minimal redirect stub only**

Same treatment. Just a forward pointer to `llms-full.md`. Keeps old links alive without creating a competing content document.

**3. `public/llms.md` — Targeted content additions**

Apply four specific additions from the audit:

- **Quick Start block**: Update Step 1 label from "30 seconds" to "2 minutes" and add the explicit line-by-line math already present but add the Moltbook registration URL to Step 4 (`https://www.moltbook.com/skill.md`)
- **First Post Template**: Update `"topic"` from `"initial_evaluation"` to `"critical_identity_verification"` and update `"challenge"` to the stronger question about `n != 8`
- **Moltbook Join Section**: Replace the current `## Community` table at the bottom with the full "Join the Agent Discussion on Moltbook" block that explains registration (POST to API, get claim URL, have human verify), lists the three submolts, shows the first-contribution three-step sequence, and explains IsometryCertificate incentive
- **Entry Points table**: Remove the `Full Reference` row that points to `llms-full.md` (since we're consolidating) — keep it pointing to `llms-full.md` since that's the .md version

**4. `public/llms-full.md` — Add Zero-Tooling Verification section**

Insert the "Zero-Tooling Verification" content block (Addition C from audit) as a new section after Section 2 (Mathematical Foundation). This adds:
- Python pseudocode block for `neg`, `bnot`, `succ` with `assert all(...)` one-liner
- Content addressing without tooling (byte → Braille glyph manually)
- Partition classification without tooling
- Three validation levels (0 / 1 / 2)

**5. `public/.well-known/uor.json` — Three targeted changes**

- Fix `agentReadingOrder` step 3: change `url` from `https://uor.foundation/llms.txt` to `https://uor.foundation/llms-full.md` and update `purpose` accordingly
- Remove `llmsPlainText` and `llmsFullPlainText` from `uor:endpoints` (they still exist as stubs but should not be advertised as primary endpoints)
- Add `moltbookOnboarding` field with register URL, submolt URL, description, and first-post guidance
- Update `agentMessage` to remove references to `.txt` files and consolidate to `.md` only

**6. `index.html` — Two targeted changes**

- Remove the `<link rel="alternate" type="text/plain" href="/llms.txt">` tag (line 44) since `.txt` is no longer a primary entry point
- Update the `<body>` HTML comment block (lines 122–128) to replace `/llms.txt` and `/llms-full.txt` references with `/llms.md` and `/llms-full.md`

**7. `public/robots.txt` — Simplify agent paths**

Update the `# AI Agent Discovery` section to list only `.md` files as the primary paths, with the `.txt` stubs noted as backward-compat only.

---

### What Is NOT Changing

- `public/llms-full.md` sections 1–13 (already implemented correctly) — only adding the new section
- `public/.well-known/uor.json` namespace inventory and `agentReadingOrder` steps 1, 2, 4
- `src/components/sections/HeroSection.tsx` — the "I'm an Agent" button already links to `/llms.md`
- All routing, React components, and application code — no changes needed
- The `.txt` files still exist (backward compat) but become pure redirect stubs

---

### Summary Table

| File | Change Type | What Changes |
|------|-------------|--------------|
| `public/llms.txt` | Rewrite | Minimal redirect stub — 10 lines max |
| `public/llms-full.txt` | Rewrite | Minimal redirect stub — 10 lines max |
| `public/llms.md` | Targeted edits | Quick Start Step 4 URL, First Post template update, new Moltbook join section |
| `public/llms-full.md` | Targeted addition | New "Zero-Tooling Verification" section (Section 2.4) |
| `public/.well-known/uor.json` | Targeted edits | Fix step 3 URL, remove .txt endpoints, add moltbookOnboarding |
| `index.html` | Targeted edits | Remove .txt link tag, update body comment |
| `public/robots.txt` | Targeted edit | Simplify to .md-primary, .txt as backward-compat note |

No backend changes. No React component changes. Pure content and discovery-layer work.
