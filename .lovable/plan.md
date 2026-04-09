

## Plan: Native Device Adaptation — The OS Feels Like Yours

### The Insight

Every hardcoded `⌘` symbol, every macOS-assumed border-radius, every Apple-centric animation timing — these are invisible friction points for Windows, Linux, and Android users. The fix: a single detection hook (`usePlatform`) that identifies the user's device once, then threads platform-aware values through every touchpoint — shortcuts, typography, chrome styling, interaction patterns, and mobile gestures.

### Detection Strategy

Use `navigator.userAgentData` (modern) with `navigator.platform` + `navigator.userAgent` fallback to classify into five platforms:

```text
"macos" | "windows" | "linux" | "ios" | "android"
```

Detection runs once at mount. Result is cached in a React context and exposed via `usePlatform()`. Every component that currently hardcodes `⌘` or assumes macOS behavior will consume this context instead.

### Changes

**1. New: `src/modules/desktop/hooks/usePlatform.ts`**
Platform detection + context provider. Exports:
- `platform`: `"macos" | "windows" | "linux" | "ios" | "android"`
- `isMac`: boolean (macOS or iOS)
- `isWindows`: boolean
- `isAndroid`: boolean
- `isTouchDevice`: boolean (iOS or Android)
- `modKey`: `"⌘"` on Mac, `"Ctrl"` on Windows/Linux
- `modKeyCode`: `"metaKey"` on Mac, `"ctrlKey"` on Windows/Linux
- `altKey`: `"⌥"` on Mac, `"Alt"` on Windows/Linux
- `fontStack`: Platform-native system font string:
  - macOS/iOS: `"-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui"`
  - Windows: `"'Segoe UI Variable', 'Segoe UI', system-ui"`
  - Linux: `"system-ui, 'Ubuntu', 'Cantarell'"`
- `windowControls`: `"left"` on Mac, `"right"` on Windows/Linux — where close/minimize/maximize buttons go
- `scrollbarStyle`: `"overlay"` on Mac (thin, auto-hiding), `"always"` on Windows/Linux
- `cornerRadius`: Slightly different radii per platform feel (macOS: 10px rounded, Windows: 8px with sharper corners)

**2. New: `src/modules/desktop/hooks/usePlatformShortcuts.ts`**
Replaces `useDesktopShortcuts.ts` with platform-aware key binding:
- On macOS: `⌘K` for Spotlight, `⌘W` close, `⌘M` minimize, `⌘H` hide all
- On Windows/Linux: `Ctrl+K` for Spotlight, `Ctrl+W` close, `Ctrl+M` minimize (or `Win+D` for hide all on Windows)
- All key bindings use `modKeyCode` from the platform context instead of `e.metaKey || e.ctrlKey` (which currently fires on both but displays wrong glyphs)

**3. Update: `src/modules/desktop/DesktopShell.tsx`**
- Wrap with `PlatformProvider` alongside the existing `DesktopThemeProvider`
- Pass platform context down

**4. Update: `src/modules/desktop/TabBar.tsx`**
All hardcoded `⌘` glyphs → `platform.modKey`:
- Line 279: `⌘H` → `{modKey}H`
- Line 287: `⌘K` → `{modKey}K`
- Line 301: title `"Search (⌘K)"` → `"Search ({modKey}K)"`
- Line 433: title `"New tab (⌘K)"` → `"New tab ({modKey}K)"`
- System font applied to tab labels based on platform

**5. Update: `src/modules/desktop/DesktopMenuBar.tsx`**
All `MenubarShortcut` text → platform-aware:
- `⌘H` → `{modKey}H`
- `⌘M` → `{modKey}M`
- `⌘W` → `{modKey}W`
- `⌘K` → `{modKey}K`
- Title `"Spotlight (⌘K)"` → `"Spotlight ({modKey}K)"`

**6. Update: `src/modules/desktop/DesktopContextMenu.tsx`**
- `⌘K` → `{modKey}K`
- `⌘H` → `{modKey}H`

**7. Update: `src/modules/desktop/SpotlightSearch.tsx`**
- Any `⌘K` references in placeholder or hints → platform-aware

**8. Update: `src/modules/oracle/components/VoiceInput.tsx` + `VoiceOverlay.tsx`**
- `navigator.platform?.includes("Mac") ? "⌘" : "Ctrl"` → `usePlatform().modKey`

**9. Update: `src/modules/desktop/hooks/useDesktopShortcuts.ts`**
- Replace `e.metaKey || e.ctrlKey` with platform-specific check: on macOS use `e.metaKey`, on Windows/Linux use `e.ctrlKey` — prevents Ctrl firing on Mac and Meta firing on Windows

**10. Update: `src/modules/desktop/desktop.css`**
- Add platform-specific CSS custom properties applied via `data-platform` attribute on the root:
  - `[data-platform="windows"]` — sharper corners (8px → 6px), visible scrollbars, Segoe UI font
  - `[data-platform="macos"]` — current styling (already macOS-native)
  - `[data-platform="linux"]` — slightly flatter chrome, system-ui font

**11. Update: `src/modules/desktop/MobileShell.tsx`**
- On iOS: bottom dock with rounded squircle icons (current — already Apple-like)
- On Android: Material-style bottom navigation bar with slightly different styling:
  - Less blur, more solid background
  - Rounded rect icons instead of squircles
  - Drawer pulls from bottom with Material motion curves (decelerationCurve: `cubic-bezier(0, 0, 0.2, 1)`)
  - Status bar padding uses Android safe-area conventions
  - Ripple-style touch feedback instead of opacity changes

**12. Update: `src/modules/oracle/hooks/useVoiceShortcut.ts`**
- Platform-aware modifier key detection (same fix as shortcuts)

**13. Update: `src/index.css`**
- Add `[data-platform]` CSS rules for platform-specific scrollbar styling:
  - Windows: visible scrollbar with Fluent-style thin track
  - macOS: overlay scrollbar (current)
  - Linux: minimal scrollbar

### Files Summary

| File | Action |
|------|--------|
| `src/modules/desktop/hooks/usePlatform.ts` | New — Detection + context + platform values |
| `src/modules/desktop/DesktopShell.tsx` | Add PlatformProvider, set `data-platform` on root |
| `src/modules/desktop/hooks/useDesktopShortcuts.ts` | Platform-aware modifier key binding |
| `src/modules/desktop/TabBar.tsx` | Dynamic shortcut glyphs, platform font |
| `src/modules/desktop/DesktopMenuBar.tsx` | Dynamic shortcut glyphs |
| `src/modules/desktop/DesktopContextMenu.tsx` | Dynamic shortcut glyphs |
| `src/modules/desktop/SpotlightSearch.tsx` | Platform-aware hints |
| `src/modules/desktop/MobileShell.tsx` | Android vs iOS differentiation |
| `src/modules/desktop/desktop.css` | Platform-specific CSS custom properties |
| `src/modules/oracle/components/VoiceInput.tsx` | Use `usePlatform()` |
| `src/modules/oracle/components/VoiceOverlay.tsx` | Use `usePlatform()` |
| `src/modules/oracle/hooks/useVoiceShortcut.ts` | Platform-aware modifier |
| `src/index.css` | Platform scrollbar styles |

### The Result

A Windows user sees `Ctrl+K` in every tooltip, gets visible scrollbars, slightly sharper window corners, and a font stack that starts with Segoe UI. A Mac user sees `⌘K`, overlay scrollbars, and the familiar rounded chrome. An Android user gets Material-style bottom nav with ripple feedback. An iOS user gets the current squircle dock. Nobody notices the adaptation — it just feels right. That is the magic.

