/**
 * UNS Mesh — BGP Content Orbit Routing & Node Orchestrator (Phase 4-C)
 */

export {
  canonicalIdToOrbitPrefix,
  canonicalIdToBgpCommunity,
  bgpCommunityToOrbitPrefix,
  buildRouteAnnouncements,
  ANYCAST_RESOLVER,
  ANYCAST_DOH,
  ANYCAST_DHT_BOOTSTRAP,
} from "./bgp";

export type { OrbitRouteAnnouncement } from "./bgp";

export { UnsNode } from "./node";
export type { UnsNodeConfig, ServiceStatus, HealthResponse } from "./node";
