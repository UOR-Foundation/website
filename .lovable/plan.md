

# Redesign Audit Section for Human-Interpretable Trust

## Current Problems

The expanded audit section uses jargon that means nothing to a lay person:
- **"9/18 verified"** — verified how? what does this mean?
- **"Refined 2×"** — refined what?
- **"Proof"** — sounds legal/academic, not friendly
- **"Parse / Check / Verify / Result"** — developer terminology
- **Claim X-Ray** shows raw grade letters (A/B/C/D) and cryptic `source` strings like `grounded:c0,c1` or `llm-generated`
- **"Verified automatically"** — says nothing useful

## New Design

### Summary line (replaces current actions row)

Replace `9/18 verified | Refined 2× | Proof ▸` with:

- `✓ 9 of 18 statements backed by evidence` (replaces verified count)
- `Answer improved twice` (only if iterations > 1, replaces "Refined 2×")
- `How we checked ▸` (replaces "Proof ▸")

### Trust Breakdown (replaces "Proof Trail")

Replace Parse/Check/Verify/Result with a metrics grid using plain-English labels:

| Metric | Value example | Source |
|--------|---------------|--------|
| **Confidence** | High / Moderate / Low | Mapped from grade A/B → High, C → Moderate, D → Low |
| **Statements checked** | 18 statements analyzed | `claims.length` |
| **Evidence found** | 9 supported by evidence | claims with grade ≤ B |
| **Key topics covered** | 3 of 3 topics addressed | `premisesCount` |
| **Consistency** | All checks agree / Some uncertainty | `converged` boolean |
| **Answer improved** | Yes, twice / Not needed | `iterations` |

Each row gets a small green/amber/red status dot for at-a-glance scanning.

### Claim-by-Claim View (replaces X-Ray)

- Replace grade letters with words: **Proven** / **Verified** / **Plausible** / **Unverified**
- Replace raw `source` strings with plain English:
  - `grounded:...` → "Backed by evidence"
  - `scaffold:...` → "Matches reasoning pattern"
  - `llm-generated` → "No direct evidence"
- Section title: "Statement breakdown" instead of implicit X-ray

### Footer

Replace "Verified automatically" with: **"Every statement checked independently against your question"**

## File to Change

`src/modules/oracle/pages/OraclePage.tsx` — lines ~354-420 (trust bar actions, proof trail, claim X-ray sections)

