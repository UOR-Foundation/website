/**
 * Atlas Module — Public API
 *
 * The Atlas of Resonance Classes and its categorical unfolding into
 * the five exceptional Lie groups: G₂ ⊂ F₄ ⊂ E₆ ⊂ E₇ ⊂ E₈.
 */

// Atlas construction
export { Atlas, getAtlas, ATLAS_VERTEX_COUNT, ATLAS_EDGE_COUNT_EXPECTED } from "./atlas";
export type { AtlasLabel, AtlasVertex } from "./atlas";

// R₈ ↔ Atlas bridge
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

// Cartan matrices and Dynkin diagrams
export {
  cartanMatrix, isValidCartan, isSimplyLaced, isSymmetricCartan,
  cartanDeterminant, toDynkinDiagram,
  CARTAN_G2, CARTAN_F4, CARTAN_E6, CARTAN_E7, CARTAN_E8,
} from "./cartan";
export type { CartanMatrix, DynkinDiagram, DynkinBond } from "./cartan";

// Exceptional group constructions
export {
  constructG2, constructF4, constructE6, constructE7, constructE8,
  constructExceptionalChain, analyzeE8RootStructure,
} from "./groups";
export type { ExceptionalGroup, ExceptionalGroupChain, E8RootAnalysis } from "./groups";

// Boundary investigation: 256 − 240 = 16 = Ext(2) + Unit(2) + G₂(12)
export {
  identifyBoundaryElements,
  verifyG2Correspondence,
  runBoundaryInvestigation,
} from "./boundary";
export type {
  BoundaryElement,
  BoundaryDecomposition,
  G2BoundaryCorrespondence,
  G2StructuralTest,
  BoundaryReport,
} from "./boundary";
