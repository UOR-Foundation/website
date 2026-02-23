# EXTENDED PRODUCTION CHECKLIST — UOR + UNS Platform (Prompts 1-30)

> **Authority**: This checklist is the auditable readiness gate for the complete
> UOR+UNS platform. Every item maps to a specific prompt, test, or spec reference.
> No deployment may proceed until every box is checked.

---

## LAYER 1 — MATHEMATICAL (Prompts 1, 21, 23)

- [ ] `verifyCriticalIdentity()` → 256/256 for Q0
- [ ] `verifyCriticalIdentityQ('Q0')` → holds: true (exhaustive 256 elements)
- [ ] `verifyCriticalIdentityQ('Q1', 65536)` → holds: true (exhaustive 65536 elements)
- [ ] `verifyCriticalIdentityQ('Q2', 1000)` → holds: true (sampled verification)
- [ ] `runConformanceSuite()` → 0 failures (all 7 test groups pass)
- [ ] ExteriorSet cardinality = 2 (x=0, x=128) — matches `spec/src/namespaces/partition.rs`
- [ ] IrreducibleSet cardinality = 126 — verified via SPARQL SELECT
- [ ] Cross-quantum morphism commutativity: embed(Q0→Q1) then project(Q1→Q0) = identity
- [ ] Verbatim proof: `neg(bnot(42)) = neg(213) = 43 = succ(42)` as runtime assertion

## LAYER 2 — CRYPTOGRAPHIC (Prompts 2, 12, 13, 21)

- [ ] All Dilithium-3 signatures verify (all `verifyRecord` calls return true)
- [ ] No RSA/ECDSA/ECDH anywhere in codebase (grep audit clean)
- [ ] Kyber-1024 shared secrets are never logged or serialized
- [ ] Private key bytes (`privateKeyBytes`) never appear in JSON or console output
- [ ] AES-256-GCM nonces: unique per message (no nonce reuse)
- [ ] `generateKeypair()` produces 1952-byte public key (ML-DSA-65 spec)

## LAYER 3 — CONTENT ADDRESSING (Prompts 1, 3, 9)

- [ ] Same content → same canonical ID (deterministic via URDNA2015)
- [ ] Different content → different canonical ID (SHA-256 collision resistance)
- [ ] All IPv6 addresses start with `fd00:0075:6f72` (UOR ULA prefix)
- [ ] `u:lossWarning: 'ipv6-is-routing-projection-only'` always present
- [ ] Extension header TLV = 40 bytes, option type = `0x1E`
- [ ] Four identity forms derived from single SHA-256: canonicalId, ipv6, cid, glyph

## LAYER 4 — SHACL VALIDATION (Prompt 25)

- [ ] All 9 SHACL shapes enforced at every write boundary
- [ ] `datum-term-disjoint`: rejects objects with both schema:Datum and schema:Term @types
- [ ] `succ-composition`: rejects proofs where neg_bnot_x ≠ succ_x
- [ ] `partition-cardinality`: rejects partitions not summing to 256 (Q0)
- [ ] `cert-required-fields`: rejects certificates missing algorithm/keyBytes/certifiedBy
- [ ] `trace-certifiedby`: rejects traces without Dilithium-3 certification
- [ ] `transition-frames`: rejects transitions without valid canonical IDs
- [ ] `critical-identity-proof`: rejects proofs with verified=false
- [ ] `derivation-id-format`: rejects malformed derivation URNs
- [ ] `partition-density-range`: rejects density outside [0, 1]

## LAYER 5 — EPISTEMIC GRADING (Prompt 22)

- [ ] Every API response includes `epistemic_grade` field
- [ ] Grade A always accompanied by `derivation:derivationId`
- [ ] No service claims Grade A without ring-arithmetic derivation
- [ ] Grade D default for any LLM-generated / unverified content
- [ ] Grade B requires `cert:Certificate` + SHACL validation
- [ ] Grade C requires graph presence with source attribution

## LAYER 6 — KNOWLEDGE GRAPH (Prompt 24)

- [ ] Q0 graph: 256 datums materialized (one per ring element)
- [ ] SPARQL `SELECT ?d WHERE { ?d u:partitionClass "IRREDUCIBLE" }` → 126 results
- [ ] VoID descriptor published with sparqlEndpoint and vocabulary
- [ ] Content negotiation: JSON-LD (`application/ld+json`), Turtle (`text/turtle`), N-Triples
- [ ] Named graphs: ontology graph + Q0 instance graph
- [ ] SPARQL ASK, SELECT, CONSTRUCT all operational

## LAYER 7 — OBSERVER COHERENCE (Prompt 26)

