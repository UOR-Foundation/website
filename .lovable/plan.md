

# Pattern Sentinel Gate — Self-Discovering Anti-Pattern Detector

## Concept

Today, gates like the Canonical Pipeline Gate exist because you manually spotted the "bypass" pattern. The **Pattern Sentinel Gate** automates that discovery: it scans the codebase for recurring terms, idioms, and anti-patterns that appear across multiple files, then surfaces clusters that warrant their own dedicated gate.

This creates a feedback loop:

```text
Codebase → Pattern Sentinel (meta-scan)
         → Surfaces recurring cluster (e.g. "TODO", "any", "eslint-disable")
         → You promote cluster → New atomic gate
         → Pattern Sentinel stops reporting it (handled by dedicated gate)
```

The system becomes self-discovering: the Sentinel finds the patterns, you decide which ones matter, and each promoted pattern becomes an enforceable, auditable gate.

## Architecture

### 1. Pattern Registry (`pattern-registry.ts`)
A declarative list of anti-pattern signatures to scan for, each with:
- `id`: unique key (e.g. `"unsafe-any"`)
- `pattern`: regex or literal string to match
- `fileGlob`: which files to scan (e.g. `*.ts,*.tsx`)
- `severity`: `"error" | "warning" | "info"`
- `threshold`: how many hits before it becomes a finding (e.g. 3+)
- `description`: why this matters
- `promotedToGate`: optional — when set, the Sentinel skips it (a dedicated gate now handles it)

Ships with ~10 starter patterns:
- `bypass` (already has a gate → pre-promoted)
- `as any` / `: any` (type safety erosion)
- `eslint-disable` / `@ts-ignore` (suppressed warnings)
- `TODO` / `FIXME` / `HACK` (unfinished work)
- `console.log` in non-debug files (debug leaks)
- `localStorage.getItem` without try/catch (crash risk)
- `dangerouslySetInnerHTML` (XSS surface)
- `setTimeout` / `setInterval` without cleanup (memory leaks)
- `import.*from ['"]\.\.\/\.\.\/\.\.\/` (deep relative imports)

### 2. Codebase Scanner (`pattern-scanner.ts`)
A function that, given the pattern registry, performs an in-memory scan of known module file paths (static list, same approach as other gates) and returns match counts per pattern per file. This is a static registry approach consistent with the existing gate design — no filesystem access at runtime.

### 3. Pattern Sentinel Gate (`pattern-sentinel-gate.ts`)
Consumes scanner results and produces `GateFinding[]`:
- Each pattern exceeding its threshold becomes a finding
- Clusters (3+ patterns co-occurring in the same file) get an additional "hotspot" finding
- Already-promoted patterns are skipped
- Score: starts at 100, deducts per finding based on severity

### 4. Promotion Workflow
When you decide a pattern warrants its own gate:
1. Set `promotedToGate: "gate-id"` in the registry entry
2. Create the new atomic gate (just like canonical-pipeline-gate)
3. The Sentinel automatically stops reporting that pattern

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/canonical-compliance/gates/pattern-registry.ts` | Create | Declarative anti-pattern definitions with ~10 starters |
| `src/modules/canonical-compliance/gates/pattern-scanner.ts` | Create | Static scanner that counts pattern hits across known files |
| `src/modules/canonical-compliance/gates/pattern-sentinel-gate.ts` | Create | Gate that surfaces recurring patterns + hotspots as findings |
| `src/modules/canonical-compliance/gates/index.ts` | Update | Import sentinel gate for side-effect registration |

## How It Shows Up

The Pattern Sentinel Gate appears alongside all other gates in the existing **Health Gates Panel** on the Compliance Dashboard — one unified view. Its findings look like:

- **🟡 "as any" appears in 14 files** — Type safety erosion across the codebase. Consider creating a dedicated Type Safety Gate.
- **🟡 "TODO" appears in 23 files** — 23 unfinished work markers. Track via a dedicated Tech Debt Gate.
- **🔵 Hotspot: `oracle/bridge.ts`** — 4 different anti-patterns co-occur in this file.

Each finding includes a `recommendation` field suggesting whether to promote to a dedicated gate or resolve inline.

