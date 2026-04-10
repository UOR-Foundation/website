/**
 * CNCF Compatibility — Pipeline (CI/CD) Engine.
 * ═════════════════════════════════════════════════════════════════
 *
 * Defines and executes CI/CD pipelines as cascaded UOR operations.
 * Equivalent to Argo Workflows / Tekton Pipelines.
 *
 * Maps to kernel::cascade::CascadeComposition — sequential gated steps
 * where each step must succeed before the next begins.
 *
 * @version 1.0.0
 */

import type { UorPipeline, PipelineStep } from "./types";

export type PipelineStepStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface PipelineStepResult {
  step: PipelineStep;
  status: PipelineStepStatus;
  startedAt: number | null;
  completedAt: number | null;
  output?: string;
  error?: string;
}

export interface PipelineRun {
  pipeline: UorPipeline;
  status: "pending" | "running" | "success" | "failed";
  steps: PipelineStepResult[];
  startedAt: number;
  completedAt: number | null;
}

/**
 * Create a pipeline spec.
 */
export function createPipeline(
  name: string,
  steps: PipelineStep[],
  opts?: { version?: string; triggers?: UorPipeline["triggers"] },
): UorPipeline {
  return {
    "@type": "uor:Pipeline",
    name,
    version: opts?.version ?? "1.0.0",
    steps,
    triggers: opts?.triggers,
  };
}

/**
 * Execute a pipeline (simulation).
 *
 * In production, each step would dispatch to the container runtime
 * via createContainer() + execContainer(). For now, we simulate
 * sequential execution with dependency resolution.
 */
export async function executePipeline(pipeline: UorPipeline): Promise<PipelineRun> {
  const run: PipelineRun = {
    pipeline,
    status: "running",
    steps: pipeline.steps.map((step) => ({
      step,
      status: "pending" as PipelineStepStatus,
      startedAt: null,
      completedAt: null,
    })),
    startedAt: Date.now(),
    completedAt: null,
  };

  // Topological execution respecting dependsOn
  const completed = new Set<string>();

  for (const stepResult of run.steps) {
    // Check dependencies
    const deps = stepResult.step.dependsOn ?? [];
    const allDepsComplete = deps.every((d) => completed.has(d));

    if (!allDepsComplete) {
      stepResult.status = "skipped";
      continue;
    }

    stepResult.status = "running";
    stepResult.startedAt = Date.now();

    // Simulate step execution
    try {
      stepResult.output = `[pipeline] ${stepResult.step.name}: ${stepResult.step.command.join(" ")}`;
      stepResult.status = "success";
      completed.add(stepResult.step.name);
    } catch (err: any) {
      stepResult.status = "failed";
      stepResult.error = err.message;
      run.status = "failed";
      run.completedAt = Date.now();
      return run;
    }

    stepResult.completedAt = Date.now();
  }

  run.status = "success";
  run.completedAt = Date.now();
  return run;
}
