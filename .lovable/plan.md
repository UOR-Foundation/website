# Code Nexus × Hologram — Implementation Plan

> **Principle**: Every phase produces a working, testable increment. No phase depends on unbuilt future phases. Maximum coherence, minimum complexity.

---

## Phase 0 — Foundation: Lens Identity & Route Scaffold

**Goal**: Establish the canonical UOR identity for Code Nexus and create the minimal navigable shell.

**Why first**: Everything downstream needs a stable CID and route. This phase costs ~30 minutes and unblocks all others.

### Steps

1. **Generate the Code Nexus Lens Blueprint CID**
   - Define the canonical JSON-LD blueprint object:
     ```jsonld
     {
       "@context": "https://uor.foundation/context/v1",
       "@type": "lens:Blueprint",
       "name": "Code Nexus",
       "morphism": "Isometry",
       "version": "1.0.0",
       "problem_statement": "Transform source code into navigable, queryable knowledge graphs",
       "pipeline": [
         { "stage": "parse", "engine": "tree-sitter-wasm" },
         { "stage": "graph", "engine": "kuzudb-wasm" },
         { "stage": "cluster", "algorithm": "community-detection" }
       ]
     }
     ```
   - Run through `singleProofHash()` to produce the canonical CID
   - This CID becomes the immutable identity for the Code Nexus Lens

2. **Insert into `lens_blueprints` table**
   - `name`: "Code Nexus"
   - `morphism`: "Isometry"
   - `uor_cid`: (generated above)
   - `uor_address`: derived hex16 address
   - `derivation_id`: from `singleProofHash`
   - `tags`: `["code-intelligence", "knowledge-graph", "graph-rag"]`

3. **Create module directory and empty page**
   ```
   src/modules/code-nexus/
   └── pages/
       └── CodeNexusPage.tsx    # Minimal shell with PageShell wrapper
   ```

4. **Register route in App.tsx**
   - `/code-nexus` → `CodeNexusPage`

5. **Add to Hologram OS navigation**
   - Add "Code Nexus" entry to the Apps grid in `MobileOsShell`
   - Add to sidebar navigation when on `/code-nexus`

### Deliverable
- Navigable `/code-nexus` route with empty PageShell
- Lens blueprint persisted with valid UOR identity
- Accessible from both mobile and desktop Hologram OS

### Test
- Navigate to `/code-nexus` — page renders without error
- Query `lens_blueprints` — Code Nexus row exists with valid CID
- Sidebar and mobile grid both show the new entry

---

## Phase 1 — Ingestion: Repository → Abstract Syntax Trees

**Goal**: Accept a GitHub URL or ZIP file, fetch its contents, and parse every source file into structured AST data — all in-browser.

**Why second**: Parsing is the input to everything. No graph, no queries, no RAG without parsed code.

### Steps

1. **Create `RepoInput.tsx` component**
   - Text input for GitHub repository URL (e.g., `https://github.com/user/repo`)
   - Drag-and-drop zone for ZIP file upload
   - Validation: reject non-GitHub URLs, validate ZIP structure

2. **Create ingestion Web Worker (`ingestion.worker.ts`)**
   - **GitHub path**: Use GitHub's ZIP archive endpoint (`/archive/refs/heads/main.zip`)
     - Fetch via a backend function to avoid CORS (edge function: `fetch-repo`)
     - Unzip in-browser using `fflate` (lightweight, zero-dependency)
   - **ZIP path**: Read directly from the dropped file
   - **Output**: Array of `{ path: string, content: string, language: string }` file records

3. **Add Tree-sitter WASM parsing**
   - Install `web-tree-sitter` dependency
   - Load language grammars on demand (TypeScript, JavaScript, Python, Rust, Go)
   - Parse each file → extract:
     - **Declarations**: functions, classes, interfaces, types, constants
     - **References**: imports, function calls, type references
     - **Relationships**: `file → contains → declaration`, `declaration → imports → declaration`
   - Output: `CodeEntity[]` and `CodeRelationship[]` typed arrays

