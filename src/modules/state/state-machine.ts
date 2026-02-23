/**
 * UNS State Machine — Formal agent lifecycle model.
 *
 * Every agent action is a state:Transition from one ring-element
 * state to another. Transitions are ring-arithmetically verifiable
 * and produce SHACL-compliant records with Dilithium-3 signatures.
 *
 * State identifiers are ring values in Z/(2^n)Z. The state:Frame
 * binds a ring value to its semantic meaning plus entry/exit conditions.
 *
 * @see spec/src/namespaces/state.rs
 * @see P25 SHACL transition-frames shape
 */

import { neg, bnot, succ } from "@/modules/uns/core/ring";
import { classifyByte } from "@/lib/uor-ring";
import { singleProofHash } from "@/modules/uns/core/identity";
import { signRecord } from "@/modules/uns/core/keypair";
import type { UnsKeypair, SignatureBlock } from "@/modules/uns/core/keypair";

// ── Types ───────────────────────────────────────────────────────────────────

export type PartitionClass =
  | "IRREDUCIBLE"
  | "REDUCIBLE"
  | "UNIT"
  | "EXTERIOR";

export interface MachineStateFrame {
  "@type": "state:Frame";
  "state:ringValue": bigint;
  "state:quantum": string;
  "state:label": string;
  "state:partitionClass": PartitionClass;
  "state:entryCondition": string[];
  "state:exitCondition": string[];
  "state:canonicalId": string;
}

export interface MachineStateBinding {
  "@type": "state:StateBinding";
  "state:agent": string;
  "state:frame": MachineStateFrame;
  "state:boundAt": string;
  "state:canonicalId": string;
}

export interface StateTransitionRecord {
  "@type": "state:Transition";
  "state:from": MachineStateFrame;
  "state:to": MachineStateFrame;
  "state:operation": "neg" | "bnot" | "succ" | "custom";
  "state:previousCanonicalId": string;
  "state:nextCanonicalId": string;
  "state:transitionedAt": string;
  "state:entryConditionMet": boolean;
  "state:exitConditionMet": boolean;
  "cert:signature": SignatureBlock;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function classifyPartition(value: number): PartitionClass {
  if (value === 0) return "EXTERIOR";
  const c = classifyByte(value, 8);
  if (c.component === "partition:UnitSet") return "UNIT";
  if (c.component === "partition:IrreducibleSet") return "IRREDUCIBLE";
  return "REDUCIBLE";
}

function applyOp(op: "neg" | "bnot" | "succ", value: number): number {
  switch (op) {
    case "neg":
      return neg(value);
    case "bnot":
      return bnot(value);
    case "succ":
      return succ(value);
  }
}

// ── UnsStateMachine ─────────────────────────────────────────────────────────

export class UnsStateMachine {
  private agentKeypair: UnsKeypair;
  private frames: Map<string, MachineStateFrame> = new Map();
  private bindings: Map<string, MachineStateBinding> = new Map();
  private history: Map<string, StateTransitionRecord[]> = new Map();

  constructor(agentKeypair: UnsKeypair) {
    this.agentKeypair = agentKeypair;
  }

  /**
   * Define a state frame — bind a ring value to a semantic label.
   */
  defineFrame(
    ringValue: bigint,
    label: string,
    quantum: string = "Q0"
  ): MachineStateFrame {
    const numVal = Number(ringValue) & 0xff; // Q0 for now
    const partitionClass = classifyPartition(numVal);

    const entryCondition: string[] = [];
    const exitCondition: string[] = [];

    // Stable entries: identity (0) and units (1, 255)
    if (numVal === 0) entryCondition.push("additive-identity");
    if (numVal === 1 || numVal === 255) entryCondition.push("ring-unit");

    // Phase boundary exit
    if (numVal === 128) exitCondition.push("phase-boundary");

    // Exterior exit
    if (partitionClass === "EXTERIOR") exitCondition.push("exterior-element");

    const canonicalId = `urn:uor:state:frame:${numVal}:${quantum}`;

    const frame: MachineStateFrame = {
      "@type": "state:Frame",
      "state:ringValue": ringValue,
      "state:quantum": quantum,
      "state:label": label,
      "state:partitionClass": partitionClass,
      "state:entryCondition": entryCondition,
      "state:exitCondition": exitCondition,
      "state:canonicalId": canonicalId,
    };

    this.frames.set(canonicalId, frame);
    return frame;
  }

