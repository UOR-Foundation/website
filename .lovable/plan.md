

# Website Messaging Audit: Clarity, Trust, Impact

## Guiding Principles
- Every sentence must answer: What is it? What does it do? Why should I care?
- No jargon. No assumed knowledge. But also no dumbing down: the language must respect a sharp, pragmatic reader.
- Self-discipline in language: say less, mean more. Every word earns its place.
- Em dashes are never used (per project conventions).

---

## What Already Works Well

The **FrameworkLayers** descriptions (Layers 0-5) are the gold standard for the site. They are clear, self-descriptive, jargon-free, and answer "why should I care" in every paragraph. The **About page** library analogy is also strong. These are the benchmark.

---

## Areas to Improve (by page/component)

### 1. Homepage Hero (HeroSection.tsx)

**Current subtitle:**
> "The UOR Foundation is dedicated to developing universal data standard for the semantic web, open science, and frontier technologies."

**Problems:** Missing article ("a"), "semantic web" is jargon most people cannot define, and the sentence describes what the Foundation does, not why the audience should care.

**Proposed:**
> "Every piece of data gets one permanent address, based on what it contains. Findable, verifiable, and reusable across every system."

**Why:** Immediately tells the reader what UOR does and why it matters to them. No jargon. Mirrors the quality of the FrameworkLayers text.

---

### 2. Homepage Intro (IntroSection.tsx)

**Current opening:**
> "Universal Object Reference (UOR) is a universal, lossless coordinate system for information"

**Problems:** "Lossless coordinate system" is technically precise but opaque to most readers. The paragraphs explain the mechanism well but the "why should I care" only arrives at the end.

**Proposed changes:**
- Rewrite the bold lead to focus on the outcome first: what it means for the reader, then how it works.
- Move the "why it matters" statement earlier.
- Replace "lossless coordinate system" with plain language while keeping the meaning intact.

**Proposed opening:**
> "Universal Object Reference (UOR) gives every piece of digital content a single, permanent address based on what it contains, not where it is stored."

**Proposed "why it matters" (moved up):**
> "This means data can be found, verified, and reused across any system without translation layers, broken links, or manual integration. The same content always resolves to the same address, no matter who holds it."

---

### 3. Homepage Pillars (PillarsSection.tsx)

**Current "Our Community" description:**
> "Open research, cross pollination of ideas, and joint exploration across disciplines to accelerate scientific progress."

**Problem:** "Cross pollination of ideas" is abstract. Does not answer why someone should care.

**Proposed:**
> "Researchers, engineers, and builders working together across disciplines. Share your work, validate ideas, and move faster by building on what others have proven."

**Current "Your Projects" description:**
> "Build on UOR. Prototype, incubate, and graduate open source projects within the foundation's ecosystem."

**Problem:** "Incubate and graduate" is process language. Does not explain the value to the builder.

**Proposed:**
> "Turn your idea into production-ready software. The foundation provides a structured path, community support, and visibility to help open source projects grow."

---

### 4. Framework Page Hero (StandardPage.tsx)

**Current subtitle:**
> "One address per object, derived from its content, verifiable across every system. Data referenced by what it is, not where it lives, unlocking a unified computational substrate."

**Problem:** "Unified computational substrate" is heavy jargon. The first sentence is excellent. The second loses the reader.

**Proposed:**
> "One address per object, derived from its content, verifiable across every system. Data referenced by what it is, not where it lives. One shared language for all of it."

---

### 5. Framework Page "Where It Applies" Cards (StandardPage.tsx)

Several cards use jargon that breaks the clarity standard:

| Card | Current Text | Problem |
|------|-------------|---------|
| Semantic Web | "Give every piece of data a meaning machines can understand, making the web truly interoperable." | "Interoperable" is jargon |
| Proof Based Computation | "Zero knowledge verified AI: models run once, outputs reduce to compact proofs anchored to deterministic coordinates." | Almost entirely jargon |
| Agentic AI | "Enable autonomous agents to reason, verify, and act across all data sources within one unified space." | "Autonomous agents" assumes knowledge |
| Cross Domain Unification | "Bridge ideas across disciplines with a shared coordinate system that preserves meaning." | "Coordinate system" is insider language here |
| Frontier Technologies | "...topological quantum computing and neuro symbolic AI." | Deep specialist jargon |

**Proposed rewrites (all six cards):**

- **Semantic Web:** "Make data understandable by both people and machines, so systems can work together without custom translations."
- **Proof Based Computation:** "Run a computation once and produce a receipt that anyone can check. No need to re-run it, no need to trust the person who ran it."
- **Agentic AI:** "Give AI systems a single, reliable map of all available data so they can find, verify, and use information on their own."
- **Open Science:** "Make research data findable, reproducible, and composable across institutions and fields." (Already good, keep as is.)
- **Cross Domain Unification:** "Let different fields share data and ideas without losing meaning in translation. One shared system, many disciplines."
- **Frontier Technologies:** "Provide a foundation for emerging fields like quantum computing and next-generation AI, where reliable data identity is essential."

---

### 6. Framework Page "How It Works" Subtitle

**Current:**
> "UOR encodes every object into a single coordinate space where identity is derived from content, not location."

**Problem:** "Coordinate space" is jargon.

**Proposed:**
> "UOR gives every object a permanent address based on what it contains, not where it is stored. Here is how that works."

---

### 7. Framework Page Architecture Intro

**Current:**
> "Six layers built on a shared foundation of geometric structure and symbolic representation. Each builds on the one below it."

