/**
 * UOR Type System — type: namespace implementation.
 *
 * Four type classes from spec/src/namespaces/type_.rs:
 *   - PrimitiveType: single ring element (U8, U16, U32)
 *   - ProductType:   tuple (AND composition)
 *   - SumType:       tagged union (OR composition)
 *   - ConstrainedType: base type + ring predicate
 *
 * Type checking verifies structural conformance of values
 * against the Z/(2^n)Z ring hierarchy.
 *
 * @see spec/src/namespaces/type_.rs
 * @see GET /user/type/primitives
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type UorTypeClass =
  | "PrimitiveType"
  | "ProductType"
  | "SumType"
  | "ConstrainedType";

export type QuantumLevel = "Q0" | "Q1" | "Q2" | "Q3";

export interface UorType {
  "@type": UorTypeClass;
  "type:bitWidth": number;
  "type:quantum": QuantumLevel;
  "type:ring": string;
  "type:canonicalId": string;
  /** For ConstrainedType: the predicate function */
  _predicate?: (x: bigint) => boolean;
  /** For ProductType / SumType: constituent types */
  _members?: UorType[];
}

export interface TypeCheckResult {
  valid: boolean;
  reason?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function ringName(bitWidth: number): string {
  return `Z/${BigInt(1) << BigInt(bitWidth)}Z`;
}

function quantumFromBits(bits: number): QuantumLevel {
  const q = Math.floor(bits / 8) - 1;
  return `Q${Math.max(0, q)}` as QuantumLevel;
}

function canonicalTypeId(cls: UorTypeClass, bits: number, extra?: string): string {
  const base = `urn:uor:type:${cls.toLowerCase()}:${bits}`;
  return extra ? `${base}:${extra}` : base;
}

// ── Primitive Types ─────────────────────────────────────────────────────────

export const U8: UorType = {
  "@type": "PrimitiveType",
  "type:bitWidth": 8,
  "type:quantum": "Q0",
  "type:ring": "Z/256Z",
  "type:canonicalId": "urn:uor:type:primitivetype:8",
};

export const U16: UorType = {
  "@type": "PrimitiveType",
  "type:bitWidth": 16,
  "type:quantum": "Q1",
  "type:ring": "Z/65536Z",
  "type:canonicalId": "urn:uor:type:primitivetype:16",
};

export const U32: UorType = {
  "@type": "PrimitiveType",
  "type:bitWidth": 32,
  "type:quantum": "Q2",
  "type:ring": "Z/4294967296Z",
  "type:canonicalId": "urn:uor:type:primitivetype:32",
};

// ── Composite Type Constructors ─────────────────────────────────────────────

/**
 * ProductType: AND composition (tuple of types).
 * Total bit width = sum of member bit widths.
 */
export function ProductType(...types: UorType[]): UorType {
  const totalBits = types.reduce((s, t) => s + t["type:bitWidth"], 0);
  return {
    "@type": "ProductType",
    "type:bitWidth": totalBits,
    "type:quantum": quantumFromBits(totalBits),
    "type:ring": ringName(totalBits),
    "type:canonicalId": canonicalTypeId(
      "ProductType",
      totalBits,
      types.map((t) => t["type:canonicalId"]).join("+")
    ),
    _members: types,
  };
}

/**
 * SumType: OR composition (tagged union).
 * Bit width = max of member bit widths.
 */
export function SumType(...types: UorType[]): UorType {
  const maxBits = Math.max(...types.map((t) => t["type:bitWidth"]));
  return {
    "@type": "SumType",
    "type:bitWidth": maxBits,
    "type:quantum": quantumFromBits(maxBits),
    "type:ring": ringName(maxBits),
    "type:canonicalId": canonicalTypeId(
      "SumType",
      maxBits,
      types.map((t) => t["type:canonicalId"]).join("|")
    ),
    _members: types,
  };
}

/**
 * ConstrainedType: base type + predicate that must hold.
 */
export function ConstrainedType(
  base: UorType,
  predicate: (x: bigint) => boolean
): UorType {
  return {
    "@type": "ConstrainedType",
    "type:bitWidth": base["type:bitWidth"],
    "type:quantum": base["type:quantum"],
    "type:ring": base["type:ring"],
    "type:canonicalId": canonicalTypeId(
      "ConstrainedType",
      base["type:bitWidth"],
      "predicate"
    ),
    _predicate: predicate,
  };
}

// ── Type Checking ───────────────────────────────────────────────────────────

/**
 * Check whether a value conforms to a UOR type.
 *
 * - PrimitiveType: value must be in [0, 2^bitWidth)
 * - ConstrainedType: value must be in range AND satisfy predicate
 * - ProductType / SumType: value must be in range of composite bit width
 */
export function typeCheck(value: bigint, type: UorType): TypeCheckResult {
  const max = BigInt(1) << BigInt(type["type:bitWidth"]);

  // Range check: value must be in [0, 2^bitWidth)
  if (value < 0n || value >= max) {
    return {
      valid: false,
      reason: `Value ${value} outside range [0, ${max}) for ${type["type:ring"]}`,
    };
  }

  // ConstrainedType: also check predicate
  if (type["@type"] === "ConstrainedType" && type._predicate) {
    if (!type._predicate(value)) {
      return {
        valid: false,
        reason: `Value ${value} fails predicate constraint on ${type["type:ring"]}`,
      };
    }
  }

  return { valid: true };
}
