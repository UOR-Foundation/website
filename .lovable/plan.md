

## Plan: Redesign Boot Sequence as a Cinematic Terminal Experience

### What We're Building

A complete rewrite of `BootSequence.tsx` that feels like watching a real operating system boot in a hardware terminal. Beautiful ASCII art header, phased log output with deliberate pacing so users can follow along, familiar OS terminology, and a polished CRT-style aesthetic.

### Design

```text
┌────────────────────────────────────────────────────────┐
│                                                        │
│      ╔═══╗   ASCII art UOR OS logo (large, golden)     │
│      ║   ║   + version string + "Virtual Operating     │
│      ╚═══╝     System · Browser Runtime"               │
│                                                        │
│  ─────────────────────────────────────────────────────  │
│  POST  Detecting CPU... 23 cores               [ OK ]  │
│  POST  Detecting memory... 4 GB                [ OK ]  │
│  POST  Detecting GPU... AMD Radeon 8050S       [ OK ]  │
│  POST  Display: 1280×800 @2x                   [ OK ]  │
│  BIOS  WebAssembly runtime............. present [ OK ]  │
│  BIOS  SIMD v128 extensions........... present  [ OK ]  │
│  BIOS  SharedArrayBuffer.............. active   [ OK ]  │
│  BIOS  Web Workers.................... ready    [ OK ]  │
│  ─────────────────────────────────────────────────────  │
│  KERNEL  Loading compute engine (WASM v0.2.0)  [ OK ]  │
│  KERNEL  Ring algebra verification (256/256)    [ OK ]  │
│  KERNEL  Fano primitive P₀ encode............  [ OK ]  │
│  KERNEL  Fano primitive P₁ decode............  [ OK ]  │
│  ...all 7 primitives...                                │
│  KERNEL  Namespace coverage: 35/36             [ OK ]  │
│  KERNEL  Stack minimality check                [ OK ]  │
│  ─────────────────────────────────────────────────────  │
│  BUS  Initializing system bus                  [ OK ]  │
│  BUS  Loading modules... 23 registered         [ OK ]  │
│  BUS  Manifest traceability verified           [ OK ]  │
│  ─────────────────────────────────────────────────────  │
│  SEAL  Generating session nonce                [ OK ]  │
│  SEAL  Computing system seal                   [ OK ]  │
│  SEAL  Derivation: urn:uor:derivation:sha256:… [ OK ]  │
│  SEAL  Glyph: ⡆⡜⣘⡡⣎⡲⣸⢺…                    [ OK ]  │
│  MONITOR  Integrity monitor started            [ OK ]  │
│  ─────────────────────────────────────────────────────  │
│                                                        │
│  ■ SYSTEM SEALED · 190ms · WASM · ⡆⡜⣘⡡⣎⡲⣸⢺          │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 100%         │
│                  Entering desktop...                   │
└────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Deliberate pacing**: Instead of dumping all logs instantly, each line appears with a ~60-120ms staggered delay using a queued rendering approach. The actual `sovereignBoot()` runs at full speed in the background; the UI replays the collected log entries at a readable pace.

2. **Familiar terminology**: Use POST (Power-On Self-Test) for hardware detection, BIOS for capability checks, KERNEL for engine/primitive verification, BUS for module loading, SEAL for cryptographic signing, MONITOR for the integrity watcher. These map directly to real OS concepts.

3. **`[ OK ]` / `[WARN]` / `[FAIL]` badges**: Right-aligned status badges in green/amber/red, exactly like Linux kernel boot output.

4. **ASCII art logo**: A large, elegant hexagonal UOR logo rendered in box-drawing characters at the top, with the OS name and version.

5. **Scanline/CRT effect**: Subtle CSS scanline overlay and slight text glow for atmosphere, without being distracting.

6. **Progress bar**: A block-character progress bar (`█░`) at the bottom that fills as phases complete.

7. **Sound design**: No audio — purely visual.

### Architecture

The component will:
- Call `sovereignBoot(onProgress)` immediately, collecting all progress callbacks into a queue
- After boot completes (or fails), replay the queue with staged timing
- Inject additional "synthetic" log lines between real progress callbacks to fill in detail (hardware specs, each Fano primitive individually, etc.)
- The boot receipt data is used to populate real values (core count, GPU name, module count, hash prefixes)

### Changes

**`src/modules/desktop/BootSequence.tsx`** — Complete rewrite:
- ASCII art header with UOR hexagon logo
- Queued log renderer with staggered timing (~80ms per line)
- Structured phases: POST → BIOS → KERNEL → BUS → SEAL → MONITOR
- Right-aligned `[ OK ]` status badges
- Block-character progress bar
- Subtle scanline CSS overlay
- Same error handling: export log + retry on failure
- Same completion flow: brief pause then `onComplete()`

No other files need to change — the component interface (`onComplete` prop) remains identical.

