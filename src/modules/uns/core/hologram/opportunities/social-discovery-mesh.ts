/**
 * Opportunity 4: SOCIAL DISCOVERY MESH
 * ═════════════════════════════════════
 *
 * Every UOR object is automatically discoverable via ActivityPub,
 * AT Protocol, WebFinger, Solid, OIDC, and DNS-SD — the social web
 * becomes a resolution layer for content-addressed objects.
 *
 * @module uns/core/hologram/opportunities/social-discovery-mesh
 */

import { project, PROJECTIONS } from "../index";
import type { ProjectionInput } from "../index";

/** A single discovery endpoint in the mesh. */
export interface DiscoveryEndpoint {
  readonly protocol: string;
  readonly projection: string;
  readonly endpoint: string;
  readonly discoveryMethod: string;
  /** How a resolver finds this object via this protocol. */
  readonly resolutionPath: string;
}

/** The complete social discovery mesh for one identity. */
export interface SocialDiscoveryMesh {
  readonly "@type": "opportunity:SocialDiscoveryMesh";
  readonly threadHash: string;
  readonly did: string;
  readonly endpoints: readonly DiscoveryEndpoint[];
  readonly endpointCount: number;
  /** Protocols covered by this mesh. */
  readonly protocols: readonly string[];
  /** Whether the mesh covers all major social/discovery protocols. */
  readonly fullCoverage: boolean;
}

/** Discovery protocol definitions. */
const DISCOVERY_PROTOCOLS: ReadonlyArray<{
  protocol: string;
  projection: string;
  discoveryMethod: string;
  resolutionPath: string;
}> = [
  {
    protocol: "ActivityPub",
    projection: "activitypub",
    discoveryMethod: "HTTP GET on ActivityPub object URL",
    resolutionPath: "Federated servers relay the object — any Mastodon/Pleroma instance can resolve",
  },
  {
    protocol: "AT Protocol (Bluesky)",
    projection: "atproto",
    discoveryMethod: "at:// URI resolved via AT Protocol PDS",
    resolutionPath: "Bluesky PDS resolves at:// URI to record — decentralized social discovery",
  },
  {
    protocol: "WebFinger",
    projection: "webfinger",
    discoveryMethod: "RFC 7033 WebFinger query on acct: URI",
    resolutionPath: "GET /.well-known/webfinger?resource=acct:{id}@uor.foundation → typed links",
  },
  {
    protocol: "Solid WebID",
    projection: "solid",
    discoveryMethod: "HTTP GET on Solid WebID profile URL",
    resolutionPath: "Solid pod resolves WebID → RDF profile with linked data",
  },
  {
    protocol: "OpenID Connect",
    projection: "oidc",
    discoveryMethod: "OIDC subject identifier in ID token",
    resolutionPath: "OIDC provider resolves subject → identity claims with UOR hash",
  },
  {
    protocol: "DNS-SD",
    projection: "dnssd",
    discoveryMethod: "mDNS/DNS-SD service discovery on local network",
    resolutionPath: "Bonjour/Avahi discovers _uor-{hash}._tcp.local → local service resolution",
  },
  {
    protocol: "Open Badges 3.0",
    projection: "openbadges",
    discoveryMethod: "Open Badges VC endpoint resolution",
    resolutionPath: "Badge issuer resolves UUID → verifiable credential with achievement claims",
  },
  {
    protocol: "STAC Catalog",
    projection: "stac",
    discoveryMethod: "STAC API item endpoint",
    resolutionPath: "Geospatial catalog resolves item URL → spatiotemporal asset with UOR identity",
  },
  {
    protocol: "GS1 Digital Link",
    projection: "gs1",
    discoveryMethod: "GS1 Digital Link resolver (GIAI)",
    resolutionPath: "GS1 resolver redirects to product/asset information page",
  },
  {
    protocol: "Croissant ML Dataset",
    projection: "croissant",
    discoveryMethod: "Croissant metadata endpoint",
    resolutionPath: "ML dataset catalog resolves URL → structured dataset metadata",
  },
];

/**
 * Build the social discovery mesh for a single identity.
 *
 * Every endpoint resolves the same hash through a different
 * social/discovery protocol — the mesh IS the proof that one
 * identity is universally discoverable.
 */
export function buildSocialDiscoveryMesh(input: ProjectionInput): SocialDiscoveryMesh {
  const did = project(input, "did").value;
  const endpoints: DiscoveryEndpoint[] = [];

  for (const config of DISCOVERY_PROTOCOLS) {
    if (!PROJECTIONS.has(config.projection)) continue;

    const resolved = project(input, config.projection);
    endpoints.push({
      protocol: config.protocol,
      projection: config.projection,
      endpoint: resolved.value,
      discoveryMethod: config.discoveryMethod,
      resolutionPath: config.resolutionPath,
    });
  }

  const protocols = endpoints.map(e => e.protocol);
  const majorProtocols = ["ActivityPub", "AT Protocol (Bluesky)", "WebFinger", "DNS-SD"];
  const fullCoverage = majorProtocols.every(p => protocols.includes(p));

  return {
    "@type": "opportunity:SocialDiscoveryMesh",
    threadHash: input.hex,
    did,
    endpoints,
    endpointCount: endpoints.length,
    protocols,
    fullCoverage,
  };
}
