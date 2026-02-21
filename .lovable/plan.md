

# Remaining Messaging Refinements for Visceral Clarity

The recent overhaul was strong. Most pages now read clearly and answer "what, how, why." However, several spots still contain jargon or abstract language that will lose a general audience. These are the final fixes needed to make the entire site feel consistently clear and trustworthy.

---

## Issues Found

### 1. UOR Diagram (UORDiagram.tsx) - 3 issues

The diagram labels still use insider language:

| Location | Current | Problem |
|----------|---------|---------|
| Center label (line 53) | "Universal Lossless Encoder" | "Lossless Encoder" is technical jargon |
| Right panel label (line 114) | "Unified Computational Substrate" | Heavy jargon; meaningless to most readers |
| Example use case text (line 132) | "A single symbolic coordinate system becomes a computational substrate. AI agents reason, verify, and act across all data sources autonomously." | "Symbolic coordinate system," "computational substrate," and "autonomously" are all jargon |

**Proposed fixes:**
- Center label: "Universal Lossless Encoder" -> "Universal Address System"
- Right panel label: "Unified Computational Substrate" -> "One Shared System"
- Example use case: "When all data shares one address system, AI can find, verify, and use information across every source without custom connectors or translations."

### 2. Framework Page "The Problem" (StandardPage.tsx) - 1 issue

Line 54: "symbolic, content based identity" is insider language.

**Proposed fix:**
"UOR replaces location based identity with **identity based on content**. Every object gets a single, permanent address derived from what it contains."

### 3. Donate Page project description (DonatePage.tsx) - 1 issue

Line 11-12: "true semantic interoperability across all data systems" is jargon.

**Proposed fix:**
"Fund the core development and formalization of the Universal Object Reference standard, the foundational specification that gives every piece of data one permanent, verifiable address."

### 4. About Page (AboutPage.tsx) - 2 issues

| Line | Current | Problem |
|------|---------|---------|
| 56 | "A universal coordinate system for information. One address per object, derived from content, verifiable everywhere." | "Coordinate system" is jargon |
| 163 | "permanent identity, lossless composition, or verifiable transformations" | "Lossless composition" and "verifiable transformations" are jargon |

**Proposed fixes:**
- Line 56: "Every piece of data gets one permanent address, based on what it contains. Findable and verifiable across every system."
- Line 163: "If your work benefits from permanent data identity, reliable data combination, or provable accuracy, there is a place for it here, regardless of your tools, language, or paradigm."

### 5. Research Page blog excerpt (ResearchPage.tsx) - 1 issue

Line 48: "Neuro-Symbolic AI, and topological quantum computing" is deep specialist jargon.

**Proposed fix:**
"A breakthrough that reveals the hidden order behind nature's most complex systems and could reshape the future of open science, next-generation AI, and quantum computing."

### 6. Research Page - Atlas description (ResearchPage.tsx) - 1 issue

Line 31: "all five exceptional Lie groups can be derived from a single geometric structure, revealing a universal mathematical language underlying complex symmetry" contains "Lie groups" and "geometric structure" which are specialist terms.

**Proposed fix:**
"Demonstrates that five of the most complex structures in mathematics all come from a single starting point, revealing a shared order beneath apparently unrelated systems."

### 7. CTA Section (CTASection.tsx) - 1 issue

Line 117: "open data infrastructure" is abstract.

**Proposed fix:**
"Connect with researchers, developers, and advocates building the future of reliable, open data."

---

## Summary of Files to Edit

| File | Number of Changes |
|------|-------------------|
| `src/modules/framework/components/UORDiagram.tsx` | 3 text changes |
| `src/modules/framework/pages/StandardPage.tsx` | 1 text change |
| `src/modules/donate/pages/DonatePage.tsx` | 1 text change |
| `src/modules/core/pages/AboutPage.tsx` | 2 text changes |
| `src/modules/community/pages/ResearchPage.tsx` | 2 text changes |
| `src/modules/landing/components/CTASection.tsx` | 1 text change |

## What Does Not Change
- FrameworkLayers descriptions (gold standard)
- Homepage Hero, Intro, and Pillars (already refined)
- Footer tagline (already refined)
- Visual design, layout, animations
- All links, CTAs, and navigation

