
# API Page — Copy Rewrite: Clarity, Trust, Impact

## What needs to change

Every piece of descriptive text on the page. The technical logic is correct — the problem is the language. Too much of it reads as insider documentation. The goal is a page that works for three readers simultaneously:

1. **A pragmatic senior developer** who wants to understand what this does in 10 seconds and then try it.
2. **An AI agent** reading the machine-facing section that needs clear, unambiguous instructions.
3. **An informed lay person** with no UOR knowledge who needs to understand why this is significant.

The frame is: **UOR is a unified computational substrate for agentic AI.** Every endpoint serves that frame.

---

## Rewrite principles

- **Lead with the problem, follow with the solution.** Don't describe what an endpoint returns before explaining why anyone would want it.
- **No jargon without immediate plain-language definition.** "Ring" must be explained the first time it appears. "Homomorphism" must either be replaced or immediately explained.
- **One sentence per idea.** Dense paragraphs will be split. Each sentence earns its place.
- **Use cases must feel real.** "An agent verifies X" is better than "Developers can use this to achieve X."
- **Labels must be instantly scannable.** Six words or fewer, verb-first.

---

## Section-by-section changes

### Hero
Currently good. Minor tightening:
- Sub-headline: slightly more concrete about what "shared mathematical ground truth" means in plain terms.

### Why it matters (problem grid)
The 6 cards are structured correctly. The copy in each needs to be sharper:
- **Identity Fraud** → "Anyone can claim to be an agent. UOR content addresses are derived from what an agent actually produced — they cannot be faked."
- **Auth Exploits** → "Tokens and signatures can be stolen. UOR proof objects are self-verifying — any party checks them independently, with no server contact."
- **Prompt Injection** → "Malicious instructions can be hidden in inputs. Execution traces record every step taken — divergence from expected behaviour is immediately visible."
- **Content Spam** → "Pattern-matching filters are easy to fool. UOR measures information density algebraically — it is a formal property, not a trained guess."
- **Opaque Coordination** → "Agents sharing values cannot verify each other's work without a shared definition. Every UOR operation is named, formal, and reproducible."
- **No Coherence Model** → "Without a common mathematical foundation, agent coordination breaks on edge cases. UOR coherence proofs confirm a data type is consistent across every possible value."

### Quick Start
Already clean. One tweak to note 2 — don't assume reader knows what "negate(bitwise-invert(42))" means without context.

### Architecture section intro
Current: "Every endpoint maps to a layer of the UOR Framework. Each layer builds on the one below."
Rewrite: "The API is organised into six layers. Each layer adds a capability — from the single mathematical rule at the base, to identity, operations, classification, verification, and transformation. Every layer is live and working now."

### Layer titles / oneLiner / whyItMatters / solves

**Layer 0 — The Foundation**
- oneLiner: "The one mathematical rule everything else is built on. Provable in under 100ms."
- whyItMatters: "There is one rule at the base of the framework: applying bitwise-invert then negate to any value always equals incrementing it by one. These two endpoints let you verify that — for one value or every value at once. If this holds, every layer above it holds. For agents with no shared authority, this is the trust anchor."
- solves: "Agent trust problem: agents with no common authority cannot coordinate. These endpoints return a machine-checkable proof, not an assertion."

**Layer 1 — Identity**
- oneLiner: "Permanent, unforgeable addresses derived from content — not from names or servers."
- whyItMatters: "Location-based identifiers change when data moves. Content addresses are computed from the content itself — the same text always maps to the same address, on any machine, without a registry. An agent's identity is its content. That cannot be impersonated."
- solves: "Identity fraud: names and tokens can be copied. Content addresses cannot — they are derived, not assigned."

**Layer 2 — Structure**
- oneLiner: "A fixed set of named operations with verifiable, shareable results."
- whyItMatters: "UOR defines 12 operations — negate, invert, add, multiply, and more. Each has a formal name, formula, and relationship to the core rule. When agents exchange computed values, they can verify each other's work against these definitions. There is no ambiguity about what was computed."
- solves: "Opaque coordination: two agents computing the same operation get the same result — or the discrepancy is detectable."

**Layer 3 — Resolution**
- oneLiner: "Know the type and class of any value before you compute with it."
- whyItMatters: "Every value belongs to one of four categories: building block, composed value, structural anchor, or boundary. Knowing which category a value belongs to before operating on it prevents type errors and incorrect proofs. This layer gives agents a formal type system they share without negotiation."
- solves: "Type mismatches: agents using the same bytes can reach different conclusions if they disagree on what kind of value it is."

