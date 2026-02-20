
# UOR Framework API Page — OpenAPI 3.1.0 Strict Conformance Redesign

## What Is Being Fixed and Why

The current `/api` page works but has several gaps that undermine its credibility with a technically precise audience (developers and AI agents):

1. **Structural non-conformance with OpenAPI 3.1.0 presentation standards** — The page does not surface the information hierarchy that OpenAPI tools (Swagger UI, Redoc, Stoplight) surface as standard: server object, security schemes, tag groups as first-class sections, component schema references, response code variants, and rate-limit semantics.

2. **No machine-readable link in the UI** — A developer or agent visiting `/api` sees no direct path to the machine-parseable `openapi.json`. The link is buried in the footer area.

3. **Tag grouping is implicit** — OpenAPI 3.1.0 defines tags as first-class groupings. The current UI uses "Kernel / Bridge / User space" tabs which is correct but doesn't expose the exact tag names from the spec (`kernel-op`, `kernel-schema`, `bridge-partition`, etc.) that an agent would use to filter the spec.

4. **No schema / response code panel** — Each endpoint shows only the happy-path curl and run-live. OpenAPI conformance requires surfacing response schemas and at least listing the documented error codes (400, 413, 429) so an agent knows what contract to expect.

5. **operationId is not prominently displayed** — The `operationId` is the canonical machine identifier for an operation in OpenAPI. Agents use it to reference operations. It should be displayed as a primary label.

6. **Navigation bar missing the API page** — The `/api` page is not linked from the navbar. Both human developers and agents following `<link>` tags and visible navigation cannot discover it from other pages.

7. **llms.md agent welcome section needs the API page URL** — The quick card currently sends agents through the Supabase edge function URL. It should also surface `https://uor.foundation/api` as the human-readable interface.

---

## Changes

### 1. `src/pages/Api.tsx` — Full redesign

The redesigned page is structured to match the OpenAPI 3.1.0 document hierarchy exactly:

**Section 0 — Page hero (strict OpenAPI info object)**
- Title: "UOR Framework Agent API" (matches `info.title`)
- Version badge: "v1.0.0" (matches `info.version`)
- Summary: verbatim from `info.summary`
- Two primary action buttons: "OpenAPI 3.1.0 spec (openapi.json)" and "GET /navigate — machine index"
- License badge (Apache 2.0) and contact link
- Extension fields surfaced as metadata chips: `x-agent-entry-point`, `x-ontology-source`, `x-community`

**Section 1 — Servers block**
- Renders the two server entries from `openapi.json`:
  - Live edge function URL (primary, copyable)
  - Production URL `https://uor.foundation/api/v1`
- Rate limit table: GET 120/min (kernel), POST 60/min (bridge), authenticated 600/min

**Section 2 — Quick Start (agent-optimised)**
A tight three-step box:
- Step 1: `GET /navigate` — get the complete index
- Step 2: `GET /kernel/op/verify?x=42` — verify the critical identity
- Step 3: `GET /openapi.json` — parse the full spec
Each step has a one-click copy button and a "Run live" inline button that fires directly without expanding a panel.

**Section 3 — Tags as primary navigation (OpenAPI-conformant)**
Replaces the current "Kernel / Bridge / User" tab model with a left sidebar (desktop) / top tabs (mobile) matching OpenAPI tag names exactly:
- `navigate` — Framework index
- `kernel-op` — op: Ring operations
- `kernel-schema` — u: + schema: Content addressing
- `bridge-partition` — partition: Irreducibility
- `bridge-proof` — proof: Verification proofs
- `bridge-cert` — cert: Attestation
- `bridge-observable` — observable: Metrics
- `user-type` — type: Type system

Each tag panel shows:
- Tag description (verbatim from spec `tags[]`)
- Ontology source file link
- List of endpoints under that tag

**Section 4 — Endpoint cards (OpenAPI operation object)**
Each card prominently shows, in order:
```
[METHOD] /path                              [operationId]
[tag badge] [namespace badge]
─────────────────────────────────────────────
summary (from spec)
description (from spec, truncated with expand)

Parameters table (name | in | type | required | description) ← matches OpenAPI schema
Request body (schema type, example)
Response codes: 200 ✅ | 400 ⚠️ | 413 ⚠️ | 429 ⏱️  ← all documented codes
curl command (copyable)
[▶ Run live] — fires request, shows formatted JSON response
```

