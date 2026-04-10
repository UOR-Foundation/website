# Edge Functions Reference

All serverless functions deployed via Supabase Edge Functions. Located in `supabase/functions/`.

## AI & Reasoning

| Function | Purpose | Auth |
|----------|---------|------|
| `ai-chat` | Multi-model AI chat (OpenAI, Gemini) | User |
| `ai-search` | Semantic search with AI ranking | User |
| `ai-summary` | Document summarization | User |
| `proof-of-thought` | Generate epistemic proof receipts for AI responses | User |
| `reasoning-proof` | Multi-step reasoning with convergence checking | User |
| `oracle-search` | Federated search across knowledge sources | User |
| `mcp-gateway` | Model Context Protocol proxy for agent tools | User |

## Identity & Certificates

| Function | Purpose | Auth |
|----------|---------|------|
| `issue-certificate` | Issue UOR identity certificates | User |
| `verify-certificate` | Verify certificate chains | Public |
| `resolve-address` | Resolve UNS names to content addresses | Public |
| `datum-resolve` | Resolve datum URIs to content | Public |

## Messaging

| Function | Purpose | Auth |
|----------|---------|------|
| `conduit-create` | Create encrypted messaging sessions | User |
| `conduit-send` | Send encrypted messages | User |
| `conduit-receive` | Poll for new messages | User |
| `matrix-bridge` | Bridge messages to/from Matrix protocol | User |
| `bridge-webhook` | Incoming webhook for external platform bridges | Service |

## Knowledge Graph

| Function | Purpose | Auth |
|----------|---------|------|
| `kg-put` | Insert triples into the knowledge graph | User |
| `kg-query` | SPARQL query execution | User |
| `kg-export` | Export graph as JSON-LD | User |
| `kg-import` | Bulk import triples | User |

## Audio & Media

| Function | Purpose | Auth |
|----------|---------|------|
| `audio-ingest` | Ingest and index audio tracks | User |
| `audio-features` | Extract audio features (spectral, harmonic) | User |
| `audio-stream` | HLS streaming endpoint | User |
| `tts` | Text-to-speech synthesis | User |

## Storage & Sync

| Function | Purpose | Auth |
|----------|---------|------|
| `vault-sync` | Sync encrypted vault slots across devices | User |
| `vault-backup` | Create encrypted vault backups | User |
| `space-sync` | Sovereign Spaces P2P sync coordinator | User |
| `takeout-export` | Full data export (GDPR-compatible) | User |

## Agent & Automation

| Function | Purpose | Auth |
|----------|---------|------|
| `agent-memory` | Persist and retrieve agent memories | User |
| `agent-session` | Manage agent session chains | User |
| `habit-kernel` | Track and promote behavioral patterns | User |
| `reward-trace` | Log reward signals for agent learning | User |

## Community & Social

| Function | Purpose | Auth |
|----------|---------|------|
| `invite-link` | Generate and track invite links | User |
| `address-comment` | Comment on content addresses | User/Guest |
| `address-reaction` | React to content addresses | User |
| `lead-capture` | Landing page email capture | Public |
| `project-submit` | Open-source project submissions | Public |

## Verification & Compliance

| Function | Purpose | Auth |
|----------|---------|------|
| `atlas-verify` | Run atlas verification proofs | User |
| `compliance-check` | Validate against canonical axioms | User |
| `schema-validate` | JSON Schema / SHACL validation | Public |

## Infrastructure

| Function | Purpose | Auth |
|----------|---------|------|
| `health` | Health check endpoint | Public |
| `cors-proxy` | CORS proxy for external APIs | Service |
| `webhook-relay` | Generic webhook relay | Service |
| `scheduler` | Cron-triggered maintenance tasks | Service |
| `stripe-webhook` | Payment webhook handler | Service |
| `calendar-sync` | External calendar sync (Google, Outlook) | User |

---

**Auth levels:**
- **Public** — No authentication required
- **User** — Requires a valid JWT (logged-in user)
- **Service** — Requires service role key (server-to-server only)