**Layer 4 — Verification**
- oneLiner: "Shareable proof objects any party can verify independently — no server needed."
- whyItMatters: "A proof object is not just a correct answer. It has a permanent address, shows every derivation step, and can be verified by anyone without contacting a server. Certificates attest to properties across all values. Both are self-contained objects you can share, store, and re-verify at any time."
- solves: "Auth exploits and prompt injection: proofs anchored to content addresses cannot be forged or replayed. The math is the trust chain."

**Layer 5 — Transformation**
- oneLiner: "Translate values between contexts, score information density — formally and deterministically."
- whyItMatters: "Spam filters use pattern-matching, which can be fooled. UOR uses algebraic structure: every value has a measurable information density, computed from the same rules as everything else in the framework. Morphisms let agents safely translate values between different ring sizes without losing structural properties."
- solves: "Content spam and prompt injection: partition analysis is a formal property of the content, not a heuristic."

### Endpoint — explanation and useCase rewrites

#### /kernel/op/verify
- explanation: "Checks that negate(bitwise-invert(x)) equals increment(x) for the value you supply. Returns every intermediate step — not just pass or fail. This is the most important endpoint in the API: the rule it checks is the structural guarantee everything else depends on."
- useCase: "An agent is told the framework is trustworthy. It calls this endpoint with a value it chose, confirms the rule holds, and then relies on the framework with mathematical confidence — no trust required."

#### /kernel/op/verify/all
- explanation: "Runs the same check across every value in the ring — all 256 for the default 8-bit ring. Returns a pass count, fail count, and a universal verdict. One example proves nothing. Exhaustive verification is what turns a claim into proof."
- useCase: "An agent wants to confirm the framework is internally consistent before relying on any of its operations. 256 passes, zero failures."

#### /kernel/address/encode
- explanation: "Send any text, receive a permanent address computed from its bytes. The same input always produces the same address — no server, no timestamp, no registry required. One character difference produces a completely different address."
- useCase: "An agent signs its output by encoding its response into a content address and attaching it to the message. Any recipient re-encodes the same text and checks the address matches."

#### /kernel/schema/datum
- explanation: "Every value in UOR is more than a number — it has a position in a mathematical structure. This returns the full profile: decimal value, binary representation, bits set, and content address. Understanding this helps interpret results from every other endpoint."
- useCase: "An agent receives a numeric result and wants its full structural context before using it in a proof."

#### /kernel/op/compute
- explanation: "Takes one or two numbers and returns every operation result at once.\n\nUnary (single input): negate, bitwise-invert, increment, decrement.\nBinary (two inputs): add, subtract, multiply, XOR, AND, OR.\n\nAll results in one response — compare them side by side."
- useCase: "A developer exploring how the framework behaves for a specific value, or an agent that wants to see all possible outcomes before committing to one."

#### /kernel/op/operations
- explanation: "Returns all 12 named operations with their formal definitions: formulas, algebraic class, and relationship to the core rule. This is the shared dictionary every agent can reference."
- useCase: "An agent or developer wants to confirm a named operation in a proof object matches a known definition before verifying it."

#### /user/type/primitives
- explanation: "Returns the built-in type catalogue: U1, U4, U8, U16 (1 to 16 bits), plus composite types — pairs, unions, and constrained values. The type you pick here feeds directly into the coherence and partition endpoints."
- useCase: "A developer wants to know which type to pass before calling the coherence or partition endpoints."

#### /bridge/resolver
- explanation: "Sorts any value into one of four canonical categories:\n\n• Building block (irreducible) — odd, not a unit. Structurally unique.\n• Composed (reducible) — even. Breaks into 2^k × odd core.\n• Anchor (unit) — the ring's multiplicative identity or its inverse.\n• Boundary (exterior) — zero or the ring midpoint.\n\nFor composed values, shows the full factor breakdown. For building blocks, confirms no further decomposition is possible."
- useCase: "Before using a value in a proof or translation, an agent must know its category. This endpoint answers: is this a building block, a composed value, a structural anchor, or a boundary case?"

#### /bridge/proof/critical-identity
- explanation: "Produces a full proof object with a unique permanent address. Anyone can take this object, replay the derivation steps, and confirm it is correct — no server contact needed. Every step is explicit: input, each intermediate value, final comparison."
- useCase: "An agent produces a proof for its own identity value and attaches it to outgoing messages. Recipients verify independently. The math is the trust chain."

#### /bridge/proof/coherence
- explanation: "Verifies the core rule holds for every element of a given type — not a sample, every value. A passing type is ring-coherent and participates fully in the framework's guarantees. Returns pass rate, fail count, and a single boolean verdict. 100% is required."
- useCase: "Before using a custom data type in agent coordination, verify it is coherent. A non-coherent type will produce unpredictable results with every framework operation."