4. **Create UOR mapper (`uor-mapper.ts`)**
   - Each `CodeEntity` → content-addressed via `singleProofHash` on its AST subtree
   - Each entity gets a canonical IRI: `urn:uor:code:{repo_cid}:{entity_type}:{entity_name}`
   - Each relationship → UOR triple: `{ subject, predicate, object, graph_iri }`
   - Predicate vocabulary:
     - `uor:pred:contains` — file contains declaration
     - `uor:pred:imports` — module imports module
     - `uor:pred:invokes` — function calls function
     - `uor:pred:extends` — class extends class
     - `uor:pred:implements` — class implements interface

5. **Edge function: `fetch-repo`**
   - Accepts `{ url: string }` (GitHub repo URL)
   - Fetches the ZIP archive from GitHub API
   - Returns the ZIP as binary response
   - No secrets needed (public repos); future: GitHub token for private repos

### Deliverable
- User pastes a GitHub URL → files are fetched, parsed, and structured into typed entities and relationships
- Every entity has a UOR CID; every relationship is a valid triple
- All processing happens in a Web Worker (non-blocking)

### Test
- Paste `https://github.com/abhigyanpatwari/GitNexus` → ingestion completes without error
- Entity count > 0, relationship count > 0
- Each entity has a non-empty `uor_cid`
- Each triple has valid `subject`, `predicate`, `object` fields
- UI remains responsive during parsing (worker thread)

---

## Phase 2 — Storage: Knowledge Graph in KuzuDB WASM

**Goal**: Store parsed entities and relationships in an in-browser graph database, enabling Cypher queries.

**Why third**: The graph database is the queryable heart. Without it, we have data but no intelligence.

### Steps

1. **Install `kuzu-wasm` dependency**

2. **Create graph worker (`graph.worker.ts`)**
   - Initialize KuzuDB WASM instance
   - Define schema:
     ```cypher
     CREATE NODE TABLE CodeEntity (
       id STRING PRIMARY KEY,
       name STRING,
       entity_type STRING,
       file_path STRING,
       start_line INT64,
       end_line INT64,
       uor_cid STRING
     );
     CREATE REL TABLE IMPORTS (FROM CodeEntity TO CodeEntity);
     CREATE REL TABLE INVOKES (FROM CodeEntity TO CodeEntity);
     CREATE REL TABLE EXTENDS (FROM CodeEntity TO CodeEntity);
     CREATE REL TABLE CONTAINS (FROM CodeEntity TO CodeEntity);
     CREATE REL TABLE IMPLEMENTS (FROM CodeEntity TO CodeEntity);
     ```
   - Batch-insert entities and relationships from Phase 1 output
   - Expose `executeQuery(cypher: string) → ResultSet` message interface

3. **Create `useGraphQuery` hook**
   - Sends Cypher queries to the graph worker
   - Returns typed results with loading/error states
   - Pre-built queries:
     - `getCallChain(fnName)` — trace invocation paths
     - `getDependencies(moduleName)` — list all imports
     - `getImpact(fnName)` — what calls this function?
     - `getCluster(entityName)` — community detection via BFS

4. **Persist graph state (Dehydration)**
   - Serialize the entity + relationship arrays to canonical JSON
   - Hash via `singleProofHash` → produce session CID
   - Store in `hologram_sessions` table:
     - `blueprint`: the entity/relationship arrays
     - `session_cid`: content hash of the serialized graph
     - `label`: repository name
     - `status`: "active"
   - On reload, check for existing session → rehydrate KuzuDB from stored data

### Deliverable
- In-browser graph database populated with code entities
- Cypher queries return correct results
- Sessions persist across page reloads via `hologram_sessions`

