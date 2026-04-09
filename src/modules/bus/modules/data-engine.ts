/**
 * Sovereign Bus — Data Engine Module Registration.
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes data engineering pipeline: ingest, profile, quality.
 * All local — 5-stage pipeline with UOR encoding at Stage 5.
 *
 * @version 1.0.0
 */

import { register } from "../registry";

register({
  ns: "data",
  label: "Data Engine",
  operations: {
    ingest: {
      handler: async (params: any) => {
        const { processTabular } = await import("@/modules/knowledge-graph");
        return processTabular(
          params?.columns ?? params?.headers,
          params?.rows,
        );
      },
      description: "Run the 5-stage data engineering pipeline (parse → clean → feature → quality → UOR encode)",
      paramsSchema: {
        type: "object",
        properties: {
          rows: { type: "array", description: "2D array of string values" },
          columns: { type: "array", items: { type: "string" } },
        },
        required: ["rows", "columns"],
      },
    },
    profile: {
      handler: async (params: any) => {
        const { autoProfiler } = await import("@/modules/knowledge-graph");
        return autoProfiler.getProfile(params?.sourceKey ?? "unknown");
      },
      description: "Retrieve the auto-profiler statistics for a data source",
    },
    quality: {
      handler: async (params: any) => {
        const { processTabular } = await import("@/modules/knowledge-graph");
        const result = await processTabular(
          params?.columns ?? params?.headers,
          params?.rows,
        );
        return {
          overall: result.quality.overall,
          completeness: result.quality.completeness,
          uniqueness: result.quality.uniqueness,
          validity: result.quality.validity,
          columnCount: result.columns.length,
          rowCount: result.rows.length,
        };
      },
      description: "Compute quality score (completeness × uniqueness × validity) for tabular data",
    },
  },
});
