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

// Morphism map: 12 projection domains → 5 categorical operations
export {
  classifyDomains,
  operationDistribution,
  runMorphismMapVerification,
} from "./morphism-map";
export type {
  CategoricalOperation,
  AtlasMorphismClassification,
  MorphismMapReport,
  MorphismMapTest,
} from "./morphism-map";

// Observer Bridge: zone-driven morphism selection (Phase 4)
export {
  selectMorphism,
  computeTranslation,
  runObserverBridgeVerification,
} from "./observer-bridge";
export type {
  ObserverZone,
  ObserverState,
  MorphismSelection,
  TranslationRequest,
  TranslationResult,
  ObserverBridgeReport,
} from "./observer-bridge";

// Convergence Test: LLM → Atlas substrate mapping (Phase 5)
export {
  MODEL_CATALOG,
  decomposeModel,
  verifyUniversalInvariants,
  runConvergenceTest,
} from "./convergence";
export type {
  ModelArchitecture,
  AtlasDecomposition,
  UniversalInvariant,
  ConvergenceReport,
} from "./convergence";

// Universal Model Fingerprint — Atlas nutritional label for LLMs
export {
  fingerprint,
  fingerprintAll,
  generateFingerprintReport,
} from "./fingerprint";
export type {
  ModelFingerprint,
  OperationProfile,
  StructuralSignature,
  FingerprintReport,
  FamilyProfile,
} from "./fingerprint";

// Cross-Model Translation — Atlas R₈ universal translation layer (Phase 6)
export {
  createTestEmbedding,
  decomposeToAtlas,
  reconstructFromAtlas,
  computeFidelity,
  translate,
  translatePair,
  runCrossModelTranslation,
} from "./translation";
export type {
  EmbeddingVector,
  AtlasCoordinate,
  TranslationResult as CrossModelTranslationResult,
  TranslationFidelity,
  TranslationPairReport,
  CrossModelTranslationReport,
  TranslationInvariant,
} from "./translation";

// F₄ Quotient Compression — τ-mirror symmetry analysis (Phase 7)
export {
  analyzeCompression,
  runCompressionAnalysis,
} from "./compression";
export type {
  WeightBlock,
  MirrorPattern,
  MirrorPairAnalysis,
  CompressionProfile,
  CompressionReport,
  CompressionInvariant,
} from "./compression";

// Quantum ISA — Atlas → Quantum gate mapping (Phase 10)
export {
  mapVerticesToGates,
  tierDistribution as quantumTierDistribution,
  buildMeshNetwork,
  runQuantumISAVerification,
} from "./quantum-isa";
export type {
  GateTier,
  GateFamily,
  QuantumGate,
  VertexGateMapping,
  MeshNode,
  EntanglementLink,
  QuantumISAReport,
  QuantumISATest,
} from "./quantum-isa";

// Topological Qubit — geometric α derivation & qubit instantiation (Phase 11)
export {
  constructManifold22,
  deriveAlpha,
  computeTriclinicSlant,
  instantiateQubits,
  computeBraids,
  runTopologicalQubitAnalysis,
} from "./topological-qubit";
export type {
  ManifoldNode,
  Manifold22,
  ManifoldLink,
  AlphaDerivation,
  TriclinicSlant,
  TopologicalQubitState,
  BraidOperation,
  TopologicalQubitReport,
  TopologicalQubitTest,
} from "./topological-qubit";

// Coadjoint Orbit Classifier — Neeb integrability for E₈ (Phase 21)
export {
  generateOrbitCatalog,
  testIntegrability,
  runOrbitClassification,
} from "./coadjoint-orbit-classifier";
export type {
  OrbitType,
  IntegrabilityStatus,
  CoadjointOrbit,
  IntegrabilityResult,
  ClassificationReport,
  ClassificationInvariant,
} from "./coadjoint-orbit-classifier";
