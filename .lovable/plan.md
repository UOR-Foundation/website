

## Plan: Implement Error Budget Metric as Live Self-Assessment

### Problem

The "Error Budget" self-assessment metric is hardcoded as `"missing"`. The seal monitor already emits `sovereignty` events (heartbeats and violations) via SystemEventBus, but nothing aggregates them into an error budget percentage. Additionally, SharedArrayBuffer remains ✗ Missing — this is a hosting environment limitation (Lovable preview doesn't serve the required COOP/COEP headers despite our vite config), not a code bug.

### What Changes

**1. Create a seal-event tracker utility** — `src/modules/boot/seal-error-budget.ts`

A small singleton that subscribes to `SystemEventBus.observe("sovereignty")` and tallies heartbeats vs. violations over a rolling window (last 100 events). Exposes:
- `getErrorBudget()` → `{ total: number, failures: number, successRate: number }` where successRate is a percentage like `99.2%`
- Auto-starts on first import

**2. Wire error budget into self-assessment** — `src/modules/boot/SystemMonitorApp.tsx`

- Import the tracker and call `getErrorBudget()` inside `collectRuntimeMetrics()`
- Change the Error Budget item in `buildSelfAssessment()` from hardcoded `"missing"` to `"measured"` when data is available, displaying the live success rate percentage
- Update the markdown report section to include the live value

**3. SharedArrayBuffer status note**

The SAB detection (`typeof SharedArrayBuffer !== "undefined"`) correctly reports ✗ because the Lovable preview host does not serve `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` response headers at the CDN level — our vite dev server headers only apply locally. This is an infrastructure constraint, not a code defect. The report already shows the correct fallback ("Transferable ArrayBuffer"). No code change needed; the system gracefully degrades as designed.

### Technical Details

- **seal-error-budget.ts**: ~40 lines. Subscribes to SystemEventBus on import, maintains a circular buffer of last 100 sovereignty events, classifies each as success (operation starts with "heartbeat" or "boot:") or failure (starts with "violation:")
- **SystemMonitorApp.tsx**: ~15 lines changed in `buildSelfAssessment()` and `collectRuntimeMetrics()` to read from the tracker
- The markdown report Error Budget row will show e.g. `100%` (98/98 checks passed) instead of `—`
- Coverage Score will increase from 38% to 42% (5 measured out of 12)

### Files Modified
- `src/modules/boot/seal-error-budget.ts` (new)
- `src/modules/boot/SystemMonitorApp.tsx` (update Error Budget item)

