/**
 * UOR Code Analyzer — lightweight TypeScript/JavaScript entity extraction.
 *
 * Extracts code entities (classes, functions, interfaces, variables)
 * and their relationships (imports, calls, extends, implements)
 * using regex-based analysis. Each entity is content-hashed via SHA-256.
 *
 * This is the TypeScript equivalent of Bevel Software's code-to-knowledge-graph
 * concept, adapted to run in-browser with UOR derivation integration.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type EntityType = "class" | "function" | "interface" | "variable" | "type" | "enum";
export type RelationType = "imports" | "calls" | "extends" | "implements" | "exports";

export interface CodeEntity {
  name: string;
  type: EntityType;
  hash: string;
  line: number;
  content: string;
}

export interface CodeRelation {
  source: string;
  target: string;
  type: RelationType;
}

export interface AnalysisResult {
  entities: CodeEntity[];
  relations: CodeRelation[];
  sourceHash: string;
}

// ── SHA-256 hex (SubtleCrypto) ──────────────────────────────────────────────

async function sha256hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Regex-based extraction ──────────────────────────────────────────────────

function extractEntities(code: string): Omit<CodeEntity, "hash">[] {
  const entities: Omit<CodeEntity, "hash">[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Classes: class Foo { ... } or export class Foo
    const classMatch = line.match(/(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/);
    if (classMatch) {
      entities.push({ name: classMatch[1], type: "class", line: lineNum, content: line.trim() });
    }

    // Interfaces: interface Bar { ... }
    const ifaceMatch = line.match(/(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/);
    if (ifaceMatch && !classMatch) {
      entities.push({ name: ifaceMatch[1], type: "interface", line: lineNum, content: line.trim() });
    }

    // Type aliases: type Baz = ...
    const typeMatch = line.match(/(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=/);
    if (typeMatch) {
      entities.push({ name: typeMatch[1], type: "type", line: lineNum, content: line.trim() });
    }

    // Enums: enum Direction { ... }
    const enumMatch = line.match(/(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/);
    if (enumMatch) {
      entities.push({ name: enumMatch[1], type: "enum", line: lineNum, content: line.trim() });
    }

    // Functions: function foo(), async function foo(), export function foo()
    const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/);
    if (funcMatch) {
      entities.push({ name: funcMatch[1], type: "function", line: lineNum, content: line.trim() });
    }

    // Arrow/const functions: const foo = (...) => or const foo = function
    const arrowMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:\(|function)/);
    if (arrowMatch && !funcMatch) {
      entities.push({ name: arrowMatch[1], type: "function", line: lineNum, content: line.trim() });
    }

    // Top-level const/let/var (non-function): const FOO = "bar"
    const varMatch = line.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[:=]/);
    if (varMatch && !arrowMatch && !funcMatch) {
      // Skip if it's a destructuring
      if (!varMatch[1].startsWith("{") && !varMatch[1].startsWith("[")) {
        entities.push({ name: varMatch[1], type: "variable", line: lineNum, content: line.trim() });
      }
    }
  }

  return entities;
}

function extractRelations(code: string, entityNames: Set<string>): CodeRelation[] {
  const relations: CodeRelation[] = [];
  const lines = code.split("\n");

  for (const line of lines) {
    // Import relations: import { Foo, Bar } from "..."
    const importMatch = line.match(/import\s+\{([^}]+)\}\s+from/);
    if (importMatch) {
      const imported = importMatch[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim());
      for (const name of imported) {
        if (name && entityNames.has(name)) {
          // Find which local entity uses this import
          relations.push({ source: "module", target: name, type: "imports" });
        }
      }
    }

    // Default import: import Foo from "..."
    const defaultImport = line.match(/import\s+([A-Za-z_$][\w$]*)\s+from/);
    if (defaultImport && !importMatch) {
      relations.push({ source: "module", target: defaultImport[1], type: "imports" });
    }

    // Extends: class Foo extends Bar
    const extendsMatch = line.match(/class\s+([A-Za-z_$][\w$]*)\s+extends\s+([A-Za-z_$][\w$]*)/);
    if (extendsMatch) {
      relations.push({ source: extendsMatch[1], target: extendsMatch[2], type: "extends" });
    }

    // Implements: class Foo implements Bar, Baz
    const implMatch = line.match(/class\s+([A-Za-z_$][\w$]*)[^{]*implements\s+([^{]+)/);
    if (implMatch) {
      const impls = implMatch[2].split(",").map((s) => s.trim());
      for (const impl of impls) {
        const name = impl.split("<")[0].trim();
        if (name) relations.push({ source: implMatch[1], target: name, type: "implements" });
      }
    }

    // Export relations
    const exportMatch = line.match(/export\s+(?:default\s+)?(?:class|function|interface|type|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/);
    if (exportMatch) {
      relations.push({ source: exportMatch[1], target: "module", type: "exports" });
    }
  }

  // Detect function calls between known entities
  for (const caller of entityNames) {
    for (const callee of entityNames) {
      if (caller === callee) continue;
      // Look for callee( or new Callee( patterns within caller's scope
      const callPattern = new RegExp(`\\b${callee}\\s*\\(|new\\s+${callee}\\s*\\(`);
      if (callPattern.test(code)) {
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

// ── analyzeTypeScript ───────────────────────────────────────────────────────

/**
 * Analyze TypeScript/JavaScript source code and extract entities + relations.
 * Each entity gets a SHA-256 content hash for UOR derivation.
 */
export async function analyzeTypeScript(code: string): Promise<AnalysisResult> {
  const rawEntities = extractEntities(code);
  const entityNames = new Set(rawEntities.map((e) => e.name));

  // Hash each entity's content
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
