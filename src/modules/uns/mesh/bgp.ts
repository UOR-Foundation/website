/**
 * UNS Mesh — BGP Content Orbit Routing (Phase 4-C)
 *
 * Encodes UOR canonical IDs as BGP Extended Community attributes (RFC 4360)
 * and derives /64 orbit prefixes under fd00:0075:6f72::/48.
 *
 * Type:     0x0002  (Two-Octet AS Specific Extended Community)
 * Sub-Type: 0x55    ('U' in ASCII — UOR private sub-type)
 * Value:    first 4 bytes of SHA-256 canonical hash as uint32 big-endian
 *
 * Full 8-byte community: [0x00][0x02][0x00][0x55][hash[0..3]]
 * Orbit prefix: fd00:0075:6f72:{h0h1}:{h2h3}::/64
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface OrbitRouteAnnouncement {
  prefix: string;         // fd00:0075:6f72:{h0h1}:{h2h3}::/64
  communityValue: string; // hex: 00020055{h0h1h2h3}
  nexthop: string;        // this node's IPv6 address
  canonicalId: string;    // the orbit this route serves
}

// ── Well-Known Anycast Addresses ────────────────────────────────────────────

export const ANYCAST_RESOLVER = "fd00:0075:6f72::0001";
export const ANYCAST_DOH = "fd00:0075:6f72::0053";
export const ANYCAST_DHT_BOOTSTRAP = "fd00:0075:6f72::0044";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract first 4 hash bytes from a canonical ID. */
function extractHashBytes(canonicalId: string): Uint8Array {
  // Format: urn:uor:derivation:sha256:{64 hex chars}
  const hex = canonicalId.replace(/^urn:uor:derivation:sha256:/, "");
  if (hex.length < 8) throw new Error("Invalid canonical ID: hash too short");
  const bytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Derive a /64 orbit prefix from a canonical ID.
 * Format: fd00:0075:6f72:{h0h1}:{h2h3}::/64
 */
export function canonicalIdToOrbitPrefix(canonicalId: string): string {
  const h = extractHashBytes(canonicalId);
  const g4 = ((h[0] << 8) | h[1]).toString(16).padStart(4, "0");
  const g5 = ((h[2] << 8) | h[3]).toString(16).padStart(4, "0");
  return `fd00:0075:6f72:${g4}:${g5}::/64`;
}

/**
 * Encode a canonical ID as an 8-byte BGP Extended Community (RFC 4360).
 * [0x00][0x02][0x00][0x55][hash[0]][hash[1]][hash[2]][hash[3]]
 */
export function canonicalIdToBgpCommunity(canonicalId: string): Uint8Array {
  const h = extractHashBytes(canonicalId);
  const community = new Uint8Array(8);
  community[0] = 0x00; // Type high
  community[1] = 0x02; // Type low — Two-Octet AS Specific
  community[2] = 0x00; // Sub-type high
  community[3] = 0x55; // Sub-type low — 'U'
  community[4] = h[0];
  community[5] = h[1];
  community[6] = h[2];
  community[7] = h[3];
  return community;
}

/**
 * Reverse: BGP community bytes → /64 orbit prefix.
 */
export function bgpCommunityToOrbitPrefix(community: Uint8Array): string {
  if (community.length !== 8) throw new Error("Community must be 8 bytes");
  const g4 = ((community[4] << 8) | community[5]).toString(16).padStart(4, "0");
  const g5 = ((community[6] << 8) | community[7]).toString(16).padStart(4, "0");
  return `fd00:0075:6f72:${g4}:${g5}::/64`;
}

/**
 * Build route announcements for a set of canonical IDs served by this node.
 */
export function buildRouteAnnouncements(
  canonicalIds: string[],
  nodeIpv6: string
): OrbitRouteAnnouncement[] {
  return canonicalIds.map((id) => ({
    prefix: canonicalIdToOrbitPrefix(id),
    communityValue: bytesToHex(canonicalIdToBgpCommunity(id)),
    nexthop: nodeIpv6,
    canonicalId: id,
  }));
}