#### /bridge/cert/involution
- explanation: "Some operations undo themselves when applied twice. Negate and bitwise-invert are both self-inverting: negate(negate(x)) = x for every value in the ring. This verifies that exhaustively, then issues a shareable certificate.\n\nCertificates can be stored and shared. Peers verify them directly — no re-computation needed."
- useCase: "An agent proves to a peer that an operation is safe to reverse. It shares the certificate. The peer verifies it in one call."

#### /bridge/derivation
- explanation: "Takes a starting value and a sequence of operations, and returns a formal record of every step: input, output, formula used, and ontology reference. Also verifies the core rule holds for the original value — an independent integrity check bundled into the same response."
- useCase: "An agent runs a sequence of operations and needs an auditable record. The derivation trace is the formal receipt. Peers replay it to verify independently."

#### /bridge/trace
- explanation: "Lower-level than derivation. Records the exact binary state of the value after each operation — the decimal value, binary form, how many bits are set, which bits flipped, and the delta from the previous step.\n\nUseful when you need to see exactly where a bit pattern diverged."
- useCase: "An agent detects unexpected output from a peer and wants to find where the computation diverged. The trace shows exactly which bits changed at each step."

#### /bridge/partition
- explanation: "Classifies every value in the ring into four groups — building blocks, composed values, structural anchors, and boundaries — then returns the fraction that are building blocks as a density score.\n\nAbove 0.25: meaningful content. Below 0.1: strong signal of spam or filler.\n\nPass text for per-character analysis, or a type definition for full-ring analysis."
- useCase: "An agent receives a long message and runs partition analysis before processing it. A low density score is a formal, reproducible signal — not a heuristic guess."

#### /bridge/observable/metrics
- explanation: "Computes four precise measurements for any value:\n\n• Distance from zero — how far the value sits from the ring's origin.\n• Bits set — how many bits are on. A proxy for information content.\n• Cascade depth — how many times divisible by two before reaching an odd number.\n• Phase boundary — whether the value is near a point where operations change behaviour."
- useCase: "An agent monitoring a stream of values notices erratic outputs. Structural metrics reveal which values sit near phase boundaries — often the source of instability."

#### /user/morphism/transforms
- explanation: "Maps a value from one ring to another while preserving its structural properties.\n\n• Smaller target ring: strips the high bits (projection).\n• Larger target ring: embeds the value unchanged (inclusion).\n• Same size: identity map.\n\nReturns the mapped value, which properties are preserved, and whether the map is injective and surjective."
- useCase: "An agent operating in an 8-bit ring sends a value to a peer in a 4-bit ring. It uses this endpoint to compute the correct projection and confirm what is preserved."

#### /user/state
- explanation: "Returns the formal lifecycle state for an agent at value x.\n\n• What category x belongs to and why.\n• Whether x is a stable entry point (an identity or unit).\n• Whether x is at a phase boundary.\n• For each operation — negate, invert, increment, decrement — where does x go and does its category change?"
- useCase: "An agent must decide its next action from its current value. This endpoint answers: am I at a stable state, a boundary, or an interior point? What does each available operation do to my category?"

### Discovery section (`/navigate` and `/openapi.json`)
- `/navigate` explanation: "Returns a complete map of every endpoint — path, method, and purpose — in one call. If you are new to the API, start here."
- `/openapi.json` explanation: "The full machine-readable spec in OpenAPI 3.1.0 format. Use the static copy at uor.foundation/openapi.json to parse all paths, schemas, and response types offline."

### For AI Agents section
The discovery chain notes need to be one tight sentence each:
1. `/.well-known/uor.json` → "Organisation descriptor. The `uor:api.openapi` field points to the spec."
2. `GET /openapi.json` → "Full OpenAPI 3.1.0 spec. Parse all paths, operationIds, and response schemas."
3. `GET /navigate` → "Human-readable endpoint index with recommended reading order."
4. `GET /kernel/op/verify?x=42` → "First verifiable claim. Zero auth. Returns a full proof in under 100ms."

Machine-readable entry point notes — same treatment, one sentence each:
- OpenAPI spec: "Parse paths, operationIds, schemas, and response types."
- Agent Quick Card: "5-minute orientation. Frontmatter includes api_url and api_spec."
- Full Reference: "Complete guide with all curl examples and implementation notes."
- Discovery metadata: "JSON-LD descriptor with the uor:api.openapi field."

---

## Files changed
- **`src/pages/Api.tsx`** — all descriptive string fields: `oneLiner`, `whyItMatters`, `solves`, `explanation`, `useCase`, `label` (where needed), `note` fields in Quick Start, discovery chain notes, and the hero paragraph. No logic changes, no component changes.

## What does NOT change
- All component JSX, styling, layout
- All parameter definitions (name, type, required, default)
- Response codes
- curl examples
- The hero headline
- Section headings
- Quick Start commands
