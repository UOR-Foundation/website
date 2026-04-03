

# Copy Clarity Pass — Precise, Jargon-Free, Developer-Familiar

After reviewing every page and data file, here are the specific text changes needed. Each change removes vagueness, tightens language, or replaces internal jargon with words an open-source developer already knows.

---

## 1. UNS Page — Remove Dense Jargon

**File:** `src/modules/uns/pages/UnsPage.tsx`

The UNS page is the worst offender. It reads like an internal RFC, not a project page. Terms like "IPv6 content-addressing," "UOR algebraic identity," "CIDv1," "Braille address," "derivation ID," "epistemic grading," and "cert:UnsCertificate" will alienate anyone who isn't already deep in the project.

**Changes:**
- Hero description: Replace "Decentralized name resolution via IPv6 content-addressing and UOR algebraic identity..." → "A naming system where addresses come from the content itself. Look up any name, verify it independently, no central authority required."
- Forward Resolution: "Resolve human-readable names to UOR identities..." → "Turn a human-readable name into a verified address. One lookup, one result, fully traceable."
- Reverse Resolution: "Map IPv6 ULA addresses back to registered names, analogous to DNS PTR records but content-verified." → "Go from an address back to its registered name. Like reverse DNS, but the result is self-verifying."
- Zone Management: "Create and manage self-certifying zones. Each zone is anchored to a UOR address with a dedicated IPv6 /48 prefix." → "Create and manage zones. Each zone has its own address space and verifies itself — no external certificate authority needed."
- Record Certification: "Every record is issued a cert:UnsCertificate with derivation-based integrity proofs and epistemic grading." → "Every record comes with a built-in proof of integrity. Anyone can verify it, anywhere, without special tools."
- Record Types table: Keep the type codes (UAAA, UCID, etc.) but simplify descriptions. E.g., "Name → CIDv1 content identifier" → "Name → content address". "Name → UOR Braille glyph address" → "Name → compact visual address". "Name → verification certificate" → "Name → integrity proof".

## 2. Research Categories — Tighten Descriptions

**File:** `src/data/research-categories.ts`

Several descriptions use phrases that either restate the label or drift into vague territory.

- "Formal methods, algebraic structures, and mathematical foundations of UOR." → "The mathematical structures that UOR is built on. Proofs, algebra, and formal verification."
- "Embedded systems, robotics middleware, and UOR-native hardware interfaces." → "Running UOR on physical devices — embedded systems, sensors, and robotics."
- "Semantic datasets, reproducible pipelines, and interoperable analytics." → "Reproducible data pipelines and analytics that work across tools and teams."
- "Medical data interoperability, patient-centric identity, and open health standards." → "Portable medical records and patient-owned identity. Data moves with the person, not the institution."
- "Decentralized protocols, on-chain identity, and content-addressed storage." → "Decentralized identity and storage. UOR addressing works natively with blockchain protocols."
- "Emerging technology exploration at the intersection of UOR and next-gen infrastructure." → "Early-stage work on technologies that don't fit existing categories yet."
- "Sustainable infrastructure, carbon accounting, and open energy data standards." → "Open data standards for carbon accounting, energy tracking, and climate infrastructure."

## 3. Research Papers — Simplify Physics Descriptions

**File:** `src/data/research-papers.ts`

The physics papers have descriptions loaded with notation (δ₀ = 6.8°, α⁻¹ = 137.036, D = 1.9206, τ_p = 8.9 × 10³⁴ yr) that is appropriate for a paper abstract but not a card description on a community page.

- "Quantum Self-Verification Geometry" description → "Shows that all fundamental physical constants can be derived from a single geometric property of spacetime. No free parameters."
- "QSVG Technical Appendices" description → "The complete mathematical proofs behind the physical theory — how the core geometric property emerges and why it is unique."
- "QSVG Fundamental Interactions Atlas" description → "Derives all four fundamental forces and dark energy from the same geometric framework. Each force emerges as a different facet of one structure."
- "QSVG Experimental Roadmap" description → "Concrete predictions that can be tested within 3–5 years. Every prediction has zero free parameters — the geometry either matches experiment or it doesn't."

