# Footer wordmark: four sharper alternatives

The footer's large outlined "UOR Foundation" with its mark currently reads as a faint grey watermark. I'll build four finished versions, show you each one side by side on the real page, and keep the one you choose.

## The four options

1. **Spectrum Outline**
   A crisp hairline outline for the letters and the mark, filled with the same rainbow spectrum as the Join button glow, drifting very slowly. No glow behind it, so it stays sharp and clean.

2. **Bright Line**
   A near white outline, thicker and clearly visible against the graphite. A very faint spectrum appears only where the mouse hovers over a letter. This is the calmest and most confident option.

3. **Solid Fade**
   Solid letters with no outline. They start bright white at the top and fade into the background toward the bottom, like a premium product footer. The mark matches.

4. **Spectrum Edge**
   A white outline plus a spectrum glow line running along the bottom edge of the letters, as if light is coming from below. The most expressive option, still restrained.

All four options:
- keep the same size, position and spacing the footer has now
- stay sharp on phones (the outline gets thicker there so it never looks fuzzy)
- stop all movement for visitors who turn off animation

## How you'll choose
I'll put one screenshot of each option, taken on the live page, in the chat. Pick one and I'll make it the only version and remove the others.

## Technical details
- Add four CSS modifier classes in `src/index.css` (`.fd-wordmark--spectrum`, `--bright`, `--fade`, `--edge`). The spectrum options use `background-clip: text` over `--fd-spectrum` with a `-webkit-text-stroke` set to transparent fill. The mark SVG gets a matching treatment through a CSS mask filled with the same gradient.
- `FoundationHome.tsx` reads a temporary `?wordmark=` query value so each option can be screenshotted. After you choose, the query switch and unused classes are removed.
- Reduced motion rule pauses the drift. Contrast target: at least 3:1 against `--fd-bg` for the outline.
