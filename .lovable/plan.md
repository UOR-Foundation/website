

## Plan: Self-Reflecting Health Report with LLM Feedback Loop

### The Idea

Add a **"Reflect" button** next to the existing "Export Report" button. When clicked, the system sends the full markdown report to the Oracle (via the existing `uor-oracle` edge function) with a carefully constructed **meta-prompt** that asks the LLM to critique the report itself, the prompts, and suggest concrete improvements. The LLM's response is appended to the report as a new `## AI Reflection (Live)` section and displayed in a streaming panel within the System Monitor.

Each reflection is **content-addressed** — the response is hashed and stored in IndexedDB alongside the report hash, creating a chain of improving observations. On subsequent runs, the system includes the *previous reflection's summary* in the prompt context, so the LLM can track its own improvement trajectory and avoid repeating suggestions.

### Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                  System Monitor UI                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Export    │  │ ⚡ Reflect   │  │ Reflection Panel  │  │
│  │ Report   │  │  (new btn)   │  │ (streaming MD)    │  │
│  └──────────┘  └──────┬───────┘  └───────────────────┘  │
│                       │                                  │
│  report.md ──────────►├──► uor-oracle (new "reflect"    │
│  + prev reflection    │    mode, structured output)      │
│  + report hash        │                                  │
│                       ▼                                  │
│              LLM streams back:                           │
│              1. Report structure critique                │
│              2. Prompt quality improvements              │
│              3. Architecture optimization tasks          │
│              4. Proposed new self-assessment metrics      │
│              5. Revised versions of the 3 prompts        │
│                                                          │
│  Response hash ──► IndexedDB reflection chain            │
└─────────────────────────────────────────────────────────┘
```

### What Changes

**1. Add `reflect` mode to `uor-oracle` edge function** — `supabase/functions/uor-oracle/index.ts`

A new `mode: "reflect"` branch alongside the existing `"quote"` and standard chat modes. Uses a specialized system prompt:

```
You are the UOR Virtual OS self-improvement oracle. You receive a System Health
Report and the previous reflection (if any). Your job is to:

1. REPORT QUALITY: Identify redundancies, missing SRE fields, and structural
   improvements. Be specific — cite exact section names.
2. PROMPT SHARPENING: Rewrite each of the 3 AI Reflection Prompts to be more
   precise, measurable, and actionable. Show the improved prompt text.
3. ARCHITECTURE TASKS: Based on the data, list 3-5 concrete optimization tasks
   ranked by impact/effort. Each must reference a specific metric.
4. NEW METRICS: Propose 2-3 self-assessment metrics to add, with measurement
   method and threshold.
5. DELTA FROM LAST: If previous reflection provided, note what improved and
   what regressed.

Output as structured markdown. Be ruthlessly specific. No platitudes.
```

Uses the `balanced` tier (gemini-2.5-flash) — non-streaming for structured output. Includes `temperature: 0.3` for analytical precision.

**2. Add reflection chain storage** — `src/modules/boot/reflection-chain.ts` (~60 lines)

A small IndexedDB-backed store that:
- Saves each reflection with its report hash and timestamp
- Retrieves the most recent reflection for inclusion in the next prompt
- Computes a content hash of each reflection for chain integrity

**3. Add Reflect button + streaming panel to SystemMonitorApp** — `src/modules/boot/SystemMonitorApp.tsx`

- New "Reflect" button in the footer bar next to "Export Report"
- When clicked: generates the report markdown, fetches previous reflection from IndexedDB, calls oracle in `reflect` mode
- Displays the LLM response in a collapsible panel at the bottom of the monitor with markdown rendering
- Stores the response in the reflection chain on completion

**4. Evolving prompts** — the reflection section of the report

Replace the static "AI Reflection Prompts" section with a dynamic version. On first run, the hardcoded prompts are used. After the first reflection, the LLM's *improved prompts* are stored and used in the next report generation, creating a genuine self-improving loop.

### Technical Details

- **No new dependencies** — uses existing `uor-oracle`, existing `react-markdown` (already in project for Oracle chat), existing IndexedDB patterns from the vault module
- **Non-streaming reflect mode** — unlike chat, reflection uses a single non-streaming call (like quote mode) since we want the complete structured analysis before displaying
- **Reflection chain** is capped at 20 entries to prevent unbounded growth; older entries are pruned
- **The meta-prompt includes the full report** (~4-6KB of markdown), well within token limits
- **Previous reflection summary** is truncated to 2KB max to keep the context focused

### Files Modified
- `supabase/functions/uor-oracle/index.ts` — add `reflect` mode
- `src/modules/boot/reflection-chain.ts` — new, IndexedDB reflection history
- `src/modules/boot/SystemMonitorApp.tsx` — add Reflect button + panel

### Impact
- The system becomes genuinely self-improving: each reflection makes the next report sharper
- The prompts evolve to ask better questions over time
- Architecture suggestions are grounded in actual metrics, not static text
- The reflection chain provides an audit trail of system evolution

