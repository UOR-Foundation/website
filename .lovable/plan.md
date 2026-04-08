

## Social Layer for UOR Addresses

Every UOR address becomes a living place — somewhere people visit, react to, and discuss. The metaphor: addresses are locations in a universal coordinate space, and this makes them natural gathering points.

### Database Tables

**1. `address_visits`** — Track visitors per address
- `id`, `address_cid` (text), `visitor_fingerprint` (text, anonymous hash), `visited_at` (timestamptz)
- No auth required — public addresses, public visits
- A simple view counter with unique visitor deduplication

**2. `address_reactions`** — Lightweight sentiment (like a star rating but more expressive)
- `id`, `address_cid`, `user_id` (uuid, references auth.users), `reaction` (text — e.g. "resonates", "useful", "elegant", "surprising"), `created_at`
- Authenticated users only
- Unique constraint on (address_cid, user_id) — one reaction per user per address

**3. `address_comments`** — Threaded discussion at each address
- `id`, `address_cid`, `user_id` (uuid), `content` (text), `parent_id` (uuid, nullable — for replies), `created_at`
- Authenticated users only
- RLS: anyone can read, only author can insert

### UI Design

Below the existing metadata block on the result page, add a new **"Community"** section:

**Visitor Counter** — A subtle line: "47 visitors · 12 reactions" with a small animated eye icon. Updates on each view (fires a lightweight insert on result load). No auth needed.

**Reaction Bar** — Four curated reaction buttons in a horizontal row, similar to GitHub's reaction picker but simpler:
- ✦ Resonates — "this makes sense to me"
- ◆ Useful — "I can use this"  
- ◇ Elegant — "beautifully structured"
- ★ Surprising — "unexpected"

Each shows a count. Clicking toggles your reaction (requires auth). Feels like emoji reactions on Slack/GitHub — instantly familiar.

**Comments Thread** — A clean, minimal comment thread below reactions. Each comment shows the user's display name (or anonymous glyph), relative timestamp, and content. Reply support via `parent_id`. A simple text input at the bottom with "Share a thought…" placeholder.

### Implementation

**Edge function: `address-social`**
- `GET ?cid=...` — Returns visit count, reactions summary, and comments for an address. Also records a visit.
- `POST /react` — Toggle a reaction (auth required)
- `POST /comment` — Add a comment (auth required)

**Frontend changes: `ResolvePage.tsx`**
- New `<AddressCommunity cid={result.receipt.cid} />` component rendered after the metadata block
- Uses `useEffect` to fetch social data on mount (which also records the visit)
- Reaction buttons with optimistic UI updates
- Comment thread with auto-refresh

**Realtime** — Enable `supabase_realtime` on `address_comments` so new comments appear live, reinforcing the "gathering place" feeling.

### Files to create/modify

- **New migration**: Create `address_visits`, `address_reactions`, `address_comments` tables with RLS
- **New edge function**: `supabase/functions/address-social/index.ts`
- **New component**: `src/modules/oracle/components/AddressCommunity.tsx`
- **Modified**: `src/modules/oracle/pages/ResolvePage.tsx` — integrate the community component

### Why this works

The reactions are not generic likes — they're curated to reflect how people relate to *ideas and structures* (resonates, useful, elegant, surprising). This makes every address feel like a small plaza in the coordinate space where people naturally congregate around shared meaning.

