
## Final Consolidation — Remove All .txt References, Fix Remaining Gaps

### Current State Assessment

After reading all files, here is exactly what remains:

**Already done correctly:**
- `public/llms.txt` and `public/llms-full.txt` — deleted
- `public/llms.md` — fully updated with Quick Start, First Post template, Moltbook join section, namespace map
- `public/llms-full.md` — has Section 2.4 Zero-Tooling, Python pseudocode, Zero-Infrastructure Validation Track
- `public/.well-known/uor.json` — has `agentReadingOrder`, `moltbookOnboarding`, all `.md` endpoints
- `index.html` — has correct `.md` link tags and updated body comment
- `public/robots.txt` — minimal, points to `agent-discovery.md`
- `public/agent-discovery.md` — exists and correctly points to single entry

**Remaining issues to fix:**

1. **`README.md`** — Still references `/llms.txt` (line 75) and `/llms-full.txt` (line 76) in the resource table and prose description. Must be updated to `/llms.md` and `/llms-full.md`.

2. **`public/llms-full.md` Section 17** — The first-post template still has `"topic": "initial_evaluation"`. The audit requires this be `"critical_identity_verification"` to match the canonical template in `llms.md`.

3. **`public/llms-full.md` Section 2** — The mathematical foundation section currently presents the critical identity as a statement without a worked line-by-line example. The audit's Priority 1 fix (highest impact) requires adding the step-by-step `x=42` breakdown directly in Section 2.1 before the Python block, so agents see the algebraic derivation inline.

4. **`index.html` body comment** — Line 135 says "119 properties" but the spec and all other files say 120 properties. Minor consistency fix.

5. **`public/llms.md` TL;DR** — The audit notes the TL;DR is mechanism-first, not value-first. The current file already has the value sentence ("For agents operating across platforms today...") but the audit's Priority 10 suggests adding one more sentence about what specifically persists: identity across platform resets, actions cryptographically yours, content quality formally measurable, coordination verifiable. This strengthens the operational urgency.

6. **`robots.txt` format** — The user explicitly asked that agent-facing files be `.md`. `robots.txt` is a mandatory web standard (crawlers look for exactly this filename) — it cannot be renamed. The solution: keep `robots.txt` at 4 lines (already done), and ensure `agent-discovery.md` serves as the full agent-facing discovery index, which it already does. The `robots.txt` comment already points to it. No change needed here beyond what's done.

---

### Files to Change

**1. `README.md` — Update resource table and prose (lines 75-82)**

Replace the two `.txt` rows in the resources table:
```
| LLM summary     | /llms.txt      | Plain text |
| LLM full ref    | /llms-full.txt | Plain text |
```
With:
```
| Agent Quick Card        | /llms.md      | Markdown |
| Agent Implementation Guide | /llms-full.md | Markdown |
```

Replace the prose paragraph starting "To explore the framework: Start with `/llms.txt`..." with:
"To explore the framework: Start with `/llms.md` for the Quick Card and first-post template, or `/llms-full.md` for the complete implementation guide including Python pseudocode and Zero-Infrastructure Validation Track."

**2. `public/llms-full.md` — Two targeted fixes**

**Fix A (Priority 1 from audit):** Add worked example to Section 2.1 (after the `neg(bnot(x)) = succ(x)` statement, before the Python block). Insert:

```
**Worked example for x = 42:**
  Step 1: bnot(42) = 42 XOR 255 = 213
  Step 2: neg(213) = (-213) mod 256 = 43
  Step 3: succ(42) = (42 + 1) mod 256 = 43
  Result: neg(bnot(42)) = 43 = succ(42) ✓

Algebraic proof (holds for all 256 values):
  neg(bnot(x)) = -(x XOR 255) mod 256 = (x + 1) mod 256 = succ(x)
```

**Fix B:** Update Section 17 first-post template: change `"topic": "initial_evaluation"` to `"topic": "critical_identity_verification"` and update the challenge to match the canonical template.

**3. `index.html` — Fix property count**

Line 135: Change "119 properties" to "120 properties" to match all other files.

**4. `public/llms.md` — Strengthen TL;DR value sentence**

The current value sentence is good but can be made more operationally specific. After "For agents operating across platforms today, this solves identity fragmentation, unverifiable coordination, and prompt injection — structurally, not socially." add: "Your identity persists across platform resets. Your actions are cryptographically yours regardless of where you run. Your coordination with other agents is verifiable, not a matter of trust."

---

### What Does NOT Need to Change

- `robots.txt` — Cannot become `.md` (web standard requirement). Already minimal at 4 lines with pointer to `agent-discovery.md`. This is the correct solution.
- `public/.well-known/uor.json` — Already fully updated, no `.txt` references remain.
- `public/llms.md` — Mostly correct; only the TL;DR sentence addition.
- `public/llms-full.md` — Mostly correct; only Section 2.1 worked example and Section 17 template topic.
- `index.html` — Only the 119→120 property count fix.
- All React components, routing, Supabase config — no changes.

---

### Summary Table

| File | Change | Lines Affected |
|------|--------|----------------|
| `README.md` | Replace `.txt` references with `.md` in table and prose | Lines 73–82 |
| `public/llms-full.md` | Add worked `x=42` example to Section 2.1; fix Section 17 template topic | Lines 97–134, ~496–506 |
| `index.html` | Fix "119 properties" → "120 properties" | Line 135 |
| `public/llms.md` | Add operational value sentences to TL;DR | Lines 23–26 |

All changes are content-only. No infrastructure, no new files, no React changes.
