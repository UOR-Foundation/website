/**
 * UOR Signature operations — serializable data for UOR certification.
 * The five primitive operations that form the complete alphabet of the system.
 */

export interface SignatureOp {
  name: string;
  label: string;
  arity: string;
  properties: string[];
  plain: string;
}

export const signatureOps: SignatureOp[] = [
  {
    name: "neg",
    label: "Negate",
    arity: "One input",
    properties: ["Reversible"],
    plain: "Flip the sign. Do it twice and you are back where you started.",
  },
  {
    name: "bnot",
    label: "Complement",
    arity: "One input",
    properties: ["Reversible"],
    plain: "Flip every bit. Do it twice and nothing has changed.",
  },
  {
    name: "xor",
    label: "Exclusive Or",
    arity: "Two or more inputs",
    properties: ["Order does not matter", "Grouping does not matter"],
    plain: "Compare two values bit by bit: where they differ, the result is 1.",
  },
  {
    name: "and",
    label: "And",
    arity: "Two or more inputs",
    properties: ["Order does not matter", "Grouping does not matter"],
    plain: "Keep only the bits that are 1 in both inputs.",
  },
  {
    name: "or",
    label: "Or",
    arity: "Two or more inputs",
    properties: ["Order does not matter", "Grouping does not matter"],
    plain: "Keep any bit that is 1 in either input.",
  },
];
