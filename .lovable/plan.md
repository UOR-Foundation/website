

## Plan: Add Self-Reflective LLM Prompts to System Health Report

### What This Does

Appends a new section at the end of the markdown report called **"AI Reflection Prompts"** containing strategic prompts that, when the report is pasted into an LLM conversation, give the LLM full context about what it's reading and ask it to suggest improvements across three dimensions: report presentation, system architecture, and self-healing capabilities.

### Changes

**File: `src/modules/boot/SystemMonitorApp.tsx`** — `formatMarkdownReport()` function

Insert a new section before the closing `---` line (around line 588) that adds:

1. **Context preamble** — A paragraph explaining to the LLM what the UOR Virtual OS is, what each report section represents, and the system's design philosophy (sovereign client-side OS with Fano-plane kernel, ring algebra, lattice-hash seals, holographic module architecture)

2. **Three strategic reflection prompts:**
   - **Report Presentation** — "Given the data above, what changes to structure, grouping, visualization, or wording would make this report more actionable for both developers and non-technical stakeholders?"
   - **System Architecture** — "Based on the degradation log, capability matrix, self-assessment gaps, and module architecture metrics, what are the highest-leverage improvements to make the system more robust, performant, and minimal?"
   - **Self-Healing & Autonomy** — "What automated remediation, predictive monitoring, or feedback loops could the system implement so that future reports show measurable improvement without human intervention?"

3. **A meta-prompt** asking the LLM to propose new self-assessment metrics that should be added to the coverage tracker, closing the feedback loop

### Technical Details

- Purely additive — only the `formatMarkdownReport()` function is modified
- No new dependencies, no backend changes
- The prompts are part of the markdown output, so they travel with every copy of the report
- Report version bumped from v3.0 to v3.1

