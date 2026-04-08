

## Reddit-Style Threaded Discussion for Address Profiles

### What Changes

Transform the flat comment list in `AddressDiscussion` into a fully threaded, collapsible, Reddit-style discussion system with voting, inline replies, sorting, and visual thread lines.

### Database Changes

**New table: `address_comment_votes`** — tracks upvotes/downvotes per comment per user.

```sql
CREATE TABLE public.address_comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.address_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
ALTER TABLE public.address_comment_votes ENABLE ROW LEVEL SECURITY;
-- Anyone can read votes
CREATE POLICY "Anyone can read votes" ON public.address_comment_votes FOR SELECT USING (true);
-- Authenticated users can manage their own votes
CREATE POLICY "Users manage own votes" ON public.address_comment_votes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**Add `score` column to `address_comments`** (denormalized for sort performance):
```sql
ALTER TABLE public.address_comments ADD COLUMN score integer NOT NULL DEFAULT 0;
```

### Edge Function Changes (`address-social/index.ts`)

1. **GET handler**: Return comments with `score` field, and include vote counts. Also return user's own votes when authenticated.
2. **New POST actions**:
   - `action: "vote"` — upsert into `address_comment_votes`, update denormalized `score` on the comment. Toggle logic: same vote removes it, different vote switches it.
   - `action: "get_my_votes"` — return user's votes for all comments on this address (batch fetch for efficiency).
3. **Comments sorting**: Accept `sort` query param (`best`, `new`, `controversial`, `old`). Default `best` (score desc, then newest).

### Frontend: New `AddressDiscussion` Component

Complete rewrite of the discussion section in `AddressCommunity.tsx`:

**Visual Design (Reddit-inspired, adapted to dark cosmic theme):**
- Thread lines: thin vertical `border-left` lines in `primary/10` connecting parent to children, with subtle indentation (24px per level, max 6 levels deep)
- Each comment: avatar | author name + glyph + timestamp | content | action bar
- Action bar: upvote/downvote arrows (▲ ▼), score count, Reply button, Collapse button
- Collapsed threads show "[+] username — X children" as a single clickable line
- Top-level comment box: textarea (not single-line input), with avatar beside it, "Comment" submit button
- Reply boxes: inline textarea that appears below a comment when "Reply" is clicked
- Sort dropdown at the top: Best / New / Old / Controversial

**Thread Rendering:**
- Build a tree from flat `comments[]` using `parent_id`
- Recursive `CommentThread` component renders each node + its children
- Collapse state stored in a `Set<string>` of collapsed comment IDs
- Max visible depth of 8, with "Continue this thread →" link beyond that

**Voting UX:**
- Upvote arrow turns primary color when active, downvote turns amber/red
- Optimistic updates with rollback on error
- Score displayed between arrows (or beside them horizontally)
- Batch-fetch user's existing votes on mount via `get_my_votes`

**Sort Options:**
- Best (default): score desc, then created_at desc
- New: created_at desc
- Old: created_at asc
- Controversial: most total votes with score near zero

**Comment Input:**
- Top-level: always visible at top of discussion, textarea with user avatar
- Reply: inline textarea that expands below the comment, with Cancel + Reply buttons
- Markdown not supported initially (plain text only, keeping it simple)

### Files Modified

1. **`supabase/migrations/...`** — Create `address_comment_votes` table + add `score` column
2. **`supabase/functions/address-social/index.ts`** — Add `vote`, `get_my_votes` actions; update GET to include scores and sorting
3. **`src/modules/oracle/components/AddressCommunity.tsx`** — Full rewrite of `AddressDiscussion`: tree builder, recursive `CommentThread`, vote buttons, collapse, sort dropdown, inline reply, styled thread lines

### Component Structure

```text
AddressDiscussion
├── SortSelector (Best / New / Old / Controversial)
├── TopLevelCommentBox (avatar + textarea + submit)
└── CommentThread[] (recursive)
    ├── CommentNode
    │   ├── ThreadLine (vertical border)
    │   ├── Avatar
    │   ├── Header (author, glyph, timestamp)
    │   ├── Content
    │   ├── ActionBar (▲ score ▼ · Reply · Collapse)
    │   └── InlineReplyBox (when replying)
    └── CommentThread[] (children, indented)
```