## 4. Ecosystem Section — Pipeline Descriptions

**File:** `src/modules/landing/components/EcosystemSection.tsx`

The pipeline descriptions are decent but can be sharper:
- "Early-stage experiments with clear potential" → "Early-stage projects exploring new ideas"
- "Growing adoption and community traction" → "Projects with active contributors and real-world use"
- "Production-ready with proven stability" → "Stable, widely adopted, independently audited"

## 5. About Page — Minor Tightening

**File:** `src/data/about-cards.ts`

- "We coordinate working groups in mathematics, AI, and systems engineering. All proposals and results published on GitHub." → "We run working groups across mathematics, AI, and systems engineering. Everything is published on GitHub."
- "We run a three-stage maturity pipeline (Sandbox → Incubation → Graduated) with community review and clear promotion criteria." → "Projects move through three stages — Sandbox, Incubating, Graduated — with community review at every step."

## 6. Applications Cards — Remove Redundancy

**File:** `src/data/applications.ts`

- "Run a computation once and produce a receipt that anyone can check. No need to re-run it, no need to trust the person who ran it." → "Run a computation once and get a proof anyone can check. No re-running, no trust required."
- "Give AI systems a single, reliable map of all available data so they can find, verify, and use information on their own." → "Give AI a shared, verified index of data. Models find and use information without custom integrations."
- "Let different fields share data and ideas without losing meaning in translation. One shared system, many disciplines." → "Share data across fields without losing meaning. One addressing system, every discipline."
- "Provide a foundation for emerging fields like quantum computing and next-generation AI, where reliable data identity is essential." → "A foundation for quantum computing and next-generation AI, where data identity must be reliable from day one."

## 7. Framework Page — "Anatomy of an Address" Clarity

**File:** `src/modules/framework/pages/StandardPage.tsx`

- "Every piece of data in UOR is described by three coordinates that form a complete, self-verifying fingerprint." → "Every piece of data has three coordinates. Together they form a unique, self-verifying address."
- "The building blocks that make up the data, enabling exact reconstruction." → "The parts that make up the data. Given these, anyone can reconstruct the original exactly."
- Example text "4 distinct building blocks" → "e.g. [2, 3, 5, 7]" (concrete, not abstract)
- "Six layers, each building on the one below it. Together they form a complete system for naming, finding, proving, and transforming data." → "Six layers. Each builds on the one below. Together they handle naming, discovery, verification, and transformation."

## 8. Donate Page — Tighten

**File:** `src/modules/donate/pages/DonatePage.tsx`

- "Your donation funds development, infrastructure, and a global research community. Every dollar goes directly to maintaining open tools that scientists, developers, and institutions rely on." → "Every dollar funds development, infrastructure, and research. We maintain open tools that developers and researchers depend on."

---

## Summary

| # | File(s) | Issue | Fix |
|---|---------|-------|-----|
| 1 | `UnsPage.tsx` | Dense internal jargon (IPv6 ULA, CIDv1, epistemic grading) | Plain English throughout |
| 2 | `research-categories.ts` | Some descriptions restate the label or drift | Tighter, action-oriented |
| 3 | `research-papers.ts` | Physics card descriptions full of notation | Remove notation, keep meaning |
| 4 | `EcosystemSection.tsx` | Pipeline descriptions slightly vague | Sharper one-liners |
| 5 | `about-cards.ts` | Minor wordiness | Trim |
| 6 | `applications.ts` | Redundant phrasing in some cards | Tighter |
| 7 | `StandardPage.tsx` | "Anatomy" section slightly abstract | More concrete |
| 8 | `DonatePage.tsx` | Subtitle wordy | Trim |

**8 targeted edits across 8 files. Pure copy changes — no structural or layout modifications.**

