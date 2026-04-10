
# Convert Library from Page to Standalone App

## Problem
`LibraryPage.tsx` wraps itself in `<Layout>` (full-page navigation chrome with header/footer). When opened as a desktop app window, this creates a nested layout. Other desktop apps like MediaPlayer and AppHub are standalone components without Layout wrappers.

## Changes

### 1. Rewrite `src/modules/oracle/pages/LibraryPage.tsx`
- Remove the `<Layout>` wrapper so the component fills its desktop window directly (like MediaPlayer)
- Remove the `pt-24` top padding (that was compensating for the Layout header)
- The component already has the cinema-dark background and all functionality — just needs the Layout shell stripped

### 2. Update `src/App.tsx` route for `/library`
- Wrap the `/library` route's element in `<Layout>` so the standalone page route still works when accessed via URL
- Pattern: `<Route path="/library" element={<Layout><LibraryPage /></Layout>} />`

This is a minimal, surgical change — two files, ~5 lines modified. The Library keeps all its existing functionality (browse, reader, resonance/fuse views) but now runs properly as a containerized desktop app.

### Files
| File | Change |
|---|---|
| `src/modules/oracle/pages/LibraryPage.tsx` | Remove `<Layout>` wrapper + adjust padding |
| `src/App.tsx` | Wrap `/library` route element in `<Layout>` |