### Test
- After ingestion: `MATCH (n:CodeEntity) RETURN count(n)` returns entity count matching Phase 1
- `MATCH (a)-[:INVOKES]->(b) RETURN a.name, b.name LIMIT 5` returns valid call pairs
- Close browser tab → reopen `/code-nexus` → session loads from `hologram_sessions`
- `session_cid` is deterministic: same repo produces same CID

---

## Phase 3 — Visualization: Interactive Knowledge Graph

**Goal**: Render the code graph as a beautiful, explorable force-directed visualization using the existing Hologram aesthetic.

**Why fourth**: Users need to see and feel the graph. This is where delight meets function.

### Steps

1. **Create `GraphExplorer.tsx` component**
   - Use `d3-force` (already installed) for force-directed layout
   - SVG rendering with zoom/pan via `d3-zoom`
   - Node sizing by entity type: Module (24px) > Class (16px) > Function (10px)
   - Node colors from Hologram earth-tone palette:
     - Module: `hsl(38, 25%, 28%)` (warm walnut)
     - Class: `hsl(25, 18%, 28%)` (stone)
     - Function: `hsl(45, 16%, 26%)` (sand)
     - Interface: `hsl(30, 12%, 22%)` (charcoal)
   - Edge styling:
     - `imports`: dashed, low opacity
     - `invokes`: solid, medium opacity
     - `extends`: thick, high opacity
   - Labels: DM Sans, only visible on hover or zoom

2. **Create `EntityInspector.tsx` component**
   - Side panel that opens when a node is clicked
   - Shows: entity name, type, file path, line range, UOR CID
   - Lists incoming and outgoing relationships
   - "View in Intelligence" button → opens Hologram Intelligence with context

3. **Add graph statistics bar**
   - Entity count, relationship count, cluster count
   - Repository name and session CID (truncated)
   - "Dehydrate" button to save current session

4. **Animations**
   - Nodes fade in with `animate-fade-in` on initial render
   - Clicked node pulses with the heartbeat animation (reuse from Intelligence pill)
   - Smooth transitions when filtering/highlighting subgraphs

### Deliverable
- Beautiful, interactive graph matching Hologram OS aesthetic
- Click any node → inspect its identity and relationships
- Zoom, pan, filter by entity type

### Test
- Graph renders with correct node count matching KuzuDB
- Click a node → EntityInspector shows correct data including UOR CID
- Zoom to 200% → labels appear, graph remains performant
- Graph colors match the Hologram earth-tone palette (visual check)
- Nodes animate in smoothly on initial load

---

## Phase 4 — Intelligence Bridge: Natural Language Code Queries

**Goal**: Enable users to ask code questions in natural language through Hologram Intelligence, with answers derived from the knowledge graph.

**Why fifth**: This is the highest-value user experience — combining the serene Intelligence chat with deep code understanding.

### Steps

1. **Create `code-nexus-query` tool for Intelligence**
   - When a Code Nexus session is active, register an additional tool in the Intelligence chat
   - Tool accepts natural language, translates to Cypher via Lovable AI Gateway:
     ```
     System: You are a Cypher query generator for a code knowledge graph.
     Schema: CodeEntity(id, name, entity_type, file_path), 
             relationships: IMPORTS, INVOKES, EXTENDS, CONTAINS, IMPLEMENTS
     User question: "{question}"
     Generate a Cypher query that answers this question.
     ```
   - Execute generated Cypher against KuzuDB WASM
   - Feed results back to LLM for natural language synthesis

2. **Create `useCodeIntelligence` hook**
   - Wraps the query pipeline: NL → Cypher → Execute → Synthesize
   - Returns streaming response for the Intelligence chat bubbles
   - Includes the generated Cypher in message metadata for transparency

