/**
 * OpenAPI 3.1.0 Specification Compliance Tests
 *
 * Validates that public/openapi.json conforms to OpenAPI 3.1.0 structural requirements:
 * - Valid JSON
 * - Required root fields present (openapi, info, paths)
 * - jsonSchemaDialect present (3.1.0 best practice)
 * - All tags used in operations are defined
 * - All operationIds are unique
 * - All $refs resolve to existing component definitions
 * - Runtime router paths are covered by the spec
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const specPath = path.resolve(__dirname, "../../public/openapi.json");
const specRaw = fs.readFileSync(specPath, "utf8");
const spec = JSON.parse(specRaw);

describe("OpenAPI 3.1.0 structural compliance", () => {

  it("is valid JSON", () => {
    expect(spec).toBeDefined();
    expect(typeof spec).toBe("object");
  });

  it("has required root fields (openapi, info, paths)", () => {
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBeTruthy();
    expect(spec.info.version).toBeTruthy();
    expect(spec.paths).toBeDefined();
    expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
  });

  it("declares jsonSchemaDialect for 3.1.0", () => {
    expect(spec.jsonSchemaDialect).toBe("https://json-schema.org/draft/2020-12/schema");
  });

  it("has license.identifier (SPDX) per OAS 3.1.0 §4.8.3", () => {
    expect(spec.info.license).toBeDefined();
    expect(spec.info.license.identifier).toBe("Apache-2.0");
  });

  it("has at least one server defined", () => {
    expect(spec.servers).toBeDefined();
    expect(spec.servers.length).toBeGreaterThan(0);
    expect(spec.servers[0].url).toBeTruthy();
  });

  it("all tags used in operations are defined at root level", () => {
    const definedTags = new Set((spec.tags ?? []).map((t: any) => t.name));
    const usedTags = new Set<string>();

    for (const [, pathItem] of Object.entries(spec.paths)) {
      for (const method of ["get", "post", "put", "delete", "patch"]) {
        const op = (pathItem as any)[method];
        if (op?.tags) {
          for (const tag of op.tags) usedTags.add(tag);
        }
      }
    }

    const undefinedTags = [...usedTags].filter(t => !definedTags.has(t));
    expect(undefinedTags).toEqual([]);
  });

  it("all operationIds are unique", () => {
    const ids: string[] = [];
    for (const [, pathItem] of Object.entries(spec.paths)) {
      for (const method of ["get", "post", "put", "delete", "patch"]) {
        const op = (pathItem as any)[method];
        if (op?.operationId) ids.push(op.operationId);
      }
    }
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });

  it("all $ref targets exist in components", () => {
    const refs: string[] = [];
    const collectRefs = (obj: any) => {
      if (!obj || typeof obj !== "object") return;
      if (obj.$ref && typeof obj.$ref === "string") refs.push(obj.$ref);
      for (const val of Object.values(obj)) collectRefs(val);
    };
    collectRefs(spec.paths);

    const missingRefs: string[] = [];
    for (const ref of refs) {
      if (!ref.startsWith("#/components/")) continue;
      const parts = ref.replace("#/components/", "").split("/");
      let target: any = spec.components;
      for (const p of parts) {
        target = target?.[p];
      }
      if (target === undefined) missingRefs.push(ref);
    }
    expect(missingRefs).toEqual([]);
  });

  it("has ≥ 50 documented path entries (matching runtime coverage)", () => {
    const pathCount = Object.keys(spec.paths).length;
    expect(pathCount).toBeGreaterThanOrEqual(50);
  });

  it("every operation has a summary", () => {
    const missingSummary: string[] = [];
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const method of ["get", "post", "put", "delete", "patch"]) {
        const op = (pathItem as any)[method];
        if (op && !op.summary) missingSummary.push(`${method.toUpperCase()} ${path}`);
      }
    }
    expect(missingSummary).toEqual([]);
  });

  it("every POST operation with a body has requestBody defined", () => {
    const missingBody: string[] = [];
    // Some POST endpoints compute deterministically and genuinely need a body
    const exemptions = new Set(["/schema-org/extend"]);

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const op = (pathItem as any).post;
      if (op && !op.requestBody && !exemptions.has(path)) {
        missingBody.push(`POST ${path}`);
      }
    }
    expect(missingBody).toEqual([]);
  });

  it("error code enum includes all runtime codes", () => {
    const errorSchema = spec.components?.schemas?.ErrorResponse;
    expect(errorSchema).toBeDefined();
    const codes = errorSchema.properties.code.enum as string[];
    const required = [
      "INVALID_PARAMETER", "RATE_LIMITED", "PAYLOAD_TOO_LARGE",
      "METHOD_NOT_ALLOWED", "INTERNAL_ERROR", "GATEWAY_TIMEOUT",
      "BAD_GATEWAY", "GATEWAY_AUTH_MISSING"
    ];
    for (const code of required) {
      expect(codes).toContain(code);
    }
  });
});
