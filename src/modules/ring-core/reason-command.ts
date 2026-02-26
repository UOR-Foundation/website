/**
 * UOR v2.0.0 — Reasoning Command Module for vShell
 *
 * Phase 6: Exposes the geometric reasoning engine through vShell commands.
 *
 * Commands:
 *   reason run [quantum] [obs...]   — Run abductive loop with observations
 *   reason status                   — Show current reasoning state
 *   reason explain [step]           — Explain a reasoning step or cycle
 *   reason certify                  — Certify the current proof
 *   reason strategy <dfs|bfs|spiral|composed> — Select traversal strategy
 *   reason reset                    — Reset reasoning state
 *
 * @module ring-core/reason-command
 */

import type { ShellLine } from "@/modules/uns/core/hologram/vshell";
import {
  createFiberBudget,
  residueConstraint,
  deductiveStep,
  inductiveStep,
  abductiveCurvature,
  createProof,
  addDeductiveStep,
  addInductiveStep,
  addAbductiveStep,
  certifyProof,
  verifyCertificate,
  stepsByMode,
  hasCompleteCycle,
  totalFibersResolved,
  type ReasoningProof,
} from "@/modules/ring-core";
import {
  depthFirstDeductive,
  breadthFirstInductive,
  abductiveSpiral,
  composedScheduler,
  executeSchedule,
  scheduleStepsByMode,
  type ScheduleResult,
  type ScheduleConfig,
} from "@/modules/ring-core/strategy-scheduler";
import type { Panel } from "@/modules/hologram-os/runtime";
import { createPanel } from "@/modules/hologram-os/runtime";

// ── Reasoning Session State ────────────────────────────────────────────────

export interface ReasoningSession {
  proof: ReasoningProof | null;
  lastSchedule: ScheduleResult | null;
  quantum: number;
  strategy: "dfs" | "bfs" | "spiral" | "composed";
  panels: Panel[];
}

export function createReasoningSession(): ReasoningSession {
  return {
    proof: null,
    lastSchedule: null,
    quantum: 0,
    strategy: "composed",
    panels: [],
  };
}

// ── Command Executor ───────────────────────────────────────────────────────

export function execReason(
  args: string[],
  session: ReasoningSession,
): { lines: ShellLine[]; session: ReasoningSession } {
  const lines: ShellLine[] = [];
  const out = (text: string) => lines.push({ kind: "output", text });
  const info = (text: string) => lines.push({ kind: "info", text });
  const err = (text: string) => lines.push({ kind: "error", text });

  const sub = args[0] ?? "status";

  switch (sub) {
    case "run": {
      const result = cmdReasonRun(args.slice(1), session, out, info, err);
      return { lines, session: result };
    }
    case "status":
      cmdReasonStatus(session, out, info);
      return { lines, session };
    case "explain":
      cmdReasonExplain(args.slice(1), session, out, info, err);
      return { lines, session };
    case "certify": {
      const result = cmdReasonCertify(session, out, info, err);
      return { lines, session: result };
    }
    case "strategy": {
      const result = cmdReasonStrategy(args.slice(1), session, out, info, err);
      return { lines, session: result };
    }
    case "reset":
      out("✓ Reasoning state reset.");
      return { lines, session: createReasoningSession() };
    default:
      err(`Unknown reason subcommand: ${sub}`);
      info("  Usage: reason run|status|explain|certify|strategy|reset");
      return { lines, session };
  }
}

// ── run ────────────────────────────────────────────────────────────────────