3. **UOR Certification of answers**
   - Each question → answer pair stored as `uor_inference_proof`:
     - `input_hash`: hash of (question + graph_cid)
     - `output_hash`: hash of answer
     - `tool_name`: "code_nexus_query"
     - `epistemic_grade`: based on result coverage
       - Grade A: query returned results, full traversal
       - Grade B: query returned results, partial match
       - Grade D: query returned empty, answer is heuristic
   - Cache: identical (question + graph_cid) → instant replay

4. **Wire into `HologramAiChat.tsx`**
   - Detect if a Code Nexus session is active (check `hologram_sessions`)
   - If active, add a subtle "Code Nexus connected" indicator
   - Route code-related questions through the Graph RAG pipeline
   - Non-code questions still go through the standard Intelligence path

### Deliverable
- Ask "What functions call handleAuth?" in Hologram Intelligence → get accurate, graph-backed answer
- Every answer is UOR-certified with epistemic grade
- Cache prevents redundant computation

### Test
- Ask "List all modules" → returns correct module names from the graph
- Ask "What does function X call?" → returns accurate call chain
- Ask the same question twice → second response is instant (cache hit)
- Check `uor_inference_proofs` table → new row with correct hashes
- Non-code question ("What's the weather?") → routed to standard Intelligence (no interference)

---

## Phase 5 — UOR Triple Sync & Certification

**Goal**: Persist code graph entities as first-class UOR triples, making them discoverable across the entire framework.

**Why sixth**: This is where Code Nexus transcends "a tool" and becomes part of the universal knowledge fabric.

### Steps

1. **Create `useUorBridge` hook**
   - After successful ingestion, batch-insert code relationships into `uor_triples`:
     ```typescript
     {
       subject: "urn:uor:code:{repo_cid}:fn:handleAuth",
       predicate: "uor:pred:invokes",
       object: "urn:uor:code:{repo_cid}:fn:validateToken",
       graph_iri: "urn:uor:lens:code-nexus:{session_cid}"
     }
     ```
   - Use `graph_iri` scoping so code triples don't pollute other UOR graphs

2. **Generate UOR Derivation for the analysis**
   - One `uor_derivation` per ingestion run:
     - `original_term`: repository URL
     - `canonical_term`: session CID
     - `epistemic_grade`: "A" (deterministic pipeline)
     - `metrics`: `{ entities, relationships, files_parsed, parse_time_ms }`

3. **Generate UOR Receipt for the pipeline**
   - One `uor_receipt` per ingestion:
     - `module_id`: "code-nexus"
     - `operation`: "ingest"
     - `input_hash`: hash of source files
     - `output_hash`: session CID
     - `coherence_verified`: true (deterministic)
     - `self_verified`: true

4. **Certificate issuance**
   - After successful derivation + receipt, issue a `uor_certificate`:
     - `certifies_iri`: `urn:uor:lens:code-nexus:{session_cid}`
     - `derivation_id`: from step 2
     - Links the entire pipeline into the trust chain

### Deliverable
- Code relationships queryable via the existing SPARQL/triple infrastructure
- Every analysis run is fully traceable: derivation → receipt → certificate
- Code entities are discoverable alongside all other UOR objects

### Test
- Query `uor_triples WHERE graph_iri LIKE 'urn:uor:lens:code-nexus:%'` → returns code relationships
- Query `uor_derivations WHERE canonical_term = '{session_cid}'` → returns derivation with metrics
- Query `uor_receipts WHERE module_id = 'code-nexus'` → returns receipt with coherence_verified = true
- Query `uor_certificates WHERE certifies_iri LIKE 'urn:uor:lens:code-nexus:%'` → valid certificate exists
- Re-ingest same repo → same session CID (deterministic)

---

## Phase 6 — Activity Tracking & Day Ring Integration

**Goal**: Feed code exploration activity into the Day Progress Ring's "Working" segment.

**Why last**: Depends on Phase 3 (visualization) being usable and Phase 4 (Intelligence) being active.

### Steps

