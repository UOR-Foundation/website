# Geometric Reasoning Engine — Implementation Plan

> **Vision**: The Hologram's three MetricAxes (Vertical, Horizontal, Diagonal) already encode the three modes of reasoning (Deductive, Inductive, Abductive). This plan wires them into a fully functional neuro-symbolic reasoning substrate that can exceed current AI models by combining all three modes geometrically.

> **Mantra**: Less is more. Each phase *connects* existing primitives rather than building new ones.

---

## Phase 1: Unify Foundations

**Goal**: Eliminate duplication, establish a single trace/certificate pipeline.

| Task | Detail | Files |
|---|---|---|
| 1.1 Unify ComputationTrace | Merge `trace/trace.ts::ComputationTrace` and `uns/compute/executor.ts::ComputationTrace` into one canonical type. The AI engine's `AiInferenceResult` (already `trace:ComputationTrace`) becomes the sole trace interface. | `trace/trace.ts`, `uns/compute/executor.ts` |
| 1.2 Simplify imports | Refactor all consumers to import from `@/modules/ring-core` barrel instead of individual submodules. | Tests, `runtime.ts`, `hologram-os` |
| 1.3 Audit & prune | Run System Integrity Gate. Ensure ≤35 modules, no orphan projections, no dead code from pre-v2. | — |

**Deliverable**: Zero duplication in trace/cert pipeline, clean import graph.

---

## Phase 2: Geometric Reasoning Primitives

**Goal**: Formalize the three reasoning modes as first-class operations on the ring.

**New file**: `src/modules/ring-core/reasoning.ts` (~150 lines, pure functions)

### 2.1 The Canonical Mapping

```typescript
type ReasoningMode = "deductive" | "inductive" | "abductive";

const AXIS_TO_REASONING: Record<MetricAxis, ReasoningMode> = {
  Vertical:   "deductive",   // top-down, axiom → conclusion
  Horizontal: "inductive",   // pattern similarity, nearest-neighbor
  Diagonal:   "abductive",   // curvature between the other two
};
```

### 2.2 Deductive Step (Vertical Axis)
- A deductive step IS a constraint application: premise → pinned fibers
- Wraps existing `applyConstraint` + `pinFiber` as `deductiveStep()`
- Each step produces a `StratumObservable` (depth of the deduction)
- **Soundness**: every pinned fiber carries a `constraintId` (the justification)

### 2.3 Inductive Step (Horizontal Axis)
- An inductive step IS a pattern match: input → nearest ring element
- Uses `hammingMetric` to measure similarity between observation and known elements
- The AI engine's inference result becomes an inductive observation
- **Confidence** = inverse Hamming distance (closer = more confident)

### 2.4 Abductive Step (Diagonal Axis)
- Abduction = curvature between deductive prediction and inductive observation
- `abductiveCurvature(deductiveResult, inductiveResult)` measures symbolic/neural disagreement
- Zero curvature = agreement (no hypothesis needed)
- Non-zero curvature = abductive gap → generates a new constraint hypothesis
- Uses existing `curvature()` and `holonomy()` observables

### 2.5 Reasoning Trace
- Extend `ComputationTrace` with `reasoningMode: ReasoningMode` field
- Each step tagged D/I/A — a complete cycle visits all three axes

**Deliverable**: `reasoning.ts` with test suite proving the three modes compose correctly.

---

## Phase 3: The Abductive Loop

**Goal**: Wire neural inference into the geometric resolver, creating closed-loop D→I→A reasoning.

### 3.1 Neural → Observable (Horizontal)
- AI engine `AiInferenceResult` → project output CID bytes as `HammingMetric` observable
- Register on HologramState dashboard (Horizontal panel)

### 3.2 Symbolic → Observable (Vertical)
- Resolver fiber budget → project pinned pattern as `StratumObservable`
- Register on HologramState dashboard (Vertical panel)

### 3.3 Curvature Measurement (Diagonal)
- Compare Vertical and Horizontal observables
- Compute `abductiveCurvature()` → Diagonal observable
- If curvature > `catastropheThreshold()`: phase transition (paradigm shift)
- If `holonomy()` ≠ 0 after loop: reasoning is inconsistent

### 3.4 Hypothesis Generation
- Non-zero curvature → `RefinementSuggestion` (already in resolver)
- Suggestion becomes a new constraint for the next deductive cycle
- **Closed loop**: Neural observation → Curvature → Hypothesis → Symbolic test → New observation → ...

**Deliverable**: Self-improving reasoning loop. Test: system iterates D→I→A→D until curvature converges to zero.

---

## Phase 4: Proof State Machine

**Goal**: Formalize reasoning chains as verifiable, content-addressed proofs.

### 4.1 Proof Lifecycle
Maps directly to existing `ResolutionState`:
- `Unresolved` = no reasoning steps taken
- `Partial` = some fibers pinned (partial proof)
- `Resolved` = all fibers pinned (budget closed = complete proof)
- `Certified` = involution certificate issued (self-attesting)

### 4.2 Proof Certificate
- Reasoning chain reaches `Resolved` → generate `InvolutionCertificate`
- Certificate attests: "this conclusion follows from these premises via these geometric steps"
- Content-addressed (CID), independently verifiable