function cmdReasonRun(
  args: string[],
  session: ReasoningSession,
  out: (t: string) => void,
  info: (t: string) => void,
  _err: (t: string) => void,
): ReasoningSession {
  const quantum = args.length > 0 ? parseInt(args[0], 10) || 0 : session.quantum;
  const observations = args.length > 1
    ? args.slice(1).map(a => parseInt(a, 10) || 0)
    : [42, 100, 200, 255];
  const reference = observations[0];

  const config: ScheduleConfig = {
    quantum,
    maxDepth: 8,
    observations,
    reference,
    initialModulus: 2,
  };

  // Select strategy tree
  let tree;
  switch (session.strategy) {
    case "dfs": tree = depthFirstDeductive(config.maxDepth); break;
    case "bfs": tree = breadthFirstInductive(observations.length, config.maxDepth); break;
    case "spiral": tree = abductiveSpiral(config.maxDepth); break;
    default: tree = composedScheduler(config);
  }

  const result = executeSchedule(tree, config);

  // Build proof from execution
  let proof = createProof(quantum, [`strategy:${session.strategy}`, `ref:${reference}`]);
  const panels: Panel[] = [];

  for (const step of result.steps) {
    if (step.deductive) {
      proof = addDeductiveStep(proof, step.deductive);
      panels.push(createPanel("DeductiveStep", "Vertical", step.deductive.depth, quantum));
    }
    if (step.inductive) {
      proof = addInductiveStep(proof, step.inductive);
      panels.push(createPanel("InductiveStep", "Horizontal", step.inductive.confidence, quantum));
    }
    if (step.abductive) {
      proof = addAbductiveStep(proof, step.abductive);
      panels.push(createPanel("AbductiveStep", "Diagonal", step.abductive.normalizedCurvature, quantum));
    }
  }

  out(`── Reasoning Run (Q${quantum}, ${session.strategy}) ──────────`);
  out(`  Steps:      ${result.totalSteps}`);
  const modes = scheduleStepsByMode(result);
  out(`  Deductive:  ${modes.deductive}  Inductive: ${modes.inductive}  Abductive: ${modes.abductive}`);
  out(`  Fibers:     ${result.finalBudget.pinnedCount}/${result.finalBudget.totalFibers} pinned`);
  out(`  State:      ${result.finalState}`);
  out(`  Converged:  ${result.converged ? "✓ yes" : "✗ no"}`);
  out(`  Proof ID:   ${proof.proofId}`);
  info(`  Panels:     ${panels.length} observables registered`);

  return { ...session, proof, lastSchedule: result, quantum, panels };
}

// ── status ─────────────────────────────────────────────────────────────────

function cmdReasonStatus(
  session: ReasoningSession,
  out: (t: string) => void,
  info: (t: string) => void,
): void {
  out("── Reasoning Status ──────────────────────────────");
  out(`  Strategy:  ${session.strategy}`);
  out(`  Quantum:   Q${session.quantum}`);

  if (!session.proof) {
    info("  No active proof. Run 'reason run' to start.");
    return;
  }

  const p = session.proof;
  out(`  Proof:     ${p.proofId}`);
  out(`  State:     ${p.state}`);
  out(`  Steps:     ${p.steps.length}`);
  const modes = stepsByMode(p);
  out(`  D/I/A:     ${modes.deductive}/${modes.inductive}/${modes.abductive}`);
  out(`  Fibers:    ${p.budget.pinnedCount}/${p.budget.totalFibers}`);
  out(`  Complete:  ${p.isComplete ? "✓" : "✗"}`);
  out(`  Cycle:     ${hasCompleteCycle(p) ? "✓ D→I→A" : "✗ incomplete"}`);
  out(`  Certified: ${p.certificate ? "✓ " + p.certificate.certificateId : "✗ not certified"}`);
  out(`  Panels:    ${session.panels.length}`);
}

// ── explain ────────────────────────────────────────────────────────────────