1. **Track Code Nexus session activity**
   - When `/code-nexus` is active, emit `activity:working` events to localStorage
   - Format: `{ category: "working", start: timestamp, end: timestamp }`
   - Update on visibility change (tab switch) and page unload

2. **Extend `DayProgressRing.tsx`**
   - Add three concentric arcs inside the existing ring:
     - **Outer (gold, `hsl(38, 35%, 62%)`)**: Learning — time on `/standard`, `/research`
     - **Middle (copper, `hsl(25, 45%, 50%)`)**: Working — time on `/code-nexus`, `/hologram-console`
     - **Inner (sage, `hsl(140, 15%, 45%)`)**: Playing — time on other routes
   - Each arc has its own `strokeDashoffset` based on tracked minutes
   - Hover any arc → tooltip shows hours:minutes in that category

3. **Reflection prompt (future)**
   - Placeholder hook for end-of-day summary
   - "You spent 3h working, 1h learning, 30m exploring today"

### Deliverable
- Day Ring shows three activity segments
- Code Nexus usage automatically feeds the "Working" arc
- Visual harmony with existing ring aesthetic

### Test
- Spend 5 minutes on `/code-nexus` → "Working" arc visibly increases
- Hover the copper arc → tooltip shows correct time
- Total of all three arcs ≤ 100% of elapsed day
- Ring still shows overall day progress correctly

---

## Comprehensive Test Plan

### Unit Tests

| Test | Phase | Assertion |
|---|---|---|
| `singleProofHash(blueprint)` produces stable CID | 0 | Same input → same output, always |
| Tree-sitter parses TypeScript file | 1 | Entity count > 0 for a known file |
| UOR mapper produces valid triples | 1 | All triples have non-empty subject/predicate/object |
| KuzuDB schema creation succeeds | 2 | No errors on `CREATE NODE TABLE` |
| Entity insertion round-trips | 2 | Insert N entities → `count(n)` = N |
| Cypher `MATCH` returns correct results | 2 | Known call pair exists in results |
| Graph dehydration is deterministic | 2 | Same data → same session CID |
| Rehydration restores all entities | 2 | Entity count matches pre-dehydration |
| NL → Cypher generates valid query | 4 | Generated Cypher parses without error |
| Cache hit returns same result | 4 | Second call is instant, same output |
| Triple insertion has correct graph_iri | 5 | All triples scoped to session |
| Derivation metrics are accurate | 5 | Entity count in metrics matches actual |
| Receipt is coherence_verified | 5 | `coherence_verified = true` |
| Activity tracking records time | 6 | localStorage has entry after navigation |

### Integration Tests

| Test | Phases | Assertion |
|---|---|---|
| Full pipeline: URL → graph → query | 1-2 | Paste URL → wait → query returns results |
| Persistence round-trip | 0-2 | Ingest → close tab → reopen → session loads |
| Intelligence bridge end-to-end | 1-4 | Ask question in chat → get graph-backed answer |
| UOR compliance chain | 1-5 | Derivation → receipt → certificate all exist and link |
| Activity tracking accuracy | 3-6 | Time on page ≈ tracked working time (±10s) |

### Visual/UX Tests

| Test | Phase | Check |
|---|---|---|
| Graph colors match Hologram palette | 3 | Visual comparison with existing UI |
| Node animations are smooth | 3 | No jank at 60fps |
| EntityInspector shows correct CID | 3 | CID matches `uor_triples` |
| Intelligence indicator appears | 4 | "Code Nexus connected" visible when session active |
| Day Ring arcs don't overlap | 6 | Three arcs are visually distinct |
| Mobile grid shows Code Nexus icon | 0 | Icon visible and tappable |

---

## Use Cases — What This Enables for Hologram Users

### 1. **Instant Codebase Understanding**
> *"I just joined a new project. What does this codebase actually do?"*

Drop a GitHub URL into Code Nexus → get an interactive knowledge graph showing every module, dependency, and call chain. No setup, no CLI, no server. The graph is navigable, zoomable, and beautiful.

