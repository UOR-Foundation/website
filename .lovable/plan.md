

## Update OG Preview (Meta Tags + Image)

Two changes needed to align the link preview with the current hero section:

### 1. Update Meta Descriptions
Update `index.html` meta tags to mirror the hero copy:

- **`<title>`** and **`og:title`** → "The UOR Foundation — Make Data Identity Universal"
- **`meta description`** → "We build open standards that give every piece of data a permanent, verifiable address. Discoverable, provable, and trusted everywhere."
- **`og:description`** and **`twitter:description`** → Same as above
- **`og:image:alt`** and **`twitter:image:alt`** → "The UOR Foundation — Make Data Identity Universal"

### 2. Generate New OG Image
Create a new `public/og-image.png` (1200×630) that visually matches the hero section:
- Dark background (#0b1420) with gold/amber node constellation pattern (matching the galaxy/prime constellation aesthetic)
- Headline text: "Make Data Identity UNIVERSAL" in the same typographic style (bold, tracked uppercase)
- Subtle "The UOR Foundation" branding
- Generated via a Python script using Pillow, replacing the current image

### Technical Details
- **File modified:** `index.html` (lines 69-70, 77-80, 87-90)
- **File replaced:** `public/og-image.png`
- OG image generated with Python/Pillow to render the dark constellation aesthetic with gold accent nodes and clean typography