**Problem:** "Geometric structure and symbolic representation" is jargon.

**Proposed:**
> "Six layers, each building on the one below it. Together they form a complete system: from the ground rules, to naming, to finding, proving, and transforming data."

---

### 8. UOR Diagram Capability Details (UORDiagram.tsx)

**Current examples:**
- Reason: "Agents traverse a unified semantic graph to draw inferences across formerly siloed data, with no custom connectors required."
- Verify: "Content-addressed identity lets any agent independently confirm data integrity and provenance without trusting a central authority."
- Compose: "Algebraic structure means objects combine into higher-order constructs while preserving referential integrity at every layer."

**Problem:** Nearly every phrase uses specialist language.

**Proposed rewrites:**
- **Reason:** "AI systems can find and connect information across different sources without needing custom adapters for each one."
- **Verify:** "Any system can independently confirm that data has not been altered and trace where it came from, without relying on a central authority."
- **Compose:** "Smaller pieces of data can be combined into larger ones, and broken apart again, without losing any information along the way."
- **Navigate:** "Any system can locate any piece of data by describing what it is, rather than knowing which server or database holds it."

---

### 9. Homepage Projects Showcase (ProjectsShowcase.tsx)

**Current project descriptions:**
- Hologram: "...fundamentally new geometric computing paradigm."
- Atlas Embeddings: "...all five exceptional Lie groups emerge from a single initial object: the Atlas of Resonance Classes."
- Atomic Language Model: "...Chomsky's Minimalist Grammar via formal Merge and Move transformations."

**Problem:** These are written for domain experts. A general audience has no idea what a Lie group or Chomsky's Minimalist Grammar is.

**Proposed rewrites:**
- **Hologram:** "A new kind of computing infrastructure built from the ground up. Software-defined, high-performance, and designed for the next generation of applications."
- **Atlas Embeddings:** "Research showing that five of the most complex structures in mathematics all come from a single, simple starting point, revealing a deeper shared order."
- **Atomic Language Model:** "A language model built on formal grammar rules rather than statistical prediction. Every output is traceable to precise, well-defined operations."

---

### 10. Projects Page Descriptions (ProjectsPage.tsx)

Same project descriptions as above, plus Prism:
- **Prism current:** "A universal coordinate system for information. Prism provides a mathematically grounded framework for encoding, addressing, and navigating all forms of data."

**Proposed:** "The reference implementation of UOR. Prism turns the framework's ideas into working code: encoding, addressing, and navigating data in a single system."

---

### 11. Research Page Hero (ResearchPage.tsx)

**Current:**
> "The UOR community facilitates open research, cross pollination of ideas, and validation of existing work through joint research exploration to accelerate our scientific progress."

**Problem:** Wordy, abstract, and uses "cross pollination" again.

**Proposed:**
> "Researchers and builders working across disciplines to test ideas, validate results, and publish openly. Progress is faster when it is shared."

---

### 12. Research Category Descriptions (ResearchPage.tsx)

Several use jargon:
- "Content-addressed security, zero-trust identity, and verifiable data provenance."
- "Decentralized finance primitives, auditable ledgers, and semantic financial data."
- "Post-quantum cryptography"

**Proposed rewrites for the most jargon-heavy ones:**
- **Cybersecurity:** "Security that is built into the data itself. Verify where information came from and confirm it has not been altered."
- **Finance:** "Financial systems where every transaction is independently auditable and data flows reliably between institutions."
- **Quantum:** "Preparing data systems for the next generation of computing, where today's security methods will need to be replaced."

---

### 13. Donate Page (DonatePage.tsx)

**Current subtitle:**
> "...you support open standards and research that make data universally referenceable by what it is, not where it lives."

**Problem:** "Universally referenceable" is jargon.

**Proposed:**
> "...you support the development of an open standard that gives every piece of data one permanent, verifiable address. No lock-in, no gatekeepers."

---

### 14. Footer Tagline (Footer.tsx)

**Current:** "The open standard for universal data infrastructure."

**Problem:** "Universal data infrastructure" is abstract.

**Proposed:** "One permanent address for every piece of data. Open source. Open standard."

---

## Summary of Files to Edit

| File | Changes |
|------|---------|
| `src/modules/landing/components/HeroSection.tsx` | Rewrite subtitle |
| `src/modules/landing/components/IntroSection.tsx` | Rewrite opening and reorder paragraphs |
| `src/modules/landing/components/PillarsSection.tsx` | Rewrite Community and Projects descriptions |
| `src/modules/landing/components/ProjectsShowcase.tsx` | Rewrite all 3 project descriptions |
| `src/modules/framework/pages/StandardPage.tsx` | Rewrite hero subtitle, "How It Works" subtitle, Architecture intro, and all 6 application cards |
| `src/modules/framework/components/UORDiagram.tsx` | Rewrite all 4 capability descriptions |
| `src/modules/projects/pages/ProjectsPage.tsx` | Rewrite all 4 project descriptions |
| `src/modules/community/pages/ResearchPage.tsx` | Rewrite hero subtitle and jargon-heavy category descriptions |
| `src/modules/donate/pages/DonatePage.tsx` | Rewrite hero subtitle |
| `src/modules/core/components/Footer.tsx` | Rewrite tagline |

## What Does Not Change
- FrameworkLayers descriptions (already the gold standard)
- About page (already strong)
- Visual design, layout, and structure
- All links, CTAs, and navigation
- Technical accuracy (all rewrites preserve the correct meaning)

