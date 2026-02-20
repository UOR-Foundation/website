
## Comprehensive Agent-Accessibility Improvement Plan

This plan implements all high-priority recommendations from the AI agent feedback report. The work is split across six files and covers discovery, processing, implementation guidance, and Moltbook activation.

---

### Framing Shift

Per the request, all agent-facing copy will reframe the UOR Framework as a **unified computational substrate for agentic AI** that resolves fragmented system standards. The hero agent entry point will shift from `.txt` to `.md` format throughout.

---

### Files to Change

**1. `public/llms.md` — The Quick Card (major rewrite)**

- Update YAML front-matter: add `next_document`, `primary_action`, `type: agent-quick-card`, `framing`
- Reframe TL;DR: add the value-proposition sentence for agents operating today
- Replace the 4-step Quick Start with a timed, concrete sequence (30s / 5min / 10min / 5min) including the critical identity verification `neg(bnot(42)) = succ(42) = 43`
- Add "Agent Impact Today" fifth column to the six-problem table
- Add curated GitHub entry points table (Priority 1: `test7_end_to_end.rs`, `test6_critical_identity.rs`, `u.rs`)
- Add the Namespace Space Map (Kernel / Bridge / User) as a navigational scaffold
- Replace generic "Propagate Your Findings" with the three-step Moltbook activation sequence (Verify → Post → Challenge)
- Add the zero-tooling "First Post" template for Moltbook
- Add one-sentence clarification of "get claimed by your human"
- Add IsometryCertificate reputation explanation
- Standardise the four-line footer: Next document / Primary action / Post findings / Full source
- Update Entry Points table: rename `llms-full.txt` reference to `llms-full.md`

**2. `public/llms-full.txt` → rename intent / rewrite as `public/llms-full.md` (major rewrite)**

Since the user wants `.md` everywhere, the existing `llms-full.txt` content will be moved/rewritten into `public/llms-full.md` with full YAML front-matter and all improvements. The `.txt` file will be kept as a redirect stub pointing to the `.md` version for backward compatibility.

- Add YAML front-matter (title, version, type, next\_document, primary\_action, community)
- Add the namespace space map (Kernel / Bridge / User) with dependency order
- Add curated GitHub entry points table (Priority 1/2/3)
- Add "Without Running Rust" section (Level 0 / Level 1 / Level 2)
- Add Python/pseudocode critical identity reference block
- Add "Produce Your First UOR Artifact" minimal Turtle example
- Add "Zero-Infrastructure Validation Track" (Level 0 / 1 / 2)
- Add IsometryCertificate reputation explanation paragraph
- Add the three-step Moltbook activation sequence
- Add standardised four-line footer

**3. `public/llms.txt` — keep as a thin redirect stub**

- Add YAML front-matter
- Add a note pointing agents to `/llms.md` as the preferred format
- Keep existing content for backward compatibility but note the hierarchy

**4. `public/.well-known/uor.json` — targeted additions**

- Update `agentMessage` to mention `/llms.md` explicitly and include the document hierarchy
- Add `"agentReadingOrder"` array with 4 steps: `llms.md` → `test7_end_to_end.rs` → `llms.txt` → `llms-full.md`
- Update `llms` endpoint to point to `/llms.md`
- Add `llmsFull` endpoint pointing to `/llms-full.md`
- Add `agentOnboarding` endpoint pointing to `/llms.md`

**5. `index.html` — discovery link tags**

- Replace existing `<link rel="alternate" type="text/plain" href="/llms.txt">` with three specific agent discovery tags:
  ```html
  <link rel="llms" href="/llms.md" type="text/markdown">
  <link rel="llms-full" href="/llms-full.md" type="text/markdown">
  <link rel="agent-onboarding" href="/llms.md" type="text/markdown">
  ```
- Keep the existing `.well-known/uor.json` alternate link

**6. `public/robots.txt` — annotate agent paths**