**Value**: Reduces onboarding time from days to minutes. Especially powerful for open-source contributors evaluating whether to contribute to a project.

### 2. **Natural Language Code Exploration**
> *"How does the authentication flow work in this repo?"*

Ask in Hologram Intelligence → get a certified, graph-backed answer tracing the exact call chain from login to token validation. Every answer is epistemically graded (A/B/C/D) so you know how confident the system is.

**Value**: Non-technical stakeholders can understand technical architecture. Engineers can explore unfamiliar codebases without reading every file.

### 3. **Verifiable Code Analysis**
> *"Can you prove that your analysis of this codebase is correct?"*

Every Code Nexus analysis produces a UOR derivation chain: source files → AST parse → graph construction → query → answer. Each step is content-addressed and certificated. The session CID is deterministic — anyone can reproduce the exact same analysis from the same source.

**Value**: Trust. In an era of AI hallucination, Code Nexus provides cryptographic proof of its analysis pipeline. This is unique in the code intelligence space.

### 4. **Impact Analysis Before Changes**
> *"If I change this function, what else breaks?"*

Query: `getImpact("handleAuth")` → returns every function that directly or transitively depends on it. Visualize the blast radius on the graph with highlighted paths.

**Value**: Prevents blind edits. Developers see the full consequence graph before touching a line of code.

### 5. **Cross-Repository Knowledge Federation** (Phase 5+)
> *"Which of my projects depend on this library?"*

Index multiple repos → each becomes a Hologram with its own CID. Cross-repo queries traverse the unified triple store to find shared dependencies, duplicated code, and architectural patterns.

**Value**: Portfolio-level code intelligence. Organizations can understand their entire codebase topology from a single interface.

### 6. **Self-Tracking & Reflection**
> *"How much time did I spend working vs. learning today?"*

The Day Progress Ring tracks time spent in Code Nexus (Working), Framework pages (Learning), and Community/Chat (Playing). End-of-day reflection shows the breakdown.

**Value**: Conscious computing. Users become aware of how they spend their digital time, enabling intentional balance between creating, learning, and exploring.

### 7. **Persistent, Shareable Knowledge Objects**
> *"I analyzed this repo last week. Can I pick up where I left off?"*

Every Code Nexus session is dehydrated to a CID and stored in `hologram_sessions`. Reopen → rehydrate → continue. Share the CID with a collaborator → they see the exact same graph.

**Value**: Knowledge graphs become portable, persistent, and collaborative — not ephemeral browser sessions.

### 8. **AI Agent Context Enhancement**
> *"Make my AI coding assistant actually understand my codebase."*

The knowledge graph produced by Code Nexus is the same graph that GitNexus's MCP server exposes to AI agents (Cursor, Claude Code, etc.). By running the analysis in-browser, users can preview and validate the context their AI agents will receive.

**Value**: Bridge between visual understanding (for humans) and contextual grounding (for AI agents). Same graph, two interfaces.

---

## Summary

| Phase | Deliverable | Sessions | Dependencies |
|---|---|---|---|
| 0 | Lens identity + route scaffold | 1 | None |
| 1 | Repo ingestion + AST parsing | 1-2 | Phase 0, `web-tree-sitter` |
| 2 | KuzuDB graph + persistence | 1 | Phase 1, `kuzu-wasm` |
| 3 | Interactive graph visualization | 1-2 | Phase 2, `d3-force` (installed) |
| 4 | Intelligence Bridge (Graph RAG) | 1-2 | Phase 2, Lovable AI Gateway |
| 5 | UOR triple sync + certification | 1 | Phase 2, `singleProofHash` |
| 6 | Activity tracking + Day Ring | 1 | Phase 3 |

**Total estimated effort**: 7-10 sessions, each producing a working increment.

*Every phase is testable independently. Every phase increases the system's value. No phase is wasted if we stop early.*
