/**
 * identity module barrel export (merged from identity + uor-identity).
 */

export {
  bytesToCodepoint,
  bytesToGlyph,
  bytesToIRI,
  bytesToUPlus,
  iriToBytes,
  contentAddress,
  verifyDeterminism,
  verifyRoundTrip,
  datumApiUrl,
} from "./addressing";

export { default as ProjectUorIdentity } from "./pages/ProjectUorIdentity";
