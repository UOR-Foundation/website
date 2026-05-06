Tighten the News page formatting so the list feels precise, dense in the right places, and visually delightful — modeled after editorial newsrooms (Stripe Press, Linear changelog, Vercel news).

## Issues in current layout

Looking at the current `/news` view:
- Huge empty band between hero and list (hero has `pt-44 md:pt-56 pb-12 md:pb-20` plus another `py-section-sm` on the list section).
- List rows stretch the full container width, pushing the affordance arrow far away from the title — feels disconnected.
- Date column sits far left, leaving a wide gap before the title.
- Category eyebrow is the same scale/weight as the date — no clear hierarchy.
- Sidebar "Filter / Sort by / View" stack feels loose with mixed control shapes.
- Toolbar above the list ("4 items") is on its own line with a heavy border, adding noise.

## Changes (presentation only — no data or routing changes)

### 1. Hero spacing
- Reduce hero bottom padding (`pb-12 md:pb-20` → `pb-8 md:pb-10`).
- Reduce list section top padding to `pt-10 md:pt-14` so the list starts closer to the headline.
- Drop the redundant top border between hero and list.

### 2. Content column width
- Constrain the news column to a readable measure: wrap the right column in `max-w-[920px]` so titles don't stretch to 1400px+ on wide screens. Affordance arrow now sits close to the title, not at the viewport edge.

### 3. List row redesign (NewsRow)
- Grid: `grid-cols-[96px_1fr_24px]` (was `110/140px_1fr_auto`) — tighter date column.
- Date: smaller, uppercase, monospaced feel — `text-[11px] uppercase tracking-[0.14em] text-foreground/45`.
- Category eyebrow: keep small/uppercase but reduce opacity on hover-state interaction; render above title with `mb-2`.
- Title: use `text-fluid-card-title` but tighten leading to `leading-[1.2]` and add subtle underline-on-hover via `bg-[length:0%_1px] hover:bg-[length:100%_1px]` gradient under the text for a refined editorial accent (or simpler: `decoration-primary/40 underline-offset-4 group-hover:underline`).
- Excerpt: `line-clamp-2`, `text-foreground/60`, `max-w-2xl`.
- Row padding: `py-5 md:py-6` (was `py-6 md:py-7`) — tighter rhythm.
- Divider: lighter `divide-border/40`, with a subtle hover background `hover:bg-foreground/[0.015]` and `-mx-4 px-4 rounded-md` so each row gets a soft hover lozenge.
- Arrow: smaller (`size={16}`), aligned to title baseline (not center), translate on hover.

### 4. Sidebar polish
- Unify control styling: filter buttons, sort, and view toggles all use the same pill height and font size.
- Add count chips with consistent width (`min-w-[24px] text-right`) so the column of counts aligns perfectly.
- Active state: switch from `bg-primary/10` to a thin left accent bar (`border-l-2 border-primary pl-[10px]`) on filter items for a crisper editorial feel; keep the soft fill for sort/view toggles.
- Section labels (`Filter`, `Sort by`, `View`): tighten spacing between groups (`mt-7` → `mt-6`), reduce label size to `text-[10px]`.
- Sticky offset: `lg:top-28` for tighter alignment.

### 5. Toolbar simplification
- Remove the `border-b` under the "4 items" line; replace with just a small caption row above the list (`mb-3`, no border). Lets the first list divider be the visual top edge.

### 6. Grid view card polish
- Tighten card radius (`rounded-lg`), inner padding (`p-5` → `p-6` for breathing room), and switch hover to a 1px primary border + subtle lift (`hover:-translate-y-0.5 transition-transform`).
- Cover aspect: `aspect-[16/10]` for a more editorial proportion.
- "Read more" footer: smaller, single line with arrow at end, no top padding gap (use `mt-4`).

### 7. Micro-typography
- Apply `tabular-nums` consistently to all dates and counts.
- Switch dates to format `Apr 21, 2026` (abbreviated month) for compactness in the narrow date column. Done in-place via `toLocaleDateString` — the underlying `news-items.ts` `date` field stays the source if we want; otherwise format from `isoDate`.

## Files to edit

- `src/modules/community/pages/NewsPage.tsx` — all layout/typography refinements above.

No new files, no data changes, no routing changes.