

## Streamlined Knowledge Cards + Full Rehydration from Address

### Problem

Two issues:
1. **Slow synthesis**: The edge function call (Wikipedia + AI) blocks for 5-10 seconds with no visual feedback beyond a toast. The user stares at a blank screen.
2. **No rehydration**: The registry is an in-memory `Map`. Once the page refreshes, all encoded objects vanish. Pasting a triword address back yields nothing — the source object is gone.

### Solution

#### Part 1: Progressive Rendering (Speed)

Instead of waiting for the full AI synthesis before showing anything, split the flow into two visible phases:

1. **Instant skeleton + Wikipedia metadata** (~200ms): Call the Wikipedia REST API directly from the client (it's fast, public, no edge function needed). Immediately show a KnowledgeCard skeleton with the title, description, and thumbnail while the AI synthesis loads in the background.

2. **AI synthesis streams in**: The edge function call happens in parallel. When it resolves, the synthesis markdown fades into the already-visible card. The UOR encoding happens after synthesis arrives.

This means:
- In `handleKeywordResolve`: fire Wikipedia fetch client-side immediately, render a partial `Result` with just wiki metadata. Then call the edge function for AI synthesis. When it returns, update the result with full content and run `encode()`.
- Add a `synthesizing` state to `Result` so the UI can show a shimmer/skeleton for the AI content section while it loads.
- The card appears in <1 second with real data (title, image, description from Wikipedia). The AI article fades in 3-5 seconds later.

**Files changed:**
- `ResolvePage.tsx` — split `handleKeywordResolve` into two phases: instant wiki + deferred synthesis
- `HumanContentView.tsx` — add skeleton/shimmer state for the `uor:content` section when `synthesizing` flag is present

#### Part 2: Persistent Rehydration (Database)

Create a `uor_objects` table that stores every encoded object's source JSON alongside its identity forms. When a user pastes a triword/CID/IPv6 address, the system checks:
1. In-memory registry (instant, same session)
2. Database lookup by any identity form (cross-session, cross-device)

**New table:**
```sql
create table public.uor_objects (
  id uuid primary key default gen_random_uuid(),
  cid text unique not null,
  triword text not null,
  ipv6 text not null,
  derivation_id text not null,
  source jsonb not null,
  receipt jsonb not null,
  created_at timestamptz default now()
);

create index idx_uor_objects_triword on public.uor_objects(triword);
create index idx_uor_objects_ipv6 on public.uor_objects(ipv6);
create index idx_uor_objects_derivation on public.uor_objects(derivation_id);

alter table public.uor_objects enable row level security;
create policy "Anyone can read UOR objects" on public.uor_objects for select using (true);
create policy "Anyone can insert UOR objects" on public.uor_objects for insert with check (true);
```

**Integration:**
- After `encode()` succeeds in `receipt-registry.ts`, upsert the source + receipt into `uor_objects`.
- In `handleSearch`, before falling through to keyword resolution, query `uor_objects` by triword/CID/IPv6/derivation_id. If found, rehydrate the in-memory registry and display immediately.
- This makes every UOR address a **permanent, self-describing link** — paste it back anytime, on any device, and get the full object with all visual components.

**Files changed:**
- `receipt-registry.ts` — add `persistToDb()` call after registration, add `rehydrateFromDb(key)` lookup
- `ResolvePage.tsx` — in `handleSearch`, add database lookup before keyword resolution
- New migration for `uor_objects` table

#### Part 3: Edge Function Optimization

Reduce AI synthesis latency:
- Lower `max_tokens` from 2048 to 1200 (500-700 words needs ~1000 tokens)
- Use `google/gemini-2.5-flash-lite` instead of `gemini-3-flash-preview` (faster, cheaper, sufficient for article synthesis)
- These changes alone should cut synthesis time by ~40%

**Files changed:**
- `supabase/functions/uor-knowledge/index.ts` — model + token limit change

### What This Enables

Once every encoded object persists and is retrievable by address:
- **Proof-based transacting**: share a triword like `grove.lost.inlet` — the recipient gets the full knowledge card, AI synthesis, thumbnail, and all UOR metadata instantly
- **Dehydrate/rehydrate**: any object (web page, knowledge card, user content) → address → full reconstruction
- **Universal links**: the address IS the content, persistently, across sessions and devices

### Files Changed Summary

| File | Change |
|------|--------|
| New migration | `uor_objects` table with indexes on all identity forms |
| `src/modules/oracle/lib/receipt-registry.ts` | Add `persistToDb` + `rehydrateFromDb` |
| `src/modules/oracle/pages/ResolvePage.tsx` | Two-phase progressive rendering + DB lookup in search |
| `src/modules/oracle/components/HumanContentView.tsx` | Skeleton/shimmer for synthesizing state |
| `supabase/functions/uor-knowledge/index.ts` | Faster model + lower token limit |