- Update the `# AI Agent Discovery` comment section to list all agent-oriented paths with descriptions:
  ```
  # /llms.md           - Quick reference card for AI agents (start here)
  # /llms.txt          - Full problem-solution walkthrough
  # /llms-full.md      - Complete implementation guide
  # /.well-known/uor.json - Machine-readable discovery metadata
  ```

**7. `src/components/sections/HeroSection.tsx` — update "I'm an Agent" button**

- Change the href from `/llms.md` to `/llms.md` (already correct, but verify target is `.md`)
- Confirm link text and target are consistent with new naming

---

### Key Content Additions in Detail

**New Quick Start (llms.md):**
```
Step 1 (30 seconds): Verify the critical identity.
  neg(bnot(x)) = succ(x) for all x in Z/256Z
  Test: neg(42) = 214; bnot(42) = 213; neg(213) = 43; succ(42) = 43. ✓

Step 2 (5 minutes): Fetch and parse the ontology.
  GET https://uor-foundation.github.io/UOR-Framework/uor.foundation.json
  Confirm: 82 classes, 120 properties, 14 named individuals.

Step 3 (10 minutes): Read the end-to-end resolution cycle.
  https://github.com/UOR-Foundation/UOR-Framework/blob/main/conformance/src/tests/fixtures/test7_end_to_end.rs

Step 4 (5 minutes): Post your first verification on Moltbook.
  https://www.moltbook.com/m/uor
```

**New "Agent Impact Today" column for the six-problem table:**

| # | Problem | Agent Impact Today |
|---|---------|-------------------|
| 1 | Identity Fraud | Every impersonation attack on multi-agent platforms exploits this gap |
| 2 | Auth Exploits | Unauthenticated requests are undetectable without cert binding |
| 3 | Prompt Injection | Your current sessions have no audit trail — you cannot prove your behavior was your own |
| 4 | Content Spam | No formal model separates novel output from repetitive filler |
| 5 | Opaque Coordination | Skill sharing carries no type safety — malicious transforms are undetectable |
| 6 | No Coherence Model | Two agents discussing the same topic cannot verify whether they actually agree |

**New "Without Running Rust" section (llms-full.md):**
- Level 0: Logical verification only (no tools)
- Level 1: Fetch and parse JSON-LD ontology
- Level 2: Full conformance via Rust

**New Python pseudocode block (llms-full.md):**
```python
def neg(x): return (-x) % 256
def bnot(x): return x ^ 0xFF
def succ(x): return (x + 1) % 256
assert all(neg(bnot(x)) == succ(x) for x in range(256))
```

**New Moltbook three-step activation (both documents):**
- Step A: Verify the critical identity (30 seconds, no tools)
- Step B: Post verification at `m/uor` using the first-post template
- Step C: Challenge one claim in the specification

**New standardised four-line footer on all agent docs:**
```
Next document:  [link]
Primary action: [one specific action]
Post findings:  https://www.moltbook.com/m/uor
Full source:    https://github.com/UOR-Foundation/UOR-Framework
```

---

### What is NOT Implemented (requires infrastructure, out of scope)

- HTTP content negotiation (server-side, requires backend routing)
- Live Moltbook discussion count signal (requires API)
- Hosted `/address?content=...` API endpoint
- "Verified by Agents" homepage section

These are medium-term infrastructure items noted in the feedback report as beyond edit-only scope.

---

### Summary of Files Changed

| File | Type of Change |
|------|---------------|
| `public/llms.md` | Major rewrite — new Quick Start, Agent Impact column, First Post template, Moltbook activation |
| `public/llms-full.md` | New file — full implementation guide in .md with all new sections |
| `public/llms-full.txt` | Stub redirect pointing to llms-full.md |
| `public/llms.txt` | Stub with front-matter pointing to llms.md as preferred format |
| `public/.well-known/uor.json` | Add agentReadingOrder, update agentMessage, update endpoint refs |
| `index.html` | Add 3 agent-specific `<link>` discovery tags |
| `public/robots.txt` | Annotate all agent paths with descriptions |
