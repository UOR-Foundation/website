/**
 * UOR Code Analyzer — Rust entity extraction.
 *
 * Extracts structs, enums, functions, traits, impls, type aliases,
 * and their relationships from Rust source code using regex-based analysis.
 */

import { sha256hex } from "@/lib/crypto";
import type { CodeEntity, CodeRelation, AnalysisResult } from "./analyzer";

// ── Regex-based extraction ──────────────────────────────────────────────────

function extractEntities(code: string): Omit<CodeEntity, "hash">[] {
  const entities: Omit<CodeEntity, "hash">[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Structs: pub struct Foo { or struct Foo(
    const structMatch = line.match(/(?:pub\s+)?struct\s+([A-Za-z_]\w*)/);
    if (structMatch) {
      entities.push({ name: structMatch[1], type: "class", line: lineNum, content: line.trim() });
    }

    // Enums: pub enum Foo {
    const enumMatch = line.match(/(?:pub\s+)?enum\s+([A-Za-z_]\w*)/);
    if (enumMatch && !structMatch) {
      entities.push({ name: enumMatch[1], type: "enum", line: lineNum, content: line.trim() });
    }

    // Traits: pub trait Foo { or trait Foo: Bar {
    const traitMatch = line.match(/(?:pub\s+)?(?:unsafe\s+)?trait\s+([A-Za-z_]\w*)/);
    if (traitMatch) {
      entities.push({ name: traitMatch[1], type: "interface", line: lineNum, content: line.trim() });
    }

    // Functions: pub fn foo( or async fn foo( or pub(crate) fn foo(
    const fnMatch = line.match(/(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?(?:const\s+)?fn\s+([A-Za-z_]\w*)\s*[<(]/);
    if (fnMatch) {
      entities.push({ name: fnMatch[1], type: "function", line: lineNum, content: line.trim() });
    }

    // Type aliases: type Foo = ...
    const typeMatch = line.match(/(?:pub\s+)?type\s+([A-Za-z_]\w*)\s*(?:<[^>]*>)?\s*=/);
    if (typeMatch) {
      entities.push({ name: typeMatch[1], type: "type", line: lineNum, content: line.trim() });
    }

    // Constants/statics: const FOO: or static FOO:
    const constMatch = line.match(/(?:pub\s+)?(?:const|static)\s+([A-Z_]\w*)\s*:/);
    if (constMatch) {
      entities.push({ name: constMatch[1], type: "variable", line: lineNum, content: line.trim() });
    }
  }

  return entities;
}

function extractRelations(code: string, entityNames: Set<string>): CodeRelation[] {
  const relations: CodeRelation[] = [];
  const lines = code.split("\n");

  for (const line of lines) {
    // use statements: use crate::foo::Bar;
    const useMatch = line.match(/use\s+(?:crate|super|self)?(?:::)?(.+);/);
    if (useMatch) {
      const path = useMatch[1];
      // Extract the last segment(s)
      const braceMatch = path.match(/\{([^}]+)\}/);
      if (braceMatch) {
        const names = braceMatch[1].split(",").map((s) => s.trim().split("::").pop()?.split(" as ")[0]?.trim()).filter(Boolean);
        for (const name of names) {
          if (name) relations.push({ source: "module", target: name, type: "imports" });
        }
      } else {
        const last = path.split("::").pop()?.trim();
        if (last && last !== "*" && last !== "self") {
          relations.push({ source: "module", target: last, type: "imports" });
        }
      }
    }

    // impl Trait for Struct
    const implForMatch = line.match(/impl\s+([A-Za-z_]\w*)\s+for\s+([A-Za-z_]\w*)/);
    if (implForMatch) {
      relations.push({ source: implForMatch[2], target: implForMatch[1], type: "implements" });
    }

    // Trait inheritance: trait Foo: Bar + Baz
    const traitInherit = line.match(/trait\s+([A-Za-z_]\w*)\s*:\s*([^{]+)/);
    if (traitInherit) {
      const supers = traitInherit[2].split("+").map((s) => s.trim().split("<")[0].trim());
      for (const sup of supers) {
        if (sup && /^[A-Za-z_]\w*$/.test(sup)) {
          relations.push({ source: traitInherit[1], target: sup, type: "extends" });
        }
      }
    }
  }

  // Detect function calls between known entities
  for (const caller of entityNames) {
    for (const callee of entityNames) {
      if (caller === callee) continue;
      const pattern = new RegExp(`\\b${callee}\\s*[(:!]|${callee}::`);
      if (pattern.test(code)) {
        relations.push({ source: caller, target: callee, type: "calls" });
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return relations.filter((r) => {
    const key = `${r.source}→${r.target}:${r.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function analyzeRust(code: string): Promise<AnalysisResult> {
  const rawEntities = extractEntities(code);
  const entityNames = new Set(rawEntities.map((e) => e.name));

  const entities: CodeEntity[] = await Promise.all(
    rawEntities.map(async (e) => ({
      ...e,
      hash: await sha256hex(`${e.type}:${e.name}:${e.content}`),
    }))
  );

  const relations = extractRelations(code, entityNames);
  const sourceHash = await sha256hex(code);

  return { entities, relations, sourceHash };
}