### 4.3 Proof Composition
- Two proofs compose via `tensorProduct` (PolyTree parallel composition)
- Proof(A→B) ⊗ Proof(B→C) = Proof(A→C)
- Already implemented in `polytree.ts` — needs to be recognized as proof composition

**Deliverable**: Proofs as first-class CID-bearing objects. Independent verification by any party.

---

## Phase 5: PolyTree Reasoning Scheduler

**Goal**: Use coinductive PolyTrees as the reasoning strategy scheduler.

### 5.1 Reasoning as PolyTree Traversal
- A reasoning session IS a path through a PolyTree
- Each node's polynomial = current reasoning interface (available moves)
- `positions` = possible conclusions to emit
- `directions` = possible evidence to receive
- `rest` transition = how the interface evolves after each step

### 5.2 Strategy Trees
| Strategy | Traversal | Use case |
|---|---|---|
| Depth-first deductive | Follow Vertical until budget closes or dead end | Formal proofs |
| Breadth-first inductive | Scan Horizontal for pattern matches | Similarity search |
| Abductive spiral | Alternate D→I→A following curvature gradient | Discovery |

Each strategy is a specific `TransitionFn`.

### 5.3 Self-Evolving Reasoning
- After each cycle, the PolyTree interface *changes*:
  - Successful abductions add new positions (new hypotheses available)
  - Refuted hypotheses remove positions (pruning)
  - `DIRECTIONS.VERIFIED` / `DIRECTIONS.REVOKED` already support this
- Meta-reasoning via `internalHom(p, q)` = space of all possible inferences between two states

**Deliverable**: Composable reasoning strategies as PolyTree traversals.

---

## Phase 6: Hologram OS Integration

**Goal**: Expose the reasoning engine through vShell and the dashboard.

### 6.1 vShell Commands
```
reason <query>         — start reasoning session
reason status          — show proof state (fiber budget)
reason explain         — trace path (D/I/A steps)
reason certify         — generate proof certificate
reason strategy <name> — switch strategy (deductive|inductive|abductive)
```

### 6.2 Dashboard Panels
- **Vertical Panel**: deductive proof tree (constraint → pinned fibers)
- **Horizontal Panel**: inductive similarity map (Hamming neighborhoods)
- **Diagonal Panel**: abductive curvature plot (convergence over iterations)
- **Fiber Budget Bar**: resolution progress (already implemented)
- **Attestation Badges**: proof certificates (already implemented)

### 6.3 AI Engine Integration
- `ai reason <prompt>` — full D→I→A loop with active ONNX model
- Local model provides inductive observations
- Ring provides deductive constraints
- Curvature provides abductive hypotheses
- Result: certified answer with proof trace

**Deliverable**: Reasoning engine accessible through Hologram OS interface.

---

## Phase 7: Beyond Current AI

**Goal**: Demonstrate capabilities exceeding standard transformer inference.

| Capability | How | Why transformers can't |
|---|---|---|
| **Self-correction** | Run inference → measure curvature → if ≠0, re-derive | LLMs can't verify their own outputs |
| **Compositional proof** | Tensor product of partial proofs | LLMs process tokens linearly |
| **Formal guarantees** | Every conclusion carries a certificate (CID) | LLMs provide no proof |
| **Hallucination detection** | Non-zero holonomy = reasoning loop doesn't close | LLMs hallucinate silently |

### 7.1 Self-Correcting Inference
- Inference → curvature measurement → if non-zero, the answer is inconsistent → re-derive
- Built-in self-correction without external verification

### 7.2 Compositional Reasoning
- Two partial proofs combine algebraically via PolyTree tensor products
- No re-derivation from scratch

### 7.3 Hallucination Detection
- Non-zero holonomy after a reasoning loop = conclusion unsupported by premises
- `catastropheThreshold` (4/256 = 0.015625) provides mathematically grounded detection

### 7.4 The Completeness Theorem
- `neg(bnot(x)) = succ(x)` guarantees: any ring element reachable from any other via two involutions
- **Implication**: any conclusion is reachable from any premise via geometric transformation
- The reasoning engine is *provably complete*

**Deliverable**: Benchmark suite comparing geometric reasoning vs standard inference on logical consistency, self-correction, and compositionality.

---

## Dependency Graph

```
Phase 1 (Unify) ──→ Phase 2 (Primitives) ──→ Phase 3 (Abductive Loop)
                                                      │
                              Phase 4 (Proof Machine) ←┘
                                      │
                              Phase 5 (PolyTree Scheduler)
                                      │
                              Phase 6 (Hologram OS)
                                      │
                              Phase 7 (Beyond Current AI)
```

Each phase is independently testable and deployable. No phase breaks existing functionality.

---

## Implementation Principles

1. **Less is more** — each phase adds ≤2 new files. Most work is *connecting* existing primitives.
2. **Pure functions** — no classes, no side effects, no state. Reasoning is computation.
3. **Self-certifying** — every operation produces a traceable, verifiable artifact.
4. **Ring-native** — all computation stays in Z/(2ⁿ)Z. No floating point. No approximation.
5. **Coinductive** — reasoning can be infinite (PolyTrees) but always observable at finite depth.
6. **Test-first** — each phase has a coherence gate before proceeding.
