

## UOR-Native Secure Messaging Protocol (UMP)

### What It Does

A fully UOR-rooted, end-to-end encrypted messaging system where every conversation is protected by a unique, single-use cryptographic channel. Person-to-person and group chats each get their own content-addressed security token (a "Conduit Session") that can be independently revoked. The protocol composes the existing UOR primitives — no new cryptographic inventions.

### Conceptual Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Messenger UI (ConversationView, ChatSidebar)           │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: UMP Session Manager                                     │
│   - Creates/revokes per-conversation ConduitSessions             │
│   - Group fan-out (one Kyber KEM per member)                     │
│   - Message DAG for ordering + offline reconciliation            │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: TSP Envelopes (tsp.ts)                                  │
│   - Sender/receiver VIDs, replay protection, content-addressing  │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: UNS Conduit (conduit.ts)                                │
│   - Kyber-1024 KEM → per-session AES-256-GCM key                │
│   - Dilithium-3 identity authentication                          │
├─────────────────────────────────────────────────────────────────┤
│ Layer 0: UOR Identity (identity.ts → URDNA2015 → SHA-256)       │
└─────────────────────────────────────────────────────────────────┘
```

### Core Design Principles (inspired by Any-Sync)

1. **One session token per conversation** — Each 1:1 chat creates an independent Kyber-1024 KEM handshake producing a unique AES-256-GCM key. Revoking the session = destroying the key. Other conversations are unaffected.

2. **Group = N pairwise sessions + shared content key** — A group generates one ephemeral content-encryption key (CEK). The CEK is Kyber-encapsulated individually to each member. Removing a member = re-key with remaining members only.

3. **Content-addressed message DAG** — Each message is a node in a directed acyclic graph (like Any-Sync's CRDT approach). Each message references its parent(s) by canonical hash, enabling offline reconciliation and cryptographic ordering verification.

4. **TSP envelopes for every message** — Every message is wrapped in a TSP envelope (`sealEnvelope`), giving it a content-addressed identity, replay protection via nonce, and sender/receiver VID binding.

5. **Revocable session tokens** — Sessions are stored in a `conduit_sessions` table with `revoked_at` and `expires_at` fields. Revoking is instant — just set `revoked_at`. The symmetric key is derived client-side and never stored on the server.

### Database Schema

**Table: `conduit_sessions`** — Per-conversation security tokens
- `id` (uuid PK)
- `session_hash` (text, unique) — UOR canonical hash of the session handshake
- `creator_id` (uuid, references auth.users)
- `session_type` ('direct' | 'group')
- `participants` (uuid[]) — all member user IDs
- `created_at` (timestamptz)
- `expires_at` (timestamptz, nullable) — optional TTL
- `revoked_at` (timestamptz, nullable) — set to revoke
- `metadata_cid` (text) — CID of session metadata (encrypted)
- RLS: participants can read their own sessions

**Table: `encrypted_messages`** — Encrypted message store
- `id` (uuid PK)
- `session_id` (uuid, references conduit_sessions)
- `sender_id` (uuid, references auth.users)
- `parent_hashes` (text[]) — DAG references to parent message(s)
- `message_hash` (text, unique) — UOR canonical hash of the sealed envelope
- `ciphertext` (text) — AES-256-GCM encrypted payload (base64)
- `envelope_cid` (text) — TSP envelope content ID
- `created_at` (timestamptz)
- RLS: only session participants can insert/read
- Realtime enabled for live message delivery

**Table: `group_rekeys`** — Group re-keying events
- `id` (uuid PK)
- `session_id` (uuid, references conduit_sessions)
- `new_session_id` (uuid, references conduit_sessions)
- `reason` ('member_removed' | 'member_added' | 'scheduled' | 'manual')
- `created_at` (timestamptz)

### Protocol Module: `src/modules/uns/trust/messaging.ts`

Core functions composing existing primitives:

| Function | What It Does |
|---|---|
| `createDirectSession(myKeypair, peerVid)` | Kyber-1024 handshake → unique AES key → session hash → store in DB |
| `createGroupSession(myKeypair, memberVids[])` | Generate CEK, Kyber-encapsulate to each member, store session |
| `sealMessage(session, plaintext)` | Encrypt with session AES key → wrap in TSP envelope → compute message hash → return DAG node |
| `openMessage(session, ciphertext)` | Verify TSP envelope → decrypt → verify DAG parent chain |
| `revokeSession(sessionId)` | Set `revoked_at` → destroy local key material |
| `rekeyGroup(sessionId, newMembers)` | Create new session → Kyber-encapsulate new CEK → link via group_rekeys |
| `verifyMessageChain(messages[])` | Walk DAG, verify each parent hash matches content → detect tampering |

Each function uses existing primitives:
- `singleProofHash()` for all content addressing
- `sealEnvelope()` / `verifyEnvelope()` for TSP framing
- `kyberKeygen()` / `kyberEncapsulate()` / `kyberDecapsulate()` for key exchange
- `aesGcmEncrypt()` / `aesGcmDecrypt()` for symmetric encryption
- `signRecord()` / `verifyRecord()` for Dilithium-3 authentication

### UI Integration

Update the messenger to use real encrypted sessions:

| File | Change |
|---|---|
| `src/modules/messenger/lib/messaging-protocol.ts` | New — thin wrapper calling `uns/trust/messaging.ts`, manages local key cache |
| `src/modules/messenger/lib/mock-data.ts` | Keep for fallback; real data from `encrypted_messages` table |
| `src/modules/messenger/components/ConversationView.tsx` | Use protocol for send/receive; show encryption badge per session |
| `src/modules/messenger/components/ChatSidebar.tsx` | Show session status (active/expired/revoked) per chat |
| `src/modules/messenger/components/SessionBadge.tsx` | New — visual indicator showing session hash, expiry countdown, revoke button |

### Security Properties

- **Post-quantum**: Kyber-1024 KEM + Dilithium-3 signatures (NIST PQC standards)
- **Forward secrecy**: Each conversation has an independent ephemeral key; compromising one reveals nothing about others
- **Zero server knowledge**: AES keys are derived client-side from Kyber shared secrets; the server stores only ciphertext
- **Tamper evidence**: Message DAG with canonical hashes — any modification breaks the chain
- **Instant revocation**: Set `revoked_at` on the session; clients check before decrypting
- **Replay protection**: TSP envelope nonces + monotonic DAG ordering

### Implementation Order

1. Database migration (3 tables + RLS)
2. `src/modules/uns/trust/messaging.ts` (protocol core)
3. `src/modules/messenger/lib/messaging-protocol.ts` (UI adapter)
4. Update messenger components (ConversationView, ChatSidebar, new SessionBadge)
5. Enable realtime on `encrypted_messages` for live delivery

