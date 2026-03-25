

# Copy Audit: Remove Jargon and Redundancy

After reading every content-bearing file, here is a line-by-line audit of language that is too technical, redundant, or vague. Each change tightens the copy without losing meaning.

---

## Issues Found and Fixes

### 1. Hero subtitle (HeroSection.tsx, line 33)
**Current**: "...for the semantic web, open science, and frontier technologies."
**Problem**: "Semantic web" is academic jargon. "Frontier technologies" is vague and hand-wavy — triggers skepticism.
**Fix**: "...for science, software, and the next generation of intelligent systems."

### 2. Intro paragraph 1 (IntroSection.tsx, line 15)
**Current**: "...a single, permanent address based on what it contains, not where it is stored."
**Verdict**: Clear and good. Keep as-is.

### 3. Intro paragraph 2 (IntroSection.tsx, line 19)
**Current**: "...without broken links, translation layers, or manual integration. The same content always resolves to the same address, no matter who holds it."
**Problem**: "Translation layers" is developer jargon. "Resolves to" is DNS/networking jargon. Second sentence partly repeats paragraph 1.
**Fix**: "Data can be found, verified, and reused across any system — no broken links, no glue code, no gatekeepers."

### 4. Intro paragraph 3 (IntroSection.tsx, line 22)
**Current**: "...to make reliable, verifiable data the default for science, software, and emerging technologies."
**Problem**: "Emerging technologies" is vague filler (same issue as "frontier technologies").
**Fix**: "...to make reliable, verifiable data the default — from scientific research to production infrastructure."

### 5. Pillars — Framework (pillars.ts, line 10)
**Current**: "The upstream specification and reference implementation for content-based addressing. Build interoperable protocols and applications on a vendor-neutral, well-documented standard."
**Problem**: Five jargon terms in two sentences: "upstream specification," "reference implementation," "content-based addressing," "interoperable protocols," "vendor-neutral." Piles up.
**Fix**: "The open specification for content-based addressing, with a reference implementation anyone can run. Build protocols and applications on a documented, vendor-neutral standard."

### 6. Pillars — Community (pillars.ts, line 18)
**Current**: "Working groups, open governance, and shared research. Collaborate with engineers and scientists advancing the standard through RFC-style proposals and peer review."
**Problem**: "RFC-style proposals" is insider language.
**Fix**: "Working groups, open governance, and shared research. Collaborate with engineers and scientists advancing the standard through open proposals and peer review."

### 7. Pillars — Project Launchpad (pillars.ts, line 26)
**Current**: "A structured incubation path from idea to production. Submit your project, gain visibility, and grow through community support and open governance."
**Problem**: "open governance" repeats from Community pillar.
**Fix**: "A structured path from idea to production. Submit your project, gain visibility, and grow with community support."

### 8. CTA — Adopters card (CTASection.tsx, line 19)
**Current**: "Evaluate the standard for your stack. Integrate content-based addressing into existing infrastructure."
**Problem**: "Content-based addressing" is the third time this phrase appears. "Your stack" is casual jargon.
**Fix**: "Evaluate the standard for your systems. Integrate content addressing into existing infrastructure."

### 9. CTA — Researchers card (CTASection.tsx, line 28)
**Current**: "Join working groups, publish findings, and help advance the formal specification."
**Problem**: "Formal specification" is heavy.
**Fix**: "Join working groups, publish findings, and help advance the standard."

### 10. CTA subtitle (CTASection.tsx, line 43)
**Current**: "Join a growing community of engineers, researchers, and builders advancing the open data standard."
**Problem**: "advancing the open data standard" — slightly redundant with context.
**Fix**: "Engineers, researchers, and builders working on the open data standard."

### 11. Featured Projects — UOR MCP (featured-projects.ts, line 26)
**Current**: "A Model Context Protocol server that gives any LLM access to the UOR kernel. Every response becomes content-addressed, verified, and auditable."
**Problem**: "Model Context Protocol," "LLM," "content-addressed" — three jargon terms in two sentences.
**Fix**: "A server that connects AI models to the UOR kernel. Every response is verified and auditable."

### 12. Featured Projects — Atomic Language Model (featured-projects.ts, line 19)
**Current**: "A language model built on formal grammar rules rather than statistical prediction. Every output is traceable to precise, well-defined operations."
**Problem**: "Formal grammar rules" and "statistical prediction" are academic.
**Fix**: "A language model where every output follows defined rules and is fully traceable — no black boxes."

### 13. About — What We Do cards (about-cards.ts)
**Current Framework**: "We research and publish open data standards and protocols that anyone can build on."
**Verdict**: Clean. Keep.
**Current Community**: "A shared space for discussion, collaboration, and joint research across disciplines."
**Problem**: "Across disciplines" is filler.
**Fix**: "A shared space for discussion, collaboration, and joint research."
**Current Launchpad**: "A structured path for open-source projects to grow from early ideas to production-ready tools."
**Verdict**: Clean. Keep.

---

## Files to modify

| File | Changes |
|------|---------|
| `HeroSection.tsx` | Fix subtitle (line 33) |
| `IntroSection.tsx` | Fix paragraphs 2 and 3 (lines 19, 22) |
| `pillars.ts` | Tighten all three descriptions |
| `CTASection.tsx` | Fix Adopters, Researchers, subtitle |
| `featured-projects.ts` | Fix UOR MCP and Atomic LM descriptions |
| `about-cards.ts` | Trim Community card |

No structural changes. No new files. Pure copy edits.

