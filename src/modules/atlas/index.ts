/**
 * Atlas Module — Public API
 *
 * Re-exports the Atlas construction and R₈ bridge verification.
 */

export { Atlas, getAtlas, ATLAS_VERTEX_COUNT, ATLAS_EDGE_COUNT_EXPECTED } from "./atlas";
export type { AtlasLabel, AtlasVertex } from "./atlas";

export {
  computeR8Partition,
  runBridgeVerification,
  verifyFiberDecomposition,
  verifyUnityExteriorCorrespondence,
  verifyInvolutionCorrespondence,
  verifyIrreducibleE7Correspondence,
  verifyEdgeElementCorrespondence,
  verifySignClassStructure,
  verifyDegreeDistribution,
  verifyCriticalIdentityAtlasLink,
  exceptionalGroupChain,
} from "./bridge";
export type {
  R8Partition,
  CorrespondenceResult,
  ExceptionalGroupCorrespondence,
  BridgeVerificationReport,
} from "./bridge";
