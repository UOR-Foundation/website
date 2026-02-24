/**
 * WebFinger Discovery Endpoint (RFC 7033)
 * ════════════════════════════════════════
 *
 * Resolves `acct:{hex16}@uor.foundation` URIs into a JRD (JSON Resource
 * Descriptor) containing all UOR Hologram projections as typed links.
 *
 * This is the discovery foundation — every federated protocol (ActivityPub,
 * AT Protocol, Solid) uses WebFinger to find endpoints for a given identity.
 *
 * GET /.well-known/webfinger?resource=acct:{hex16}@uor.foundation
 *
 * @see RFC 7033 — https://www.rfc-editor.org/rfc/rfc7033
 * @see UOR Hologram Projection Registry
 */

const DOMAIN = "uor.foundation";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/jrd+json",
};

// ── Projection link templates ───────────────────────────────────────────────
// Each entry: [rel, type, hrefFn(hex)]
// Mirrors the Hologram Registry specs — pure functions, no imports needed.

type LinkSpec = [rel: string, type: string, href: (hex: string) => string];

const LINKS: LinkSpec[] = [
  // W3C DID
  ["self", "application/did+ld+json",
    (h) => `https://${DOMAIN}/.well-known/did.json?id=did:uor:${h}`],
  // ActivityPub
  ["self", "application/activity+json",
    (h) => `https://${DOMAIN}/ap/objects/${h}`],
  // AT Protocol
  ["self", "application/json",
    (h) => `at://did:uor:${h}/app.uor.object`],
  // Solid WebID
  ["http://webid.info/spec/identity", "text/turtle",
    (h) => `https://${DOMAIN}/profile/${h}#me`],
  // OpenID Connect
  ["http://openid.net/specs/connect/1.0/issuer", "application/json",
    (h) => `https://${DOMAIN}/.well-known/openid-configuration`],
  // IPFS CID (via gateway)
  ["describedby", "application/json",
    (h) => `https://w3s.link/ipfs/${h}`],
  // UOR canonical
  ["canonical", "application/ld+json",
    (h) => `urn:uor:derivation:sha256:${h}`],
  // STAC
  ["describedby", "application/geo+json",
    (h) => `https://${DOMAIN}/stac/items/${h}`],
  // Croissant ML
  ["describedby", "application/ld+json",
    (h) => `https://${DOMAIN}/croissant/${h}`],
];

// ── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders },
    );
  }

  const url = new URL(req.url);
  const resource = url.searchParams.get("resource");

  if (!resource) {
    return new Response(
      JSON.stringify({ error: "Missing required 'resource' query parameter" }),
      { status: 400, headers: corsHeaders },
    );
  }

  // Parse acct: URI — expected format: acct:{hex16}@uor.foundation
  const acctMatch = resource.match(
    /^acct:([0-9a-f]{16})@uor\.foundation$/i,
  );

  if (!acctMatch) {
    return new Response(
      JSON.stringify({
        error: "Resource not found. Expected: acct:{hex16}@uor.foundation",
      }),
      { status: 404, headers: corsHeaders },
    );
  }

  const hexPrefix = acctMatch[1].toLowerCase();

  // Look up the full hex from the database (profiles table stores uor_canonical_id)
  // If not found, we still return links using the prefix — WebFinger is discovery, not verification
  const fullHex = hexPrefix; // prefix-only mode for stateless resolution

  // Build JRD response per RFC 7033 §4.4
  const jrd = {
    subject: resource,
    aliases: [
      `urn:uor:derivation:sha256:${fullHex}`,
      `did:uor:${fullHex}`,
    ],
    properties: {
      "https://uor.foundation/spec/hologram": "1.0",
      "https://uor.foundation/spec/fidelity": "lossy",
      "https://uor.foundation/spec/lossWarning":
        "webfinger-uses-64-bit-prefix (resolve via canonical URN for full identity)",
    },
    links: LINKS.map(([rel, type, hrefFn]) => ({
      rel,
      type,
      href: hrefFn(fullHex),
    })),
  };

  return new Response(JSON.stringify(jrd, null, 2), {
    status: 200,
    headers: corsHeaders,
  });
});
