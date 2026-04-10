

# Reflection Gate — LLM Feedback Pattern Recognizer

## Concept

The Reflection Gate reads the existing **reflection chain** (IndexedDB store of LLM self-reflections) and applies pattern recognition to surface recurring themes: verbosity, redundancy, clutter, security gaps, imprecise output, and performance concerns. Unlike the Pattern Sentinel (which scans source code), this gate scans **LLM conversation feedback** to find what the AI keeps getting wrong.

```text
Oracle conversation → onDone callback → pushReflection()
                                        ↓
                    Reflection Chain (IndexedDB, up to 20 entries)
                                        ↓
                    Reflection Gate reads chain → pattern match
                                        ↓
                    Findings in Health Gates Panel
```

## How It Activates Automatically

The gate runs in two modes:

1. **Passive (every health check)** — When the Health Gates Panel renders, the Reflection Gate reads the latest reflections from IndexedDB and scores them. Zero LLM calls needed — pure pattern matching on stored text.

2. **Active (after every Oracle conversation)** — A small hook in the Oracle's `onDone` callback automatically pushes a micro-reflection summary into the chain. This means every conversation with the Oracle feeds the gate with fresh signal. No manual action required.

The key insight: the reflection chain already exists and already stores LLM output. The gate simply reads it and applies pattern detectors — the same approach as the Pattern Sentinel but targeting conversation content instead of source code.

## Pattern Detectors

Each detector is a regex + weight pair scanning reflection text for known anti-patterns in LLM output:

| Pattern | What It Catches | Severity |
|---|---|---|
| Verbosity markers | "verbose", "too long", "wordy", "unnecessary text" | warning |
| Redundancy | "redundant", "duplicate", "already exists", "repeated" | warning |
| Clutter | "clutter", "noisy", "too many", "overwhelming" | warning |
| Precision gaps | "imprecise", "vague", "unclear", "ambiguous" | warning |
| Security concerns | "unsafe", "vulnerability", "exposed", "leak" | error |
| Performance issues | "slow", "laggy", "memory", "timeout", "heavy" | warning |
| UX friction | "confusing", "unintuitive", "hard to find", "scroll" | info |
| Code bloat | "too much code", "overengineered", "simpler", "leaner" | info |

When a pattern appears in 3+ reflections, it becomes a finding. Frequency and recency are weighted — recent reflections score higher.

## Auto-Injection Hook

To ensure the gate gets fresh data without manual effort, we add a lightweight post-conversation hook to the Oracle stream. When `onDone` fires, a one-line summary of the conversation is pushed to the reflection chain. This is ~5 lines of code in the existing `streamOracle` function — not a new system, just a tap on an existing pipe.

## Files

| File | Action | Purpose |
|---|---|---|
| `src/modules/canonical-compliance/gates/reflection-gate.ts` | Create | Async gate that reads reflection chain, applies pattern detectors, produces findings |
| `src/modules/canonical-compliance/gates/gate-runner.ts` | Update | Add support for async gates (the reflection gate reads IndexedDB) |
| `src/modules/canonical-compliance/gates/index.ts` | Update | Register reflection gate |
| `src/modules/oracle/lib/stream-oracle.ts` | Update | Add post-conversation reflection push in `onDone` |

## How It Shows Up

In the Health Gates Panel alongside all other gates:

- **warning "Verbosity" detected in 5/8 recent reflections** — LLM responses are consistently flagged as too long. Consider tightening system prompts.
- **warning "Redundancy" detected in 4/8 recent reflections** — Repeated content across responses. Review for deduplication.
- **info Reflection Gate tracking 8 entries, 3 patterns above threshold** — System is self-monitoring conversation quality.

## Technical Detail

The gate runner currently expects synchronous gates (`() => GateResult`). The reflection gate needs async IndexedDB access. We add a parallel `AsyncGate` type and `runAllGatesAsync()` that awaits async gates alongside sync ones. The Health Gates Panel switches to the async runner.

