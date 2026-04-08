

## Sovereign Context Vault — Private File Aggregation + UOR-Mapped Context Engine

### What This Is

A new module (`src/modules/sovereign-vault/`) that lets users import personal files (documents, notes, images, code, bookmarks) from their device, cloud drives, or URLs. Every file is content-addressed via the UOR pipeline (URDNA2015 → SHA-256 → CID), encrypted client-side (AES-256-GCM via the existing Data Bank encryption layer), and stored in the user's private vault. The extracted semantic content is projected into the existing Fusion Graph as a new "documents" modality, making all personal context available to the Oracle search bar and LLM inference — without any data ever leaving the user's control in plaintext.

### How Eden.so Does It (and How We Differ)

Eden aggregates user files (notes, images, social links, references) into a workspace that an AI agent can access. Files are stored on Eden's servers, organized by folders/projects, and the agent queries them during conversations. The agent "learns how you work" by accumulating context over time.

**Our approach is fundamentally different**:
- **Zero-knowledge**: Files are encrypted client-side before cloud sync. The server never sees plaintext.
- **Content-addressed**: Every file gets a canonical UOR identity (CID, Braille glyph, IPv6). Deduplication is automatic.
- **Semantic projection**: File content is extracted, chunked, embedded into triples, and merged into the Fusion Graph. This means the Oracle search bar doesn't just search *the web* — it searches the user's entire sovereign knowledge base simultaneously.
- **No lock-in**: Files can be imported from local disk, URLs, or cloud storage. The canonical identity is portable.

### Architecture

```text
User Files (local/URL/cloud)
       │
       ▼
  ┌─────────────────┐
  │  Ingest Pipeline │ ← File API / drag-drop / URL fetch
  │  (extract text,  │
  │   parse metadata,│
  │   chunk content) │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ UOR Identity    │ ← singleProofHash(semantic object)
  │ (CID, glyph,   │   → content-addressed, deduped
  │  IPv6, triword) │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Encrypt + Store │ ← AES-256-GCM via Data Bank
  │ (user_data_bank │   → zero-knowledge cloud sync
  │  + storage)     │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Fusion Graph    │ ← New "documents" modality projection
  │ projectDocs()   │   → triples injected into context window
  └────────┬────────┘
           │
           ▼
  Oracle search bar / LLM context
  (personal + web + reasoning)
```

### Implementation Plan

#### 1. Database: `sovereign_documents` table

New table to store document metadata (the encrypted content goes to Data Bank slots):

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Row ID |
| `user_id` | uuid NOT NULL | Owner (RLS) |
| `cid` | text NOT NULL | UOR content address |
| `filename` | text | Original filename |
| `mime_type` | text | File MIME type |
| `size_bytes` | integer | Original file size |
| `source_type` | text | "local", "url", "cloud" |
| `source_uri` | text | Original source path/URL |
| `chunk_count` | integer DEFAULT 0 | Number of semantic chunks |
| `tags` | text[] DEFAULT '{}' | User-defined tags |
| `created_at` | timestamptz DEFAULT now() | Import time |

RLS: Users can only CRUD their own rows.

#### 2. New Module: `src/modules/sovereign-vault/`

**Files:**

| File | Purpose |
|---|---|
| `lib/extract.ts` | Text extraction pipeline: PDF (via edge function), plain text, markdown, HTML, JSON, images (metadata). Returns `{ text, metadata, chunks }` |
| `lib/chunker.ts` | Semantic chunking: splits extracted text into overlapping 512-token windows with sentence-boundary alignment. Each chunk gets its own CID |
| `lib/vault-store.ts` | Encrypt chunks → Data Bank slots (`doc:{cid}:chunk:{n}`), upsert metadata to `sovereign_documents`, content-address via `singleProofHash` |
| `lib/vault-search.ts` | Client-side semantic search across vault chunks using TF-IDF scoring against the query. Returns ranked chunks with source attribution |
| `lib/project-documents.ts` | Fusion Graph projection operator: `projectDocuments(userId)` → `CompressibleTriple[]`. Queries `sovereign_documents` + decrypts top chunks for context injection |
| `hooks/useVault.ts` | React hook: `importFile()`, `importUrl()`, `listDocuments()`, `searchVault(query)`, `removeDocument()`, `getTags()` |
| `components/VaultPanel.tsx` | UI: drag-drop zone, file list with CID badges, tag management, search bar, storage usage indicator |
| `components/VaultImportDialog.tsx` | Modal: file picker + URL input + progress indicator during ingestion |
| `components/VaultContextBadge.tsx` | Small badge on Oracle search bar showing "N docs in context" when vault has content |
| `index.ts` | Barrel exports |

#### 3. Fusion Graph Integration

Add `projectDocuments()` to `fusion-graph.ts` as a 5th modality alongside audio, proofs, memories, and context. The `assembleFusionGraph()` function will call it in parallel with the others:

```text
Audio Features  ─┐
Proof Chains     ─┤
Agent Memories   ─┤→ CompressibleTriple[] → UGC2 → context window
User Context     ─┤
Sovereign Docs   ─┘  ← NEW
```

Each document chunk becomes triples:
- `doc:{cid} rdf:type doc:sovereign`
- `doc:{cid} schema:name {filename}`
- `doc:{cid} doc:chunk {chunk_text_truncated}`
- `doc:{cid} doc:tag {tag}`
- `doc:{cid} doc:source {source_uri}`

#### 4. Oracle Search Integration

Modify the Oracle search pipeline to include vault results:
- In `ResolvePage.tsx`, before calling the web search, run `searchVault(query)` from `useVault`
- If vault hits exist, inject them as a "Personal Context" section above web results in `HumanContentView`
- Pass vault-relevant chunks into the LLM context block alongside the fusion graph

#### 5. Edge Function: `parse-document`

For binary files (PDF, DOCX) that can't be parsed client-side:
- Accepts file upload via multipart form
- Extracts text using server-side parsing
- Returns extracted text + metadata
- JWT-authenticated, user-scoped

#### 6. UI Entry Points

- **Vault Panel**: Accessible from the Oracle reader toolbar (new icon) or from a dedicated `/vault` route
- **Drag-Drop**: The Oracle search view accepts file drops — files go directly into the vault
- **URL Import**: Paste a URL in the vault import dialog — uses Firecrawl to scrape and ingest
- **Context Badge**: When vault has documents, the search bar shows a subtle "N docs" indicator

### What the User Experiences

1. Drop a file onto the Oracle → it gets content-addressed, encrypted, and indexed
2. Search for anything → results blend web knowledge + personal vault seamlessly
3. The AI responses reference personal documents when relevant, with source attribution
4. All data is encrypted — the server never sees plaintext
5. Every document has a permanent UOR identity that works across devices

### Files Summary

| Action | Files |
|---|---|
| **Migration** | `sovereign_documents` table + RLS |
| **New module** | `src/modules/sovereign-vault/` (9 files) |
| **New edge fn** | `supabase/functions/parse-document/index.ts` |
| **Modify** | `fusion-graph.ts` (add documents modality), `ResolvePage.tsx` (vault search integration), `HumanContentView.tsx` (personal results section), `ImmersiveSearchView.tsx` (drag-drop zone) |

