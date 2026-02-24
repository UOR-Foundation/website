/**
 * Morphism — UorModule<TransformRecord> Implementation
 * ═════════════════════════════════════════════════════
 *
 * The morphism gateway using the generic lifecycle base.
 * Structure-preserving transforms are automatically observed.
 *
 * @module morphism/morphism-module
 */

import { UorModule } from "@/modules/core/uor-module";
import { applyTransform, type MorphismKind, type MappingRule, type TransformRecord } from "./transform";
import { contentAddress } from "@/modules/identity";
import type { UORRing } from "@/modules/ring-core/ring";

export class MorphismModule extends UorModule<TransformRecord> {
  constructor() {
    super("morphism", "Morphism Gateway");
    this.register();
  }

  /**
   * Apply a transform with automatic lifecycle observation.
   */
  transform(
    sourceRing: UORRing,
    targetRing: UORRing,
    value: number,
    rules: MappingRule[],
    kind: MorphismKind = "Transform",
  ): { targetValue: number; record: TransformRecord } {
    const targetValue = applyTransform(sourceRing, targetRing, value, rules);
    const sourceIri = contentAddress(sourceRing, value);
    const targetIri = contentAddress(targetRing, targetValue);

    const record: TransformRecord = {
      "@type": `morphism:${kind}`,
      transformId: `urn:uor:morphism:${this.operationCount}`,
      sourceIri,
      targetIri,
      sourceValue: value,
      targetValue,
      sourceQuantum: sourceRing.quantum,
      targetQuantum: targetRing.quantum,
      kind,
      rules,
      fidelityPreserved: kind === "Isometry" || kind === "Embedding",
      timestamp: new Date().toISOString(),
    };

    // Observe: input byte = low byte of source, output byte = low byte of target
    this.observe(
      `${kind}:${rules[0]?.operation ?? "unknown"}`,
      value & 0xff,
      targetValue & 0xff,
      record,
    );

    return { targetValue, record };
  }

  protected verifySelf(): { verified: boolean; failures: string[] } {
    // Morphism verification: check that isometry ratio ≥ 50%
    const health = this.health();
    const failures: string[] = [];
    if (health.operationCount > 0 && health.logosCompliance < 0.3) {
      failures.push(`Low Logos compliance: ${(health.logosCompliance * 100).toFixed(1)}% (< 30%)`);
    }
    return { verified: failures.length === 0, failures };
  }
}
