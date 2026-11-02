# Clean social share preview

## Wording
- Title: **UOR Foundation · Your Verifiable Agentic Foundation** (kept)
- Description: **Build, ship and run self-verifying AI applications that just work. From edge to cloud.** (matches the hero line exactly, replaces the longer "systems and applications with..." text)
- Same wording for search results, Facebook/LinkedIn/WhatsApp/Slack and X.

## Preview image (1200 × 630)
- Near black graphite background, nothing else.
- White wireframe logo on the left, vertically centred.
- To its right, the name over two rows in the site's bold heading font:
  "The UOR" / "Foundation"
- The crisp spectrum line (blue → violet → magenta → red → orange → yellow → green → cyan) sits just under the text block, spanning logo to text end, as in your reference.
- Generous margins so no platform crop touches it; checked at full size and at small chat-thumbnail size.

## Technical details
- Render with PIL from the real `uor-icon.svg` (rasterised) and Space Grotesk Bold, so the logo and lettering are exact, not AI-drawn.
- Save as `public/og-image.png` (under a few hundred KB) and a copy in Files for review.
- index.html: update description, og:description, add twitter:title/description, og:url and og:image / twitter:image pointing to `https://universal-coordinate-foundation.lovable.app/og-image.png`, plus og:image width/height/alt.
- Changes reach shared links after the next publish; apps that cached the old preview refresh on their own schedule.
