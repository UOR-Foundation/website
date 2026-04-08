

## Expand Encyclopedia Lens with High-Trust Sources

### Context

The encyclopedia lens currently lists only two `recommendedSources`: Wikipedia and Britannica. These entries serve as source-quality metadata and search domain hints. The change is a single-file edit to `knowledge-lenses.ts`.

### Curated Sources to Add

All selected sources are free/open-access or have publicly queryable APIs, editorially reviewed, and widely cited in academic and reference contexts:

| Domain | Reason | Quality Score | Notes |
|--------|--------|--------------|-------|
| `plato.stanford.edu` | Stanford Encyclopedia of Philosophy — peer-reviewed by subject experts | 96 | Gold-standard for humanities/philosophy |
| `scholar.google.com` | Broad academic search across all disciplines | 93 | Aggregates peer-reviewed papers |
| `pubmed.ncbi.nlm.nih.gov` | US National Library of Medicine — biomedical research | 96 | Government-backed, comprehensive |
| `worldcat.org` | World's largest library catalog (OCLC) | 90 | Authoritative bibliographic data |
| `loc.gov` | US Library of Congress — primary sources and reference | 94 | Government institution, archival authority |
| `jstor.org` | Digital library of academic journals and books | 92 | Scholarly, peer-reviewed content |

### File Change

**`src/modules/oracle/lib/knowledge-lenses.ts`** — Add 6 entries to the encyclopedia blueprint's `recommendedSources` array (lines 74-77), bringing total from 2 to 8.

### What This Does NOT Change

- No new API integrations or edge functions — these are metadata/hints used by the search and rendering pipeline
- Other lenses remain unchanged
- The `lens-intelligence.ts` domain-specific sources are separate and unaffected

