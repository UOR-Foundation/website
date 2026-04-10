/**
 * UOR Foundation v2.0.0. enforcement::builders
 *
 * 9 declarative builder structs for enforcement objects.
 *
 * @see foundation/src/enforcement/mod.rs
 */

/** DatumBuilder. builds an EnforcementDatum step by step. */
export interface DatumBuilder {
  setValue(value: number): DatumBuilder;
  setQuantum(quantum: number): DatumBuilder;
  setDerivationId(id: string): DatumBuilder;
  build(): unknown;
}

/** DerivationBuilder. builds an EnforcementDerivation. */
export interface DerivationBuilder {
  addInput(term: string): DerivationBuilder;
  setOutput(term: string): DerivationBuilder;
  addRule(rule: string): DerivationBuilder;
  build(): unknown;
}

/** FiberBudgetBuilder. builds an EnforcementFiberBudget. */
export interface FiberBudgetBuilder {
  setTotal(total: number): FiberBudgetBuilder;
  pin(index: number, constraintId: string): FiberBudgetBuilder;
  build(): unknown;
}

/** TermBuilder. builds a Term AST node. */
export interface TermBuilder {
  setKind(kind: string): TermBuilder;
  addChild(child: unknown): TermBuilder;
  setValue(value: number): TermBuilder;
  build(): unknown;
}

/** AssertionBuilder. builds an Assertion. */
export interface AssertionBuilder {
  setPredicate(predicate: string): AssertionBuilder;
  setExpected(value: boolean): AssertionBuilder;
  build(): unknown;
}

/** BindingBuilder. builds a Binding for the enforcement context. */
export interface BindingBuilder {
  setName(name: string): BindingBuilder;
  setAddress(address: string): BindingBuilder;
  setType(bindingType: string): BindingBuilder;
  build(): unknown;
}

/** SourceDeclBuilder. builds a SourceDeclaration. */
export interface SourceDeclBuilder {
  setSourceId(id: string): SourceDeclBuilder;
  setMediaType(mediaType: string): SourceDeclBuilder;
  build(): unknown;
}

/** SinkDeclBuilder. builds a SinkDeclaration. */
export interface SinkDeclBuilder {
  setSinkId(id: string): SinkDeclBuilder;
  setMediaType(mediaType: string): SinkDeclBuilder;
  build(): unknown;
}

/** BoundarySessionBuilder. builds a BoundarySession. */
export interface BoundarySessionBuilder {
  setSessionId(id: string): BoundarySessionBuilder;
  addSource(sourceId: string): BoundarySessionBuilder;
  addSink(sinkId: string): BoundarySessionBuilder;
  build(): unknown;
}
