

## Plan: Clickable Drill-Down Detail Views for System Monitor Cards

### What We're Building

Each card and panel in the System Monitor becomes clickable. Clicking opens a detailed sub-view within the same System Monitor window (not a new OS window/tab). The sub-view replaces the dashboard with a rich, full-height detail page for that specific metric — with a back button to return to the overview. This is the same pattern used by hypervisor consoles like Proxmox, vSphere, and Grafana when you click into a panel.

### Architecture

```text
SystemMonitorApp
├── activeView === null → Dashboard (current layout)
├── activeView === "vm" → VM Detail
├── activeView === "cpu" → Processor Detail
├── activeView === "memory" → Memory Detail
├── activeView === "modules" → Modules Detail
├── activeView === "capabilities" → Capabilities Detail
├── activeView === "availability" → System Availability Detail
├── activeView === "kernel" → Kernel Primitives Detail
├── activeView === "stack" → Stack Health Detail
└── activeView === "hardware" → Host Hardware Detail
```

### Detail Views — Content Design

Each view shows a header breadcrumb (`System Monitor / Processors`), a back arrow, and then rich content:

1. **Virtual Machine** — Seal status timeline, derivation ID (full, copyable), glyph fingerprint, session nonce, boot time histogram, last 10 verification timestamps, error budget gauge, degradation log with recommendations.

2. **Processors** — vCPU count, per-core utilization sparklines (simulated from jitter), estimated thread pool status, ring operations throughput benchmark (live: runs 10K ops and reports ops/sec), comparison bar showing WASM vs TS engine speed.

3. **Memory** — JS heap used/limit with gauge, heap growth sparkline (live from `performance.memory`), IndexedDB quota used/total with gauge, storage estimate breakdown, GC pause estimation (if `PerformanceObserver` available).

4. **Modules** — Full list of all bus modules (from receipt.moduleCount + pruning gate data), active/absorbed/orphaned breakdown, module dependency graph as a sortable table, consolidation debt tracker, hygiene score gauge.

5. **Capabilities** — Full capability matrix: WASM, SIMD, SAB, Web Workers, Service Worker, Cross-Origin Isolation, WebGPU, Crypto.subtle, IndexedDB, Performance API — each with status, detection method, and fallback description.

6. **System Availability** — Uptime gauge (large), seal verification history (timestamps of last N verifications), error budget burn rate, SLO target (99.9%), current availability percentage, incident timeline if any degradation events occurred.

7. **Kernel Primitives** — Each of the 7 Fano primitives in its own row with: name, framework, ring basis operations, governed namespaces (full list), verification status, and a "test now" button that re-runs the primitive's verification live.

8. **Stack Health** — Full component table (all 23 components) with name, role, version, criticality badge, status, fallback description. Grouped by criticality tier. Selection Policy (7 criteria) displayed below.

9. **Host Hardware** — Full hardware profile: CPU cores, memory, GPU (full string), display resolution + pixel ratio + color depth, touch capability, user agent (full), network info (`navigator.connection` if available), platform, language, timezone, provenance hash (full, copyable).

### Implementation

**File: `src/modules/boot/SystemMonitorApp.tsx`**

- Add `const [activeView, setActiveView] = useState<string | null>(null)` state
- Make each `GrafanaCard` and `GrafanaPanel` clickable with `onClick={() => setActiveView("id")}` and `cursor-pointer` styling with a subtle hover glow
- Add a `DetailView` component that renders based on `activeView`, with a back button header
- Each detail view is a self-contained section within the same file (they share the same `receipt`, `status`, hooks)
- Animate the transition with a simple opacity + translateY fade-in
- All data comes from existing sources: `receipt`, `kernelData`, `stackSummary`, `collectRuntimeMetrics()`, `getEngine()`, `pruningGate()`, `navigator.*` APIs
- Live data (heap, throughput) uses the existing `useSparkline` hook pattern with `setInterval`

**File: `src/modules/boot/SystemMonitorApp.tsx` sub-components (same file)**

- `DetailHeader` — breadcrumb + back button
- `VmDetail`, `CpuDetail`, `MemoryDetail`, `ModulesDetail`, `CapabilitiesDetail`, `AvailabilityDetail`, `KernelDetail`, `StackDetail`, `HardwareDetail` — one function per view

### Visual Treatment

- Cards get a subtle `cursor-pointer` and a brighter border + slight scale on hover
- Detail views use the same `GrafanaPanel` aesthetic but with more vertical space
- Tables use alternating row opacity for readability
- Gauges reuse the existing `ThresholdBar` and ring SVG patterns
- Live values pulse with a subtle glow animation
- Back button is a clean `← System Monitor` breadcrumb at top-left

### Files Modified

- `src/modules/boot/SystemMonitorApp.tsx` — Add drill-down state, clickable cards, and 9 detail view components

