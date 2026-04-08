

# Open-Source UX Components for UOR OS

## Current State

Your project already uses: React 18, Tailwind CSS, Framer Motion, Radix UI (dialog, tooltip, toast), Lucide icons, Tabler icons, Monaco Editor, Sonner toasts, and dnd-kit. The desktop shell (windows, dock, menu bar, snap zones, Spotlight, theme switcher) is entirely custom-built.

You do **not** have shadcn/ui installed despite the project being scaffolded from a shadcn template — the `src/components/ui` directory is empty.

## Recommendation

Rather than pulling in a heavy "desktop OS" framework (most are outdated, poorly maintained, or clash with your custom shell), the best strategy is to layer **targeted, high-quality primitive libraries** that fill specific gaps. Your custom shell is already strong — these fill the interior of windows and system-level interactions.

### Tier 1 — Install Now (High Impact, Zero Risk)

| Library | What It Gives You | Why |
|---------|------------------|-----|
| **shadcn/ui** (already scaffolded) | Buttons, inputs, selects, dropdowns, sheets, tabs, scroll-area, resizable panels, command palette, context menu, menubar, avatar, badge, progress, skeleton, switch, slider | You already have the Radix dependencies. Running `npx shadcn-ui init` + cherry-picking components gives you a complete, accessible, theme-aware primitive set that matches your frosted-glass aesthetic with minimal CSS overrides. |
| **cmdk** (Command Menu) | Replace your hand-rolled Spotlight with a battle-tested, keyboard-navigable command palette | Your current SpotlightSearch works but lacks accessibility (ARIA), fuzzy matching, and grouped sections. cmdk gives all of this in ~4KB. shadcn/ui wraps it as `<Command>`. |
| **@radix-ui/react-context-menu** | Native-feeling right-click menus with submenus, keyboard nav, checkmarks | Replace your custom DesktopContextMenu with a fully accessible version that supports nested menus (e.g., "View > Grid / List") — something your current impl can't do. |
| **@radix-ui/react-menubar** | A proper menu bar with dropdowns (File, Edit, View, Window, Help) | Your menu bar currently only shows the app name and clock. A real OS has dropdown menus — Radix Menubar gives you this with full keyboard support. |
| **vaul** (Drawer) | Mobile-friendly bottom sheets | On mobile viewports, windows don't work. Vaul gives you swipeable drawers that can serve as the mobile equivalent of desktop windows. |

### Tier 2 — Add When Building Specific Apps

| Library | For Which App Window | Why |
|---------|---------------------|-----|
| **@tanstack/react-table** (already have @tanstack/react-query) | Library, Vault, any data-heavy view | Virtualized, sortable, filterable tables. Essential for showing large datasets without DOM bloat. |
| **react-resizable-panels** | Split-pane layouts inside windows | Like VS Code's panel splits. Useful for the Search app (results left, detail right) or Messenger (contacts + chat). |
| **react-virtuoso** | Long scrolling lists | Virtualizes lists of 1000+ items with ~60fps. Critical for chat history in Messenger, search results, library items. |
| **@floating-ui/react** | Tooltips, popovers, floating menus inside apps | More precise positioning than Radix tooltips, useful for inline annotations in the Oracle or Library apps. |

### Tier 3 — Visual Polish

| Library | Purpose |
|---------|---------|
| **react-spring** or keep **framer-motion** | You already use Framer Motion extensively — no need to switch. But for physics-based window dragging (rubber-band, momentum), react-spring's imperative API can be more performant. |
| **@react-aria/focus** | Focus management across windows — ensures Tab key moves logically between the active window, dock, and menu bar. Critical for accessibility. |

## What NOT to Use

- **Full "web desktop" frameworks** (os.js, web-desktop-environment, ReactOS-web): Outdated, opinionated, would fight your existing architecture.
- **Heavy component suites** (Ant Design, MUI, Chakra): Too opinionated, bundle-heavy, visual style clashes with your frosted-glass aesthetic.
- **Electron-style libraries**: Not relevant — you're building in-browser, not wrapping a browser.

## Implementation Plan

### Step 1 — Initialize shadcn/ui primitives
Generate the shadcn/ui components you need most: `command`, `context-menu`, `menubar`, `dialog`, `scroll-area`, `tabs`, `button`, `input`, `badge`, `skeleton`, `avatar`, `dropdown-menu`, `sheet`, `resizable`. Override their CSS variables to match your three themes (immersive/dark/light).

### Step 2 — Replace Spotlight with shadcn Command
Swap `SpotlightSearch.tsx` internals to use the `<Command>` component (wraps cmdk). Keep your existing open/close logic, animation wrapper, and theme-aware glass styling — just replace the list/input/keyboard handling with Command's built-in behavior. Gains: fuzzy search, ARIA, grouped results, extensible.

### Step 3 — Upgrade Context Menu and Menu Bar
Replace `DesktopContextMenu.tsx` with Radix ContextMenu. Add a proper `DesktopMenuBar` using Radix Menubar with dropdown menus per app (File, Edit, View, Window, Help). Each app can register its own menu items.

### Step 4 — Add mobile drawer fallback
Detect mobile via your existing `useIsMobile` hook. On mobile, instead of floating windows, open apps in a Vaul drawer (swipeable bottom sheet). The dock remains at the bottom.

### Step 5 — Wire up react-resizable-panels for split views
Inside the Search and Messenger windows, use resizable panels for split-pane layouts.

## Performance Notes

All recommended libraries are tree-shakeable and under 10KB gzipped individually. shadcn/ui components are copy-pasted source (not a runtime dependency), so you only ship what you use. Radix primitives are the most performant accessible component library available — they use no global providers and render minimal DOM.

## Files to Create/Modify

- **New**: shadcn/ui component files in `src/components/ui/` (~15 files)
- **Modify**: `SpotlightSearch.tsx` — swap to Command component
- **Modify**: `DesktopContextMenu.tsx` — swap to Radix ContextMenu
- **Modify**: `DesktopMenuBar.tsx` — add Radix Menubar dropdowns
- **Modify**: `DesktopShell.tsx` — mobile drawer routing
- **New**: `src/modules/desktop/MobileShell.tsx` — mobile layout with Vaul drawers