function cmdReasonExplain(
  args: string[],
  session: ReasoningSession,
  out: (t: string) => void,
  info: (t: string) => void,
  err: (t: string) => void,
): void {
  if (!session.proof) {
    err("No active proof. Run 'reason run' first.");
    return;
  }

  const p = session.proof;
  const stepIdx = args.length > 0 ? parseInt(args[0], 10) : -1;

  if (stepIdx >= 0 && stepIdx < p.steps.length) {
    const s = p.steps[stepIdx];
    out(`── Step ${s.index} ──────────────────────────────────`);
    out(`  Mode:          ${s.mode} (${s.axis})`);
    out(`  Justification: ${s.justification}`);
    out(`  Fibers:        ${s.fibersResolved} resolved`);
    out(`  Depth:         ${(s.cumulativeDepth * 100).toFixed(1)}%`);
    return;
  }

  // Full proof explanation
  out(`── Proof Explanation ──────────────────────────────`);
  out(`  ${p.premises.join(", ")} ⊢ ${p.conclusion ?? "(pending)"}`);
  out("");

  for (const s of p.steps) {
    const icon = s.mode === "deductive" ? "↓" : s.mode === "inductive" ? "→" : "↗";
    out(`  ${icon} [${s.index}] ${s.mode.padEnd(10)} ${s.justification.slice(0, 50)}`);
  }

  out("");
  out(`  Total fibers resolved: ${totalFibersResolved(p)}`);
  info(`  Use 'reason explain <N>' for step details.`);
}

// ── certify ────────────────────────────────────────────────────────────────

function cmdReasonCertify(
  session: ReasoningSession,
  out: (t: string) => void,
  info: (t: string) => void,
  err: (t: string) => void,
): ReasoningSession {
  if (!session.proof) {
    err("No active proof. Run 'reason run' first.");
    return session;
  }

  if (!session.proof.isComplete) {
    err(`Proof incomplete (${session.proof.budget.pinnedCount}/${session.proof.budget.totalFibers} fibers).`);
    info("Run more reasoning cycles to complete the proof.");
    return session;
  }

  if (session.proof.certificate) {
    info("Proof already certified.");
    const v = verifyCertificate(session.proof, session.proof.certificate);
    out(`  Verification: ${v.valid ? "✓ valid" : "✗ invalid"}`);
    if (!v.valid) for (const f of v.failures) out(`    ✗ ${f}`);
    return session;
  }

  // Check holonomy from last schedule
  const holonomyZero = session.lastSchedule?.converged ?? false;
  const certified = certifyProof(session.proof, true, holonomyZero);

  out("── Certificate Issued ────────────────────────────");
  out(`  Certificate: ${certified.certificate!.certificateId}`);
  out(`  Proof:       ${certified.proofId}`);
  out(`  Steps Hash:  ${certified.certificate!.stepsHash}`);
  out(`  Critical ID: ✓`);
  out(`  Holonomy:    ${holonomyZero ? "✓ zero" : "⚠ non-zero"}`);
  out(`  Self-attest: ✓`);

  return { ...session, proof: certified };
}

// ── strategy ───────────────────────────────────────────────────────────────

function cmdReasonStrategy(
  args: string[],
  session: ReasoningSession,
  out: (t: string) => void,
  info: (t: string) => void,
  err: (t: string) => void,
): ReasoningSession {
  const valid = ["dfs", "bfs", "spiral", "composed"] as const;
  const choice = args[0];

  if (!choice) {
    out(`Current strategy: ${session.strategy}`);
    info("  Available: dfs, bfs, spiral, composed");
    return session;
  }

  if (!valid.includes(choice as typeof valid[number])) {
    err(`Unknown strategy: ${choice}`);
    info("  Available: dfs, bfs, spiral, composed");
    return session;
  }

  out(`✓ Strategy set to: ${choice}`);
  return { ...session, strategy: choice as ReasoningSession["strategy"] };
}

// ── Panel Helpers for Dashboard ────────────────────────────────────────────

/** Get panels grouped by axis for the tri-axis dashboard. */
export function getTriAxisPanels(session: ReasoningSession): {
  vertical: Panel[];
  horizontal: Panel[];
  diagonal: Panel[];
} {
  return {
    vertical: session.panels.filter(p => p.axis === "Vertical"),
    horizontal: session.panels.filter(p => p.axis === "Horizontal"),
    diagonal: session.panels.filter(p => p.axis === "Diagonal"),
  };
}
