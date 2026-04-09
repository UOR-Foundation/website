

## Plan: UOR Ring Shortcut System + Keyboard Cheat Sheet

### The Problem

Current shortcuts (`⌘K`, `⌘W`, `⌘M`, `⌘H`) directly conflict with browser-native shortcuts:
- `Ctrl+W` closes the browser tab (catastrophic on Windows/Linux)
- `Ctrl+H` opens browser history
- `Ctrl+M` is used by some browsers
- `Ctrl+K` conflicts with address bar focus in some browsers

Since this runs inside a browser, we cannot `preventDefault()` reliably on many of these — the browser intercepts them before JavaScript.

### The Solution: Ring Prefix Key (`.`)

Introduce a **two-step chord system** using the **period key (`.`)** as the "ring activator". This is inspired by Vim's leader key and tmux's prefix key, but themed around the UOR ring.

**How it works:**
1. Press `Ctrl+.` (Mac: `⌘.`) — this activates "ring mode" for 1.5 seconds. A subtle ring indicator appears on screen.
2. Within that window, press the action key: `K` for Spotlight, `W` for close, `M` for minimize, etc. No modifier needed on the second press.
3. If nothing is pressed within 1.5s, ring mode silently deactivates.

**Why period?** `Ctrl+.` / `⌘.` has almost no browser-native binding (Chrome uses it for nothing, Firefox/Safari have no conflict). It's also thematically perfect — the period is a "point" on the ring.

**Display format:** Shortcuts display as `⌘. K` on Mac, `Ctrl+. K` on Windows — visually distinct, immediately recognizable as a two-step chord.

### Shortcut Registry

| Chord | Action |
|-------|--------|
| `Ring` then `K` | Spotlight search |
| `Ring` then `W` | Close window |
| `Ring` then `M` | Minimize window |
| `Ring` then `H` | Hide all windows |
| `Ring` then `[` | Previous theme |
| `Ring` then `]` | Next theme |
| `Ring` then `V` | Voice input |
| `Ring` then `F` | Toggle fullscreen |
| `Ring` then `?` | Open shortcut cheat sheet |

### Changes

**1. Refactor: `src/modules/desktop/hooks/useDesktopShortcuts.ts`**
- Implement ring prefix state: `ringActive` boolean + 1.5s timeout
- `Ctrl+.` / `⌘.` sets `ringActive = true`, starts timeout, shows indicator
- Second keypress (no modifier required) dispatches the action if `ringActive`
- Clear ring on action dispatch or timeout
- Add `onShowShortcuts` to Handlers interface
- Add `onFullscreen` to Handlers interface
- Remove direct `⌘K`, `⌘W` etc. bindings (they conflict with browser)

**2. New: `src/modules/desktop/components/RingIndicator.tsx`**
- Tiny animated ring glyph (⬡) that appears center-top when ring mode is active
- Fades in, pulses subtly, fades out on deactivate
- Theme-aware (light/dark)
- Shows "Ring active — press a key..." text

**3. New: `src/modules/desktop/components/ShortcutCheatSheet.tsx`**
- Modal/dialog listing all shortcuts in a clean grid
- Grouped by category: Navigation, Windows, Appearance, Tools
- Shows platform-aware glyphs (`⌘. K` vs `Ctrl+. K`)
- Opened via menu item or `Ring` then `?`
- Theme-aware styling matching existing menu aesthetic

**4. Update: `src/modules/desktop/DesktopMenuBar.tsx`**
- Add "Help" menu with "Keyboard Shortcuts" item showing `{modKey}. ?`
- Update all `MenubarShortcut` displays to use ring format: `{modKey}. W` instead of `{modKey}W`

**5. Update: `src/modules/desktop/DesktopContextMenu.tsx`**
- Update shortcut displays to ring format

**6. Update: `src/modules/desktop/TabBar.tsx`**
- Update tooltip shortcut hints to ring format

**7. Update: `src/modules/desktop/SpotlightSearch.tsx`**
- Update any shortcut hint text

**8. Update: `src/modules/oracle/hooks/useVoiceShortcut.ts`**
- Remove direct `Ctrl+Shift+V` binding
- Voice toggle now handled via ring system (`Ring` then `V`)

**9. Update: `src/modules/desktop/DesktopShell.tsx`**
- Add `RingIndicator` component
- Add `ShortcutCheatSheet` state + rendering
- Wire `onShowShortcuts` and `onFullscreen` handlers

**10. Update: `src/modules/desktop/hooks/usePlatform.tsx`**
- Add `ringKey` display string to PlatformInfo: `"⌘."` on Mac, `"Ctrl+."` on Windows/Linux

### Files Summary

| File | Action |
|------|--------|
| `src/modules/desktop/hooks/useDesktopShortcuts.ts` | Ring prefix chord system |
| `src/modules/desktop/components/RingIndicator.tsx` | New — visual ring mode indicator |
| `src/modules/desktop/components/ShortcutCheatSheet.tsx` | New — shortcut reference modal |
| `src/modules/desktop/DesktopMenuBar.tsx` | Help menu + updated shortcut displays |
| `src/modules/desktop/DesktopContextMenu.tsx` | Updated shortcut displays |
| `src/modules/desktop/TabBar.tsx` | Updated tooltip hints |
| `src/modules/desktop/SpotlightSearch.tsx` | Updated hint text |
| `src/modules/desktop/DesktopShell.tsx` | Wire indicator + cheat sheet |
| `src/modules/desktop/hooks/usePlatform.tsx` | Add ringKey display string |
| `src/modules/oracle/hooks/useVoiceShortcut.ts` | Remove direct binding, defer to ring |

### The Result

Zero browser conflicts. `Ctrl+W` does what the user expects (closes the tab). UOR OS shortcuts live in their own namespace — the ring. The two-step chord is fast (muscle memory develops quickly), visually distinctive, and thematically coherent with the UOR ring paradigm. The cheat sheet is always one chord away (`Ring` then `?`).