- [ ] H-score formula: `H(O) = min_{d ∈ Grade_A_Graph} popcount(O XOR d)`
- [ ] `popcount(0b10110100) === 4` (4 set bits)
- [ ] `popcount(0) === 0`, `popcount(255) === 8`
- [ ] All registered agents start in COHERENCE zone (H ≤ 2)
- [ ] Zone transitions: COHERENCE → DRIFT when H > threshold_low
- [ ] OIP protocol dispatches on COHERENCE → DRIFT transition
- [ ] EDP protocol broadcasts drift observations to peer observers
- [ ] CAP protocol quarantines agents in COLLAPSE zone
- [ ] `convergenceCheck()` returns `converged: true` after OIP remediation

## LAYER 8 — ATTRIBUTION + COMPLIANCE (Prompt 27)

- [ ] `attribution.register()` returns `cert:AttributionCertificate`
- [ ] All certificates: `eu_data_act_compliant: true`
- [ ] All certificates: `gdpr_article_20: true`
- [ ] All certificates: `epistemic_grade: 'A'`
- [ ] All certificates: `cert:algorithm: 'CRYSTALS-Dilithium-3'`
- [ ] `attribution.verify()` confirms signature validity
- [ ] GDPR Article 20 export: valid JSON-LD with `dc:rights` field
- [ ] Royalty report: date-range filtered, accurate counts
- [ ] Registration without Grade-A derivation ID → throws

## LAYER 9 — STATE MACHINE (Prompt 28)

- [ ] `defineFrame(42n)` → `partitionClass: 'REDUCIBLE'` (42 is even, not 0)
- [ ] `defineFrame(43n)` → `partitionClass: 'IRREDUCIBLE'` (43 is odd, not unit)
- [ ] All state transitions ring-arithmetic: `verifyTransition()` returns true
- [ ] `transition('succ')` from frame(42n) → to frame(43n)
- [ ] `transition('neg')` from frame(42n) → to frame(214n)
- [ ] All `StateTransitionRecord`s have SHACL-compliant canonical IDs
- [ ] `typeCheck(42n, U8)` → valid: true; `typeCheck(300n, U8)` → valid: false
- [ ] `ConstrainedType` predicate enforced at runtime
- [ ] Full audit chain: `getHistory()` returns chronological transitions

## LAYER 10 — SEMANTIC WEB (Prompt 29)

- [ ] `recordToSchemaOrg()`: dual @context (schema.org + UOR)
- [ ] `schema:identifier` includes `derivation:derivationId` as propertyID
- [ ] `functionToSchemaOrg()`: @type = `schema:SoftwareApplication`
- [ ] `objectToSchemaOrg()` for JSON → @type = `schema:Dataset`
- [ ] Content negotiation: Accept header selects JSON-LD / Turtle / N-Triples
- [ ] Turtle output contains valid triple syntax (parseable)
- [ ] `generateSitemap()`: valid XML with `<loc>` and `<changefreq>never</changefreq>`
- [ ] `generateRobotsTxt()`: includes `Sitemap:` directive + `Allow: /uns/schema-org/`
- [ ] All schema.org output passes SHACL validation

---

## CROSS-CUTTING CONCERNS

- [ ] No `// @ts-ignore` except for noble/post-quantum import (audited library)
- [ ] All modules export via barrel files (index.ts)
- [ ] All external links centralized in `src/data/external-links.ts`
- [ ] All canonical ID generation via `singleProofHash()` — no raw SHA-256
- [ ] URDNA2015 normalization on every identity pipeline
- [ ] Zero runtime dependencies on external services for core ring operations
- [ ] All tests self-verifying (no manual inspection required)

---

## SUMMARY

| Layer | Prompts | Test Count | Status |
|-------|---------|-----------|--------|
| Mathematical | 1, 21, 23 | 35+ | ☐ |
| Cryptographic | 2, 12, 13, 21 | 20+ | ☐ |
| Content Addressing | 1, 3, 9 | 25+ | ☐ |
| SHACL Validation | 25 | 17+ | ☐ |
| Epistemic Grading | 22 | 10+ | ☐ |
| Knowledge Graph | 24 | 15+ | ☐ |
| Observer Coherence | 26 | 15+ | ☐ |
| Attribution | 27 | 12+ | ☐ |
| State Machine | 28 | 14+ | ☐ |
| Semantic Web | 29 | 12+ | ☐ |
| **Full Stack E2E** | **30** | **10** | ☐ |
| **TOTAL** | **1-30** | **200+** | ☐ |

> *"The mathematics is verified at Q0, Q1, Q2. Every object is attributed,
> graded, observed, and schema.org discoverable. The UOR framework is fully
> implemented — not approximated."*
