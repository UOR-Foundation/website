/**
 * UOR Canonicalization rules — serializable data for UOR certification.
 * Eight rules that normalize any expression into its simplest, deterministic form.
 */

export interface CanonicalizationRule {
  number: number;
  name: string;
  plain: string;
  before: string;
  after: string;
}

export const canonicalizationRules: CanonicalizationRule[] = [
  {
    number: 1,
    name: "Double reversal",
    plain: "Undoing something twice gives you back the original.",
    before: "reverse(reverse(x))",
    after: "x",
  },
  {
    number: 2,
    name: "Shorthand expansion",
    plain: "Replace shortcuts with the actual steps they represent.",
    before: "next(x)",
    after: "reverse(flip(x))",
  },
  {
    number: 3,
    name: "Overflow handling",
    plain: "Numbers that go past the maximum wrap back around to zero.",
    before: "300 (in an 8-bit system)",
    after: "44",
  },
  {
    number: 4,
    name: "Alphabetical ordering",
    plain: "When the order does not matter, sort the parts alphabetically for consistency.",
    before: "combine(C, A, B)",
    after: "combine(A, B, C)",
  },
  {
    number: 5,
    name: "Remove do-nothings",
    plain: "Adding zero or combining with a neutral value has no effect. Remove it.",
    before: "combine(x, 0)",
    after: "x",
  },
  {
    number: 6,
    name: "Absorbers",
    plain: "Some values override everything else. The result is just that value.",
    before: "filter(x, nothing)",
    after: "nothing",
  },
  {
    number: 7,
    name: "Self-cancellation",
    plain: "Combining something with itself cancels out to zero.",
    before: "combine(x, x)",
    after: "0",
  },
  {
    number: 8,
    name: "Repetition removal",
    plain: "Filtering or merging a thing with itself just gives the thing back.",
    before: "filter(x, x)",
    after: "x",
  },
];
