/**
 * UOR Code Analyzer — Python entity extraction.
 *
 * Extracts classes, functions, variables, and their relationships
 * from Python source code using regex-based analysis.
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

    // Classes: class Foo: or class Foo(Bar):
    const classMatch = line.match(/^class\s+([A-Za-z_]\w*)\s*[\(:]/);
    if (classMatch) {
      entities.push({ name: classMatch[1], type: "class", line: lineNum, content: line.trim() });
    }

    // Functions/methods: def foo(...): or async def foo(...):
    const funcMatch = line.match(/^(\s*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/);
    if (funcMatch) {
      const indent = funcMatch[1].length;
      const name = funcMatch[2];
      // Skip dunder methods that are noise (but keep __init__, __call__)
      if (name.startsWith("__") && name.endsWith("__") && !["__init__", "__call__", "__enter__", "__exit__"].includes(name)) {
        continue;
      }
      entities.push({ name, type: "function", line: lineNum, content: line.trim() });
    }

    // Top-level variables: FOO = ... or foo: int = ...
    const varMatch = line.match(/^([A-Za-z_]\w*)\s*(?::\s*\w[\w\[\], |]*\s*)?=\s*/);
    if (varMatch && !line.match(/^\s/) && !classMatch && !funcMatch) {
      entities.push({ name: varMatch[1], type: "variable", line: lineNum, content: line.trim() });
    }

    // Type aliases (Python 3.12+): type Foo = ... or Foo = TypeVar(...)
    const typeAliasMatch = line.match(/^type\s+([A-Za-z_]\w*)\s*=/);
    if (typeAliasMatch) {
      entities.push({ name: typeAliasMatch[1], type: "type", line: lineNum, content: line.trim() });
    }
    const typeVarMatch = line.match(/^([A-Za-z_]\w*)\s*=\s*(?:TypeVar|TypeAlias|NewType)\s*\(/);
    if (typeVarMatch) {
      entities.push({ name: typeVarMatch[1], type: "type", line: lineNum, content: line.trim() });
    }
  }

  return entities;
}

function extractRelations(code: string, entityNames: Set<string>): CodeRelation[] {
  const relations: CodeRelation[] = [];
  const lines = code.split("\n");

  for (const line of lines) {
    // Import: from x import y, z  or  import x
    const fromImport = line.match(/from\s+\S+\s+import\s+(.+)/);
    if (fromImport) {
      const names = fromImport[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim());
      for (const name of names) {
        if (name && !name.startsWith("(")) {
          relations.push({ source: "module", target: name, type: "imports" });
        }
      }
    }

    const plainImport = line.match(/^import\s+([A-Za-z_]\w*)/);
    if (plainImport && !fromImport) {
      relations.push({ source: "module", target: plainImport[1], type: "imports" });
    }

    // Inheritance: class Foo(Bar, Baz):
    const inheritMatch = line.match(/^class\s+([A-Za-z_]\w*)\s*\(([^)]+)\)/);
    if (inheritMatch) {
      const bases = inheritMatch[2].split(",").map((s) => s.trim().split("[")[0].trim());
      for (const base of bases) {
        if (base && base !== "object" && !base.startsWith("metaclass")) {
          relations.push({ source: inheritMatch[1], target: base, type: "extends" });
        }
      }
    }

    // Decorator-based exports: @app.route, @dataclass etc. — skip for now
  }

  // Detect calls between known entities
  for (const caller of entityNames) {
    for (const callee of entityNames) {
      if (caller === callee) continue;
      const pattern = new RegExp(`\\b${callee}\\s*\\(`);
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

export async function analyzePython(code: string): Promise<AnalysisResult> {
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
