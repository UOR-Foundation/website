

# Home Screen UX Audit and Refinement Plan

## Current Assessment

Looking at the screenshot and code, the home screen has strong bones — the immersive wallpaper, centered clock, greeting, and search bar create a calm, focused environment. But several elements break the spell of effortlessness that an Apple-grade experience demands.

## Issues and Recommendations

### 1. Clock Typography — Too Heavy, Not Enough Air

**Problem:** The clock uses `font-bold` at 80px with a tight `tracking-tight`. It feels dense and heavy against the landscape photo. Apple's lock screen clock is bold but uses generous letter-spacing and a lighter optical weight to float above the wallpaper rather than compete with it.

**Fix:** Switch to `font-light` or `font-extralight` (weight 300/200) and increase letter-spacing to `0.08em`. This creates the ethereal, weightless quality that makes it feel like the time is painted onto the air rather than stamped onto the screen. Drop the text-shadow intensity by ~50%.

### 2. Greeting — Lacks Breathing Room and Feels Generic

**Problem:** "Good morning, Explorer." sits 12px (`mt-3`) below the clock — too tight. The period at the end feels formal/robotic. The `tracking-wide` letter-spacing on the greeting fights with the clock's `tracking-tight`, creating a subtle dissonance.

**Fix:** Increase gap to `mt-5` (20px). Remove the trailing period — Apple never punctuates greetings. Reduce letter-spacing to `tracking-normal` for warmth. Lower opacity slightly (from 0.9 to 0.7 in immersive) so the greeting defers to the clock as the clear visual anchor.

### 3. Search Bar — Gap Too Large, Capsule Too Dark

**Problem:** The search bar sits `mt-8` (32px) below the greeting — this pushes it into a separate visual zone instead of feeling like part of one unified cluster. The dark background (`hsl(200 15% 16% / 0.9)`) at 90% opacity is too opaque, killing the immersive glass quality.

**Fix:** Reduce gap to `mt-6`. Lower search bar opacity to 0.6 and increase backdrop-filter blur to `blur(40px)` to create a true frosted-glass effect. Increase border-radius from `rounded-full` to keep it, but add inner padding symmetry (equal left/right padding). Remove the outer box-shadow in immersive mode — the blur is enough.

### 4. Plus (+) Button — Unclear Affordance

**Problem:** The `+` icon on the left of the search bar has no clear meaning. Users won't know it opens a context menu. It looks like it might create a new tab or add something.

**Fix:** Replace with a subtle pill/chip that says "Context" or use a small sparkle/brain icon that hints at intelligence. Alternatively, move context attachment to a secondary interaction (long-press or a subtle row below the search bar) and remove the `+` entirely to keep the search bar pristine.

### 5. Theme Dots — Too Small, No Context

**Problem:** The three dots at the bottom are 7px circles with no labels. They look like pagination indicators (carousel dots), not theme switchers. Users will either miss them entirely or misinterpret them.

**Fix:** Increase to 8-9px. Add a subtle label that appears on hover (tooltip). Use distinct visual identities: the immersive dot should show a tiny gradient, dark should be a filled dark circle with a light ring, light should be a white circle with a subtle border. This makes the function self-evident.

### 6. Tab Bar — Date/Time Redundancy

**Problem:** The TabBar in the top-right shows "Thu, Apr 9 8:40 AM" — duplicating the large clock in the center. This is visual noise. On the home screen, seeing two clocks breaks the "less is more" principle.

**Fix:** When on the home screen (no windows open), fade the TabBar time to 0 opacity or hide it entirely. Only show it when windows are open and the home screen clock is hidden.

### 7. Vertical Centering — Not Quite Right

**Problem:** The content cluster starts at `marginTop: 22vh`. This is a fixed value that doesn't account for the search bar height, meaning the visual center of the entire cluster (clock + greeting + search) is slightly above true center. On taller screens, it floats too high.

**Fix:** Use flexbox vertical centering with a slight upward bias: replace the fixed `22vh` margin with `flex-1` spacers above and below the cluster, with the top spacer at `flex-[1.2]` and bottom at `flex-[1.618]` (golden ratio). This keeps it optically centered across all screen sizes.

### 8. Wallpaper Photo Attribution — Too Prominent

**Problem:** "Bright morning river winding through a valley / Photo · Unsplash" in the bottom-left is readable text that draws the eye away from the center. It competes with the theme dots.

**Fix:** Reduce opacity from `white/30` and `white/20` to `white/15` and `white/10`. Move to bottom-right to avoid competing with the theme dots. Make it appear only on hover of the bottom edge.

## Files to Modify

| File | Change |
|------|--------|
| `src/modules/desktop/DesktopWidgets.tsx` | Clock weight → light, spacing adjustments, search bar glass refinement, remove + icon or redesign, vertical centering via flex |
| `src/modules/desktop/DesktopThemeDots.tsx` | Larger dots with distinct visual identity per theme, hover labels |
| `src/modules/desktop/TabBar.tsx` | Hide time display when home screen is visible (no open windows) |
| `src/modules/desktop/DesktopShell.tsx` | Reduce photo attribution opacity, reposition |

## Design Philosophy

Every change follows one principle: **reduce friction between the human and the content**. The home screen should feel like looking through a window, not at a screen. Typography should float, glass should breathe, and every element should justify its existence or be removed.

