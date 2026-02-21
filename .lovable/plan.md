

# Complete UOR Self-Certification: Canonical Receipts with Rehydration

## Compliance Gaps Found

### 1. Uncertified Data Objects (5 inline arrays still without proofs)

| Data | Location | Status |
|------|----------|--------|
| Team members (15 people) | `CTASection.tsx` lines 1-107 | Inline, no certificate |
| Upcoming events | `ResearchPage.tsx` lines 34-43 | Inline, no certificate |
| Research papers per category | `ResearchPage.tsx` lines 22-32 | Inline, no certificate |
| "What We Do" cards (3) | `AboutPage.tsx` lines 55-71 | Inline, no certificate |
| "Our Principles" cards (3) | `AboutPage.tsx` lines 90-111 | Inline, no certificate |

### 2. Certificates Are Not Objective (Cannot Rehydrate)

The current `UorCertificate` interface stores only the CID and UOR address. It does **not** store the canonical JSON payload. This means you cannot decode the receipt back into the original object. To be truly objective and self-verifiable, each certificate must include the canonical representation so that anyone can:

1. Parse the canonical payload to recover the original object
2. Re-hash it to confirm the CID matches
3. Confirm the object is authentic without needing the source code

---

## What Changes

### A. Expand UorCertificate with Canonical Payload

Add a `cert:canonicalPayload` field (the deterministic JSON string) to the `UorCertificate` interface. This makes every certificate a self-contained proof: the payload is the data, the CID is the hash of that data, and anyone can verify one against the other.

### B. Extract 5 Remaining Inline Data Arrays

Create new data files:

| New File | Contents |
|----------|----------|
| `src/data/team-members.ts` | 15 team member records (name, role, description, image, link) |
| `src/data/events.ts` | Upcoming events array |
| `src/data/research-papers.ts` | Research papers organized by category |
| `src/data/about-cards.ts` | "What We Do" and "Our Principles" card data |

### C. Register All New Data Objects in Content Registry

Add 4 new entries to `CERTIFIABLE_CONTENT` in `uor-content-registry.ts`:

- `content:team-members`
- `content:events`
- `content:research-papers`
- `content:about-cards`

This brings the total from 11 to 15 certified content objects.

### D. Add Verification Function to Content Registry

Add a `verifyContentCertificate(id)` function that:
1. Retrieves the certificate for a given content ID
2. Re-canonicalizes the current data
3. Re-computes the CID
4. Compares it to the stored CID
5. Returns true/false

This mirrors `verifyModule()` in the module registry and makes content certificates genuinely verifiable at runtime rather than just stamped as "verified: true" at creation time.

### E. Update Components to Import from Data Files

- `CTASection.tsx` imports `members` from `src/data/team-members.ts`
- `ResearchPage.tsx` imports `events` and `categoryResearch` from their respective data files
- `AboutPage.tsx` imports card data from `src/data/about-cards.ts`

### F. Update Verification Dashboard

Expand the UOR Verification panel to show all 15 content certificates (up from 11), and for each certificate display a truncated canonical payload preview so users can see that the receipt is decodable.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/data/team-members.ts` | Serializable team member data |
| `src/data/events.ts` | Serializable events data |
| `src/data/research-papers.ts` | Serializable research papers by category |
| `src/data/about-cards.ts` | Serializable "What We Do" and "Our Principles" cards |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/uor-certificate.ts` | Add `cert:canonicalPayload` field to `UorCertificate` interface and populate it during generation |
| `src/lib/uor-content-registry.ts` | Add 4 new certifiable content entries; add `verifyContentCertificate()` function |
| `src/modules/landing/components/CTASection.tsx` | Import `members` from data file instead of inline |
| `src/modules/community/pages/ResearchPage.tsx` | Import `events` and `categoryResearch` from data files |
| `src/modules/core/pages/AboutPage.tsx` | Import card data from data file |
| `src/modules/core/components/UorVerification.tsx` | Show canonical payload preview for each certificate |
| `src/modules/core/components/UorMetadata.tsx` | Include canonical payloads in JSON-LD metadata |

## What Does Not Change

- Visual design, layout, animations, or styling
- The UOR addressing library (`uor-address.ts`)
- The module registry (`uor-registry.ts`)
- Existing 11 content certificates (they gain the canonical payload field but keep the same CIDs)
- Edge function code
- Any user-facing behavior beyond the expanded verification panel

## Technical Detail: Rehydration Flow

```text
Certificate Receipt
    |
    +-- cert:canonicalPayload  -->  JSON.parse()  -->  Original Object
    |
    +-- cert:cid  -->  Compare against SHA-256(canonicalPayload)  -->  Verified (true/false)
```

This makes every certificate a self-contained, objective mathematical proof. The receipt IS the object, encoded canonically, with a deterministic hash proving it has not been altered. No external context is needed to verify it.
