

## Plan: Roam-Inspired Sovereign Intelligence — Effortless Knowledge Amplification

### Philosophy

Roam's deepest insight isn't wiki-links (we already have those). It's the **elimination of organizational burden**. The user never decides where something goes — they just write, and the graph organizes itself. Every piece of context surfaces exactly when relevant, without being summoned.

Our system already has the content-addressing, backlinks, wiki-links, hashtags, attention tracking, and coherence engine. What's missing are the **effortless capture and automatic surfacing** patterns that make Roam feel like thinking out loud.

### What We Build (5 Features)

#### 1. Daily Notes — Temporal Entry Point

Roam's killer feature: every day has a page. You open Roam and you're writing. No folder, no filename, no decision.

**Implementation:**
- New component `src/modules/oracle/components/DailyNotes.tsx` — a minimalist block editor that auto-creates a dated page node in the knowledge graph
- Each day's node: `singleProofHash({ @type: "vault:DailyNote", date: "2026-04-09" })` — deterministic, content-addressed
- Auto-linked to yesterday's note via `schema:previousEntry` edge
- Accessible from the desktop shell via a keyboard shortcut (e.g., `Ctrl+D` / `⌘D`) or a dedicated icon
- Blocks within the daily note are individually addressable (each block gets its own UOR address)
- Wiki-links (`[[topic]]`) and hashtags (`#tag`) in daily notes automatically create graph edges during typing

**Why it's magical:** You open the OS and start capturing thoughts immediately. The graph builds itself around your daily rhythm.

#### 2. Linked References Sidebar — Automatic Context Surfacing

When viewing any knowledge node or search result, automatically show all pages/blocks that reference it — without the user asking.

**Implementation:**
- New component `src/modules/oracle/components/LinkedReferencesSidebar.tsx`
- Uses the existing `getBacklinks()` from `backlinks.ts` to pull all incoming references
- Groups by source type (daily notes, ingested documents, manual entries)
- Shows the **surrounding context** (the paragraph around the link, not just the link itself)
- Appears as a collapsible panel below search results in the Oracle view
- Updates reactively when new content references the current topic

**Why it's magical:** You search for "meditation" and immediately see every time you've ever thought about it, in context. No retrieval effort.

#### 3. Quick Capture — Zero-Friction Inbox

A global hotkey (`Ctrl+Space` / `⌘Space`) summons a floating input anywhere in the OS. Type a thought, hit Enter — it's captured to today's daily note and indexed in the graph. No navigation required.

**Implementation:**
- New component `src/modules/oracle/components/QuickCapture.tsx` — a floating frosted-glass pill (similar to existing `UnifiedFloatingInput`)
- Registered as a global keyboard shortcut in the desktop shell
- Content is appended to the current day's daily note
- Wiki-links and hashtags are parsed and graph edges created in real-time
- Supports voice input (reuses existing `VoiceInput` component)
- Auto-dismisses after capture with a subtle confirmation animation

**Why it's magical:** A thought occurs while you're exploring the graph? `⌘Space`, type, Enter. Gone. Indexed. Linked. Back to what you were doing.

#### 4. Automatic Backlink Suggestions — Unlinked References

Roam's "Unlinked References" feature: scan all your content for mentions of the current topic that *aren't* explicitly linked yet, and offer to create the link with one click.

**Implementation:**
- New function `findUnlinkedReferences(topic: string)` in `src/modules/knowledge-graph/backlinks.ts`
- Scans all ingested text chunks for exact/fuzzy matches of the topic label
- Filters out already-linked nodes
- Surfaces as ghost chips below the Linked References panel: "3 unlinked mentions — Link all?"
- One-click creates `schema:mentions` edges for all matches

**Why it's magical:** The system finds connections you didn't know existed and proposes them. The graph becomes smarter than your memory.

#### 5. Spaced Repetition Surfacing — The Knowledge Stays Alive

The most underappreciated Roam plugin pattern: resurface important nodes based on time decay. If you haven't revisited a heavily-linked node in a while, the system gently reminds you.

**Implementation:**
- New module `src/modules/oracle/lib/resurfacing.ts`
- Scores nodes by: `(backlink_count × recency_decay) + attention_dwell_time`
- Uses the existing `attention-tracker.ts` dwell data and `backlinks.ts` link count
- Surfaces 1–3 "rediscovery" suggestions in the daily note sidebar: "You haven't visited [[Quantum Coherence]] in 12 days — it has 7 linked references"
- Click navigates directly to the node in the graph explorer
- Respects the attention aperture: when focus is high (aperture > 0.7), suggestions are suppressed (Protective Stillness)

**Why it's magical:** Knowledge you've captured doesn't decay into oblivion. The system attends to your knowledge so you don't have to.

### Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/modules/oracle/components/DailyNotes.tsx` | Create | Temporal entry point with block-level editing |
| `src/modules/oracle/components/LinkedReferencesSidebar.tsx` | Create | Auto-surfacing backlink context panel |
| `src/modules/oracle/components/QuickCapture.tsx` | Create | Global floating capture input |
| `src/modules/oracle/lib/resurfacing.ts` | Create | Spaced repetition scoring and suggestion engine |
| `src/modules/knowledge-graph/backlinks.ts` | Modify | Add `findUnlinkedReferences()` |
| `src/modules/knowledge-graph/ingest-bridge.ts` | Modify | Daily note node type support |
| `src/modules/desktop/TabBar.tsx` or shell | Modify | Register global hotkeys (`⌘D`, `⌘Space`) |
| `src/modules/bus/modules/graph.ts` | Modify | Register `graph/daily-note` and `graph/quick-capture` bus ops |

### What This Does NOT Include

- Full Roam-style outliner/block editor (significant scope — future phase)
- Multi-user real-time collaboration on daily notes (needs mesh sync from Phase 3)
- Roam's `{{query}}` syntax (our SPARQL is more powerful; a friendly wrapper is a separate effort)

### Design Principle

Every feature above follows a single rule: **the human does less, the system does more.** Capture is one keystroke. Organization is automatic. Surfacing is proactive. The user's scarce attention is protected — the OS attends to their knowledge graph so they can attend to thinking.

