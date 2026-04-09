

# Standalone System Status Window

## Problem
The system status currently opens as a dropdown panel anchored to the status dot in the top-right corner. The user wants it to feel like a **standalone OS window** — similar to Windows Task Manager or a hypervisor console — that opens as a centered, draggable modal on screen.

## Design

The panel becomes a **centered modal window** with an OS-style title bar (window controls, title, drag handle). The two-column VM/Host layout stays identical — only the container and opening behavior change.

```text
┌─── UOR Virtual OS · System Status ──────────── ─ □ ✕ ─┐
│  ● DEGRADED    UOR/0.2.0              [Copy Report]    │
│  ⡧⠧⣇⢩⢜⡾⢮⡺⣬⡢⢙⠣⡅⠆⡗⣘⡌⡪⠩⠇⡸⠺⠸⠐⢄⣥⣣⢭⣟⠧⣌⢫        │
├───────────────────────────┬────────────────────────────┤
│  VIRTUAL MACHINE          │  HOST DEVICE               │
│  (identical content)      │  (identical content)       │
├───────────────────────────┴────────────────────────────┤
│  ⚠ Issues strip                                       │
├────────────────────────────────────────────────────────┤
│  Lattice-hash sealed · 128-bit preimage               │
└────────────────────────────────────────────────────────┘
```

### Key Changes
- **Centered modal with backdrop** instead of absolute-positioned dropdown
- **OS-style title bar**: "UOR Virtual OS · System Status" with minimize (—), maximize (□), and close (✕) buttons — close dismisses, others are decorative for familiarity
- **Draggable**: Title bar acts as drag handle using pointer events + transform state (no library needed)
- **Fixed position centered**: `fixed inset-0 flex items-center justify-center` with a subtle dark backdrop
- **Same status dot trigger**: Clicking the dot opens the window; clicking ✕ or backdrop closes it

## Files Changed

| File | Change |
|------|--------|
| `src/modules/boot/EngineStatusIndicator.tsx` | Change panel from `absolute right-0 top-8` dropdown to `fixed` centered modal with title bar, window chrome, and drag support. All inner content (two-column layout, footer, issues strip) stays unchanged. |

## Implementation Details

- Add `dragOffset` state (`{ x, y }`) and `onPointerDown/Move/Up` handlers on the title bar div
- Outer container: `fixed inset-0 z-[9000] flex items-center justify-center`
- Backdrop: semi-transparent overlay behind the window
- Title bar: flex row with title text left-aligned, window control buttons right-aligned
- Window buttons styled as small circles (macOS style) or squares (Windows style) — decorative except close which calls `setOpen(false)`
- Remove the old `absolute right-0 top-8` positioning
- `formatMarkdownReport` untouched

