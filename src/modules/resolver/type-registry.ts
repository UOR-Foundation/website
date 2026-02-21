/**
 * UOR Type Registry — type: namespace PrimitiveType mappings.
 *
 * Maps natural language type names to formal type:PrimitiveType objects
 * with bitWidth and ring quantum. Used in Stage 2 (Type Extraction) of
 * the 8-stage agent resolution cycle.
 *
 * Zero duplication — ring quantum levels are referenced, not redefined.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface PrimitiveType {
  "@type": "type:PrimitiveType";
  typeIri: string;
  label: string;
  bitWidth: number;
  quantum: number;
  aliases: string[];
}

// ── Registry ────────────────────────────────────────────────────────────────

const PRIMITIVE_TYPES: PrimitiveType[] = [
  {
    "@type": "type:PrimitiveType",
    typeIri: "urn:uor:type:uint8",
    label: "uint8",
    bitWidth: 8,
    quantum: 0,
    aliases: ["byte", "u8", "uint8", "unsigned byte", "octet", "integer"],
  },
  {
    "@type": "type:PrimitiveType",
    typeIri: "urn:uor:type:uint16",
    label: "uint16",
    bitWidth: 16,
    quantum: 1,
    aliases: ["u16", "uint16", "short", "unsigned short", "word", "character", "char"],
  },
  {
    "@type": "type:PrimitiveType",
    typeIri: "urn:uor:type:bool",
    label: "bool",
    bitWidth: 1,
    quantum: 0,
    aliases: ["boolean", "bit", "flag", "true/false"],
  },
  {
    "@type": "type:PrimitiveType",
    typeIri: "urn:uor:type:nibble",
    label: "nibble",
    bitWidth: 4,
    quantum: 0,
    aliases: ["nibble", "half-byte", "hex digit"],
  },
  // ── Q1 additional ──────────────────────────────────────────────────
  {
    "@type": "type:PrimitiveType",
    typeIri: "urn:uor:type:string",
    label: "string",
    bitWidth: 16,
    quantum: 1,
    aliases: ["string", "text", "str", "varchar"],
  },
  // ── Q2 types (32-bit) ─────────────────────────────────────────────
  {
    "@type": "type:PrimitiveType",
    typeIri: "urn:uor:type:uint32",
    label: "uint32",
    bitWidth: 32,
    quantum: 2,
    aliases: ["u32", "uint32", "int", "int32", "dword", "unsigned int"],
  },
  {
    "@type": "type:PrimitiveType",
    typeIri: "urn:uor:type:float32",
    label: "float32",
    bitWidth: 32,
    quantum: 2,
    aliases: ["float", "float32", "f32", "single", "real"],
  },
  // ── Q3 types (64-bit) ─────────────────────────────────────────────
  {
    "@type": "type:PrimitiveType",
    typeIri: "urn:uor:type:uint64",
    label: "uint64",
    bitWidth: 64,
    quantum: 3,
    aliases: ["u64", "uint64", "long", "int64", "qword", "bigint"],
  },
];

// ── Lookup functions ────────────────────────────────────────────────────────

/**
 * Extract a PrimitiveType from a natural language string.
 * Returns null if no match found.
 */
export function extractType(input: string): PrimitiveType | null {
  const normalized = input.toLowerCase().trim();

  for (const pt of PRIMITIVE_TYPES) {
    if (normalized === pt.label) return pt;
    if (pt.aliases.some((a) => normalized.includes(a))) return pt;
  }

  return null;
}

/**
 * Get all registered primitive types.
 */
export function getAllTypes(): PrimitiveType[] {
  return [...PRIMITIVE_TYPES];
}

/**
 * Get the type for a specific quantum level.
 */
export function typeForQuantum(quantum: number): PrimitiveType | null {
  return PRIMITIVE_TYPES.find((pt) => pt.quantum === quantum) ?? null;
}