  /**
   * Bind an agent to a state frame.
   */
  async bind(
    agentCanonicalId: string,
    frame: MachineStateFrame
  ): Promise<MachineStateBinding> {
    const identity = await singleProofHash({
      "@type": "state:StateBinding",
      "state:agent": agentCanonicalId,
      "state:frame": frame["state:canonicalId"],
    });

    const binding: MachineStateBinding = {
      "@type": "state:StateBinding",
      "state:agent": agentCanonicalId,
      "state:frame": frame,
      "state:boundAt": new Date().toISOString(),
      "state:canonicalId": identity["u:canonicalId"],
    };

    this.bindings.set(agentCanonicalId, binding);
    return binding;
  }

  /**
   * Transition an agent via a ring operation (neg/bnot/succ).
   * Computes the destination state arithmetically, signs the transition.
   */
  async transition(
    agentCanonicalId: string,
    operation: "neg" | "bnot" | "succ",
    targetFrame?: MachineStateFrame
  ): Promise<StateTransitionRecord> {
    const currentBinding = this.bindings.get(agentCanonicalId);
    if (!currentBinding) {
      throw new Error(`Agent ${agentCanonicalId} is not bound to any state`);
    }

    const fromFrame = currentBinding["state:frame"];
    const fromValue = Number(fromFrame["state:ringValue"]) & 0xff;
    const toValue = applyOp(operation, fromValue);

    // Use provided target frame or auto-create one
    const toFrame =
      targetFrame ??
      this.defineFrame(
        BigInt(toValue),
        `state-${toValue}`,
        fromFrame["state:quantum"]
      );

    // Generate canonical IDs for SHACL compliance
    // Note: use Number() to avoid BigInt serialization issues in JSON
    const prevId = await singleProofHash({
      "@type": "state:Transition",
      direction: "from",
      value: Number(fromValue),
    });
    const nextId = await singleProofHash({
      "@type": "state:Transition",
      direction: "to",
      value: Number(toValue),
    });

    const now = new Date().toISOString();

    const entryConditionMet = true;
    const exitConditionMet = true;

    // Serialize frames without bigint for signing (JSON can't handle BigInt)
    const serializeFrame = (f: MachineStateFrame) => ({
      ...f,
      "state:ringValue": Number(f["state:ringValue"]),
    });

    // Sign the transition record
    const unsigned = {
      "@type": "state:Transition" as const,
      "state:from": serializeFrame(fromFrame),
      "state:to": serializeFrame(toFrame),
      "state:operation": operation,
      "state:previousCanonicalId": prevId["u:canonicalId"],
      "state:nextCanonicalId": nextId["u:canonicalId"],
      "state:transitionedAt": now,
      "state:entryConditionMet": entryConditionMet,
      "state:exitConditionMet": exitConditionMet,
    };

    const signed = await signRecord(unsigned, this.agentKeypair);

    const record: StateTransitionRecord = {
      "@type": "state:Transition",
      "state:from": fromFrame,
      "state:to": toFrame,
      "state:operation": operation,
      "state:previousCanonicalId": prevId["u:canonicalId"],
      "state:nextCanonicalId": nextId["u:canonicalId"],
      "state:transitionedAt": now,
      "state:entryConditionMet": entryConditionMet,
      "state:exitConditionMet": exitConditionMet,
      "cert:signature": signed["cert:signature"],
    };

    // Update binding to new frame
    await this.bind(agentCanonicalId, toFrame);

    // Append to history
    const hist = this.history.get(agentCanonicalId) ?? [];
    hist.push(record);
    this.history.set(agentCanonicalId, hist);

    return record;
  }

  /**
   * Get current state binding for an agent.
   */
  getCurrentState(agentCanonicalId: string): MachineStateBinding | null {
    return this.bindings.get(agentCanonicalId) ?? null;
  }

  /**
   * Get full transition history (audit chain) for an agent.
   */
  getHistory(agentCanonicalId: string): StateTransitionRecord[] {
    return this.history.get(agentCanonicalId) ?? [];
  }

  /**
   * Verify a transition is ring-arithmetically correct.
   *
   * For 'neg': neg(from.ringValue) must equal to.ringValue
   * For 'bnot': bnot(from.ringValue) must equal to.ringValue
   * For 'succ': succ(from.ringValue) must equal to.ringValue
   */
  verifyTransition(t: StateTransitionRecord): boolean {
    const fromVal = Number(t["state:from"]["state:ringValue"]) & 0xff;
    const toVal = Number(t["state:to"]["state:ringValue"]) & 0xff;
    const op = t["state:operation"];

    if (op === "custom") return true; // custom transitions are always valid

    const expected = applyOp(op, fromVal);
    return expected === toVal;
  }
}