The `operationId` is shown in a monospace chip at top-right of each card header — this is the canonical operation identifier agents use.

**Section 5 — Components / Schemas reference**
A collapsible "Schemas" panel listing the 15 `$ref` schema names from the OpenAPI spec with their `@type` mapping:
```
CriticalIdentityProofResponse   → proof:CriticalIdentityProof
CoherenceProofResponse          → proof:CoherenceProof
Datum                           → schema:Datum
AddressEncodeResponse           → u:Address
PartitionResponse               → partition:Partition
InvolutionCertificateResponse   → cert:InvolutionCertificate
ObservableMetricsResponse       → observable:RingMetric
...
```
Each row links to the `#/components/schemas/...` anchor in the openapi.json.

**Section 6 — Namespace → API map** (unchanged from current, already good)

**Section 7 — Agent discovery chain** (enhanced)
Shows the discovery path as a numbered flow:
```
/.well-known/uor.json
      ↓ uor:api.openapi
GET /openapi.json  (→ 302 → https://uor.foundation/openapi.json)
      ↓ parse paths
GET /navigate  (complete endpoint index, reading order)
      ↓ start with
GET /kernel/op/verify?x=42  (zero-auth, immediate result)
```

**Section 8 — `llms.md` / `llms-full.md` entry points for agents** (footer)
A clear "For AI agents" box referencing the two markdown documents and the `/.well-known/uor.json` discovery file — making the page self-describing for agents that render HTML.

---

### 2. `src/components/layout/Navbar.tsx` — Add "API" nav item

Add `{ label: "API", href: "/api" }` to `navItems`. This makes the REST API Explorer discoverable from every page by both humans and agents parsing the navigation.

The API item is placed after "UOR Framework" — the natural discovery position for a developer or agent reading left-to-right.

---

### 3. `public/llms.md` — Update agent welcome metadata and Quick Start

**Frontmatter update:** Add `api_url: https://uor.foundation/api` and `api_spec: https://uor.foundation/openapi.json` to the YAML frontmatter block. This makes the API discoverable to any agent that parses the frontmatter as structured data.

**Quick Start Step 1.5 update:** Replace the current raw Supabase URL with a two-line entry:
```
Step 1.5 — Explore the full REST API:
  Human interface:  https://uor.foundation/api
  Machine spec:     https://uor.foundation/openapi.json
  Navigation index: GET {BASE_URL}/navigate
```

---

## Technical Implementation Details

**Sidebar navigation layout:**
- Desktop: fixed left sidebar with tag list, right panel with endpoints
- Mobile: horizontal scrollable tab strip above endpoint list
- Active tag highlighted with primary colour
- Endpoint count badge per tag

**Response code display:**
- Green chip for 200, yellow for 4xx with tooltip showing the `$ref` error schema description
- Clicking a response code chip expands to show the documented schema (from `components/responses`)

**operationId prominence:**
- Displayed as `font-mono text-xs` in a muted chip at the top-right of each collapsed card header
- Full `operationId` is always visible without expanding — this is what agents scan for

**Parameter table:**
Each GET endpoint shows a structured table:
| Name | In | Type | Required | Default | Description |
| x | query | integer [0, 2^n) | no | — | Ring element |
| n | query | integer [1, 16] | no | 8 | Bit-width |

Rather than inline inputs mixed with text, the parameters are a clean table above the input fields.

**"Run live" placement:**
The "Run live" button is visible on the collapsed card header (alongside method badge and path) — no need to expand to test. Clicking it expands and fires simultaneously.

**JSON response syntax highlighting:**
Replace plain `<pre>` with a lightweight token colourer (pure CSS/regex, no library) that distinguishes strings (green), numbers (amber), booleans (blue), keys (white), making JSON-LD responses readable at a glance.

**Spec conformance badge:**
A persistent "OpenAPI 3.1.0 Compliant" badge in the page header links directly to `https://www.openapis.org/` — the exact URL the user referenced. This signals trustworthiness to the technically informed audience.

---

## Execution Order

1. Update `src/components/layout/Navbar.tsx` — add API nav item (one-liner)
2. Update `public/llms.md` — add frontmatter API fields and Step 1.5 update
3. Rewrite `src/pages/Api.tsx` — full redesign per plan above
