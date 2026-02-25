/**
 * vShell — The Hologram OS Shell (Compound Operation)
 * ════════════════════════════════════════════════════
 *
 * A stateful REPL session over the HologramEngine that:
 *   1. Parses POSIX-style command strings
 *   2. Dispatches to the Virtual I/O syscall layer
 *   3. Returns structured ShellResult objects for UI projection
 *
 * The shell is itself a UOR object — its state (command history,
 * selected PID, environment) is deterministic and serializable.
 *
 * Design: ZERO new primitives. Every command delegates to an existing
 * vIO syscall. The shell adds only parsing, routing, and presentation.
 *
 * @module uns/core/hologram/vshell
 */

import type { HologramEngine, EngineTick } from "./engine";
import type { ExecutableBlueprint } from "./executable-blueprint";
import {
  vStat, vPs, vMmap, vMmapAll, vIoctl, vKill,
  type MmapResult,
} from "./virtual-io";
import {
  ingest, ingestAndSpawn,
  type IngestResult, type IngestSpawnedResult,
} from "./universal-ingest";
import { DIRECTIONS } from "./polytree";
import type { ProjectionInput } from "./index";
import { getHologramGpu, type HologramGpu, type GpuBenchmarkResult } from "./gpu";

// ── Shell Result Types ────────────────────────────────────────────────────

export type ShellResultKind =
  | "output"    // Normal output lines
  | "info"      // Informational / help text
  | "error"     // Error messages
  | "mutation"; // State mutation (selected PID changed, process spawned, etc.)

export interface ShellLine {
  readonly kind: ShellResultKind;
  readonly text: string;
}

/**
 * The structured result of executing a shell command.
 * Contains both human-readable output and machine-readable side effects.
 */
export interface ShellResult {
  /** The command that was executed. */
  readonly command: string;
  /** Output lines for terminal display. */
  readonly lines: readonly ShellLine[];
  /** Side effects produced by the command. */
  readonly effects: ShellEffects;
}

export interface ShellEffects {
  /** If the selected PID changed. */
  selectedPid?: string | null;
  /** If an identity was derived. */
  identity?: ProjectionInput | null;
  /** If a tick was produced. */
  tick?: EngineTick | null;
  /** If projections were produced. */
  projections?: MmapResult[];
  /** Updated process count. */
  processCount?: number;
  /** Whether terminal should be cleared. */
  clear?: boolean;
  /** Blueprint that was created/used (for persistence tracking). */
  spawnedBlueprint?: { pid: string; blueprint: ExecutableBlueprint };
  /** Number of items persisted (for save/load feedback). */
  persistedCount?: number;
  /** GPU benchmark result. */
  gpuBenchmark?: GpuBenchmarkResult;
}

// ── Shell State ───────────────────────────────────────────────────────────

export interface ShellState {
  /** Currently selected process. */
  selectedPid: string | null;
  /** Command history (most recent first). */
  history: string[];
  /** Environment variables. */
  env: Record<string, string>;
}

// ── Command Definitions ───────────────────────────────────────────────────

interface CommandDef {
  readonly usage: string;
  readonly description: string;
}

const COMMANDS: Record<string, CommandDef> = {
  help:    { usage: "help",                    description: "Show this help" },
  spawn:   { usage: "spawn <text>",            description: "Ingest + boot as process" },
  ingest:  { usage: "ingest <text>",           description: "Ingest text as UOR object" },
  ps:      { usage: "ps",                      description: "List running processes" },
  stat:    { usage: "stat [pid]",              description: "Process status" },
  tick:    { usage: "tick [pid] [pos] [dir]",   description: "Evolve process state" },
  mmap:    { usage: "mmap [pid] <projection>", description: "Map identity to protocol" },
  mmapall: { usage: "mmapall [pid]",           description: "Show ALL projections" },
  select:  { usage: "select <pid>",            description: "Select process for UI" },
  kill:    { usage: "kill [pid]",              description: "Terminate process" },
  fork:    { usage: "fork [pid]",              description: "Fork selected process" },
  env:     { usage: "env [key] [value]",       description: "Get/set environment" },
  history: { usage: "history",                 description: "Show command history" },
  save:    { usage: "save",                    description: "Save all processes to disk" },
  load:    { usage: "load",                    description: "Restore saved processes" },
  gpu:     { usage: "gpu <sub>",               description: "GPU device (info|bench|matmul|relu)" },
  grep:    { usage: "grep <pattern>",          description: "Filter lines matching pattern" },
  head:    { usage: "head [-n N]",             description: "Show first N lines (default 10)" },
  tail:    { usage: "tail [-n N]",             description: "Show last N lines (default 10)" },
  wc:      { usage: "wc",                      description: "Count lines, words, chars" },
  sort:    { usage: "sort [-r]",               description: "Sort lines alphabetically" },
  uniq:    { usage: "uniq",                    description: "Remove consecutive duplicates" },
  cat:     { usage: "cat",                     description: "Pass-through (identity filter)" },
  echo:    { usage: "echo <text>",             description: "Print text to output" },
  clear:   { usage: "clear",                   description: "Clear terminal" },
};

// ── PID Resolution ────────────────────────────────────────────────────────

function resolvePid(engine: HologramEngine, partial: string): string {
  const pids = engine.listProcesses();
  const match = pids.find(p => p.startsWith(partial));
  return match ?? partial;
}

// ── vShell Class ──────────────────────────────────────────────────────────

/**
 * vShell — A REPL session over the HologramEngine.
 *
 * Usage:
 *   const shell = new VShell(engine);
 *   const result = await shell.exec("spawn Hello World");
 *   // result.lines → terminal output
 *   // result.effects → state mutations for UI
 */
export class VShell {
  readonly engine: HologramEngine;
  private state: ShellState;

  /** External blueprint map for persistence (injected by consumer). */
  blueprintMap: Map<string, ExecutableBlueprint>;

  /** Optional persistence callbacks (injected by consumer). */
  onSave?: (engine: HologramEngine, bpMap: Map<string, ExecutableBlueprint>) => Promise<number>;
  onLoad?: (engine: HologramEngine) => Promise<{ pids: string[]; blueprintMap: Map<string, ExecutableBlueprint> }>;

  constructor(
    engine: HologramEngine,
    initialState?: Partial<ShellState>,
  ) {
    this.engine = engine;
    this.blueprintMap = new Map();
    this.state = {
      selectedPid: initialState?.selectedPid ?? null,
      history: initialState?.history ?? [],
      env: {
        SHELL: "vsh",
        TERM: "hologram-256",
        HOME: "/",
        USER: "hologram",
        ...initialState?.env,
      },
    };
  }

  // ── Accessors ───────────────────────────────────────────────────────────

  get selectedPid(): string | null { return this.state.selectedPid; }
  get history(): string[] { return this.state.history; }
  get env(): Record<string, string> { return { ...this.state.env }; }

  /** Serialize shell state for dehydration. */
  snapshot(): ShellState {
    return { ...this.state, history: [...this.state.history] };
  }

  // ── Command Execution ─────────────────────────────────────────────────

  /**
   * Execute a command string with pipe and redirect support.
   *
   * Supports:
   *   cmd1 | cmd2 | cmd3    — pipe output of one command into the next
   *   cmd > /dev/null        — discard output
   *   cmd >> /dev/clipboard  — append to clipboard (future)
   *
   * Filter commands (grep, head, tail, wc, sort, uniq, cat) can only
   * appear in pipeline positions after the first command.
   */
  async exec(cmd: string): Promise<ShellResult> {
    const trimmed = cmd.trim();
    if (!trimmed) {
      return { command: "", lines: [], effects: {} };
    }

    // Record in history
    this.state.history = [trimmed, ...this.state.history].slice(0, 100);

    // ── Parse redirect (last segment after > or >>) ──────────────────
    let redirectTarget: string | null = null;
    let redirectAppend = false;
    let commandPart = trimmed;

    const redirectMatch = trimmed.match(/^(.+?)(\s*>>?\s*)(\S+)\s*$/);
    if (redirectMatch) {
      const beforeRedirect = redirectMatch[1].trim();
      redirectAppend = redirectMatch[2].includes(">>");
      redirectTarget = redirectMatch[3];
      commandPart = beforeRedirect;
    }

    // ── Parse pipeline ───────────────────────────────────────────────
    const stages = commandPart.split(/\s*\|\s*/).filter(Boolean);

    if (stages.length === 0) {
      return { command: trimmed, lines: [], effects: {} };
    }

    // Execute the first (producer) command
    const firstResult = await this.execSingle(stages[0]);

    // Run each subsequent stage as a filter on previous output
    let currentLines = [...firstResult.lines];
    const mergedEffects = { ...firstResult.effects };

    for (let i = 1; i < stages.length; i++) {
      currentLines = this.applyFilter(stages[i], currentLines);
    }

    // ── Apply redirect ───────────────────────────────────────────────
    if (redirectTarget) {
      if (redirectTarget === "/dev/null") {
        // Discard all output
        currentLines = [{ kind: "info" as const, text: `(output redirected to /dev/null)` }];
      } else if (redirectTarget === "/dev/clipboard") {
        const text = currentLines.map(l => l.text).join("\n");
        try {
          await navigator.clipboard.writeText(text);
          currentLines = [{ kind: "info" as const, text: `✓ ${text.split("\n").length} lines copied to clipboard` }];
        } catch {
          currentLines = [{ kind: "error" as const, text: "Clipboard write failed (no permission)" }];
        }
      } else {
        // Store in env as a pseudo-file
        const text = currentLines.map(l => l.text).join("\n");
        if (redirectAppend) {
          this.state.env[redirectTarget] = (this.state.env[redirectTarget] ?? "") + "\n" + text;
        } else {
          this.state.env[redirectTarget] = text;
        }
        currentLines = [{ kind: "info" as const, text: `✓ Output written to $${redirectTarget} (${text.length} chars)` }];
      }
    }

    return { command: trimmed, lines: currentLines, effects: mergedEffects };
  }

  /**
   * Execute a single command (no pipes/redirects).
   */
  private async execSingle(cmd: string): Promise<ShellResult> {
    const trimmed = cmd.trim();
    const [op, ...args] = trimmed.split(/\s+/);
    const lines: ShellLine[] = [];
    const effects: ShellEffects = {};

    const out = (text: string) => lines.push({ kind: "output", text });
    const info = (text: string) => lines.push({ kind: "info", text });
    const err = (text: string) => lines.push({ kind: "error", text });

    try {
      switch (op) {
        case "help":
          this.cmdHelp(info);
          break;

        case "clear":
          effects.clear = true;
          break;

        case "echo":
          out(args.join(" "));
          break;

        case "ingest":
          await this.cmdIngest(args, out, effects);
          break;

        case "spawn":
          await this.cmdSpawn(args, out, effects);
          break;

        case "ps":
          this.cmdPs(out, info, effects);
          break;

        case "stat":
          this.cmdStat(args, out, err);
          break;

        case "tick":
          await this.cmdTick(args, out, err, effects);
          break;

        case "mmap":
          await this.cmdMmap(args, out, err);
          break;

        case "mmapall":
          await this.cmdMmapAll(args, out, info, err, effects);
          break;

        case "select":
          await this.cmdSelect(args, out, err, effects);
          break;

        case "kill":
          this.cmdKill(args, out, err, effects);
          break;

        case "fork":
          await this.cmdFork(args, out, err, effects);
          break;

        case "env":
          this.cmdEnv(args, out, info);
          break;

        case "history":
          this.cmdHistory(out);
          break;

        case "save":
          await this.cmdSave(out, info, err, effects);
          break;

        case "load":
          await this.cmdLoad(out, info, err, effects);
          break;

        case "gpu":
          await this.cmdGpu(args, out, info, err, effects);
          break;

        // Filter commands used standalone (with no pipe input)
        case "grep": case "head": case "tail": case "wc":
        case "sort": case "uniq": case "cat":
          info(`'${op}' is a filter — use it after a pipe: cmd | ${op}`);
          break;

        default:
          err(`Unknown command: ${op}. Type 'help' for available commands.`);
      }
    } catch (e: unknown) {
      err(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }

    return { command: trimmed, lines, effects };
  }

  // ── Pipeline Filters ──────────────────────────────────────────────────

  /**
   * Apply a filter command to an array of ShellLines.
   * Filters operate only on the text content, preserving line kinds.
   */
  private applyFilter(filterCmd: string, input: readonly ShellLine[]): ShellLine[] {
    const [op, ...args] = filterCmd.trim().split(/\s+/);

    switch (op) {
      case "grep": {
        const pattern = args.join(" ");
        if (!pattern) return [...input];
        const flags = args[0]?.startsWith("-i") ? "i" : "";
        const searchPattern = flags ? args.slice(1).join(" ") : pattern;
        try {
          const re = new RegExp(searchPattern, flags);
          return input.filter(l => re.test(l.text));
        } catch {
          // Fallback to string includes
          const lower = searchPattern.toLowerCase();
          return input.filter(l => l.text.toLowerCase().includes(lower));
        }
      }

      case "head": {
        let n = 10;
        if (args[0] === "-n" && args[1]) n = parseInt(args[1], 10);
        else if (args[0]) n = parseInt(args[0], 10);
        return input.slice(0, Math.max(1, n));
      }

      case "tail": {
        let n = 10;
        if (args[0] === "-n" && args[1]) n = parseInt(args[1], 10);
        else if (args[0]) n = parseInt(args[0], 10);
        return input.slice(-Math.max(1, n));
      }

      case "wc": {
        const lineCount = input.length;
        const wordCount = input.reduce((s, l) => s + l.text.split(/\s+/).filter(Boolean).length, 0);
        const charCount = input.reduce((s, l) => s + l.text.length, 0);
        return [{ kind: "output", text: `  ${lineCount} lines  ${wordCount} words  ${charCount} chars` }];
      }

      case "sort": {
        const sorted = [...input].sort((a, b) => a.text.localeCompare(b.text));
        if (args[0] === "-r") sorted.reverse();
        return sorted;
      }

      case "uniq": {
        return input.filter((l, i) => i === 0 || l.text !== input[i - 1].text);
      }

      case "cat":
        return [...input];

      case "grep-v":
      case "grep -v": {
        const pattern = args.join(" ");
        if (!pattern) return [...input];
        return input.filter(l => !l.text.toLowerCase().includes(pattern.toLowerCase()));
      }

      default:
        return [
          ...input,
          { kind: "error" as const, text: `Unknown filter: ${op}` },
        ];
    }
  }

  // ── Command Implementations ──────────────────────────────────────────

  private cmdHelp(info: (t: string) => void): void {
    info("── Hologram OS Shell (vsh) ──────────────────────");
    info("  Operators:  cmd1 | cmd2    pipe output");
    info("              cmd > file     redirect to $file");
    info("              cmd > /dev/null  discard output");
    info("");
    for (const [, def] of Object.entries(COMMANDS)) {
      info(`  ${def.usage.padEnd(26)} ${def.description}`);
    }
    info("─────────────────────────────────────────────────");
  }

  private async cmdIngest(
    args: string[], out: (t: string) => void, effects: ShellEffects,
  ): Promise<void> {
    const text = args.join(" ") || "Hello, Hologram OS!";
    const result: IngestResult = await ingest(text) as IngestResult;
    out(`✓ Ingested ${result.envelope.format} (${result.envelope.byteLength} bytes)`);
    out(`  CID: ${result.proof.cid.slice(0, 40)}…`);
    out(`  DID: did:uor:${result.proof.cid.slice(0, 20)}…`);
    out(`  Projections: ${Object.keys(result.hologram.projections).length} standards`);
    effects.identity = result.identity;
  }

  private async cmdSpawn(
    args: string[], out: (t: string) => void, effects: ShellEffects,
  ): Promise<void> {
    const text = args.join(" ") || "Hologram Process";
    const result: IngestSpawnedResult = await ingestAndSpawn(
      this.engine, text, { label: text.slice(0, 32) },
    );
    this.blueprintMap.set(result.pid, result.blueprint);
    out(`✓ Spawned process PID: ${result.pid.slice(0, 24)}…`);
    out(`  Format: ${result.envelope.format} | ${result.envelope.byteLength} bytes`);
    out(`  Blueprint: ${result.blueprint.name}`);
    this.state.selectedPid = result.pid;
    effects.selectedPid = result.pid;
    effects.identity = result.identity;
    effects.processCount = this.engine.processCount;
    effects.spawnedBlueprint = { pid: result.pid, blueprint: result.blueprint };
  }

  private cmdPs(
    out: (t: string) => void, info: (t: string) => void, effects: ShellEffects,
  ): void {
    const pids = vPs(this.engine);
    if (pids.length === 0) {
      info("No running processes.");
    } else {
      out("PID                       STATUS   TICKS  HISTORY");
      out("─────────────────────────  ───────  ─────  ───────");
      for (const pid of pids) {
        const s = vStat(this.engine, pid);
        out(
          `${s.pid.slice(0, 24).padEnd(25)} ${s.status.padEnd(8)} ${String(s.tickCount).padEnd(6)} ${s.historyLength}`,
        );
      }
    }
    effects.processCount = this.engine.processCount;
  }

  private cmdStat(
    args: string[], out: (t: string) => void, err: (t: string) => void,
  ): void {
    const pid = args[0] || this.state.selectedPid;
    if (!pid) { err("Usage: stat <pid>"); return; }
    const resolved = resolvePid(this.engine, pid);
    const s = vStat(this.engine, resolved);
    out(`PID:     ${s.pid.slice(0, 40)}…`);
    out(`Status:  ${s.status}`);
    out(`Ticks:   ${s.tickCount}`);
    out(`History: ${s.historyLength} interactions`);
    out(`Spawned: ${s.spawnedAt}`);
  }

  private async cmdTick(
    args: string[], out: (t: string) => void, err: (t: string) => void,
    effects: ShellEffects,
  ): Promise<void> {
    const pid = args[0] || this.state.selectedPid;
    if (!pid) { err("Usage: tick [pid] [position] [direction]"); return; }
    const resolved = resolvePid(this.engine, pid);
    const pos = parseInt(args[1] ?? "0", 10);
    const dir = parseInt(args[2] ?? String(DIRECTIONS.VERIFIED), 10);
    const tick = await vIoctl(this.engine, resolved, pos, dir);
    effects.tick = tick;
    effects.identity = tick.identity;
    out(`✓ Tick #${tick.sequence} on ${tick.pid.slice(0, 20)}…`);
    out(`  Halted: ${tick.halted} | Projections: ${tick.projections.size}`);
    if (tick.interaction) {
      out(`  Interaction: step=${tick.interaction.step.position} changed=${tick.interaction.interfaceChanged}`);
    }
  }

  private async cmdMmap(
    args: string[], out: (t: string) => void, err: (t: string) => void,
  ): Promise<void> {
    const pid = args[0] || this.state.selectedPid;
    const proj = args[1] ?? "did";
    if (!pid) { err("Usage: mmap [pid] <projection>"); return; }
    const resolved = resolvePid(this.engine, pid);
    const result = await vMmap(this.engine, resolved, proj);
    out(`✓ mmap ${proj}:`);
    out(`  ${result.address}`);
    out(`  Fidelity: ${result.fidelity} | Spec: ${result.spec}`);
  }

  private async cmdMmapAll(
    args: string[], out: (t: string) => void, info: (t: string) => void,
    err: (t: string) => void, effects: ShellEffects,
  ): Promise<void> {
    const pid = args[0] || this.state.selectedPid;
    if (!pid) { err("Usage: mmapall [pid]"); return; }
    const resolved = resolvePid(this.engine, pid);
    const all = await vMmapAll(this.engine, resolved);
    const arr = [...all.entries()];
    out(`✓ ${arr.length} projections for ${resolved.slice(0, 20)}…`);
    const shown = arr.slice(0, 12);
    for (const [name, mmap] of shown) {
      const addr = mmap.address.length > 50
        ? mmap.address.slice(0, 50) + "…"
        : mmap.address;
      out(`  ${name.padEnd(18)} ${addr}`);
    }
    if (arr.length > 12) {
      info(`  … and ${arr.length - 12} more`);
    }
    effects.projections = arr.map(([, v]) => v);
    if (arr[0]) effects.identity = arr[0][1].identity;
  }

  private async cmdSelect(
    args: string[], out: (t: string) => void, err: (t: string) => void,
    effects: ShellEffects,
  ): Promise<void> {
    const pid = args[0];
    if (!pid) { err("Usage: select <pid>"); return; }
    const resolved = resolvePid(this.engine, pid);
    this.state.selectedPid = resolved;
    effects.selectedPid = resolved;
    out(`✓ Selected: ${resolved.slice(0, 30)}…`);
    const tick = await this.engine.tick(resolved);
    effects.identity = tick.identity;
    effects.tick = tick;
  }

  private cmdKill(
    args: string[], out: (t: string) => void, err: (t: string) => void,
    effects: ShellEffects,
  ): void {
    const pid = args[0] || this.state.selectedPid;
    if (!pid) { err("Usage: kill [pid]"); return; }
    const resolved = resolvePid(this.engine, pid);
    vKill(this.engine, resolved);
    out(`✓ Killed: ${resolved.slice(0, 30)}…`);
    if (this.state.selectedPid === resolved) {
      this.state.selectedPid = null;
      effects.selectedPid = null;
      effects.identity = null;
      effects.tick = null;
    }
    effects.processCount = this.engine.processCount;
  }

  private async cmdFork(
    args: string[], out: (t: string) => void, err: (t: string) => void,
    effects: ShellEffects,
  ): Promise<void> {
    const pid = args[0] || this.state.selectedPid;
    if (!pid) { err("Usage: fork [pid]"); return; }
    const resolved = resolvePid(this.engine, pid);
    const bp = this.blueprintMap.get(resolved);
    if (!bp) { err(`No blueprint tracked for PID ${resolved.slice(0, 20)}…`); return; }

    // Fork = spawn the same blueprint (new session, same program)
    const { forkExecutableBlueprint } = await import("./executable-blueprint");
    const child = forkExecutableBlueprint(bp, {
      name: `${bp.name} (fork)`,
    });
    const childPid = await this.engine.spawn(child);
    this.blueprintMap.set(childPid, child);
    out(`✓ Forked ${resolved.slice(0, 20)}… → ${childPid.slice(0, 24)}…`);
    this.state.selectedPid = childPid;
    effects.selectedPid = childPid;
    effects.processCount = this.engine.processCount;
    effects.spawnedBlueprint = { pid: childPid, blueprint: child };
  }

  private cmdEnv(
    args: string[], out: (t: string) => void, info: (t: string) => void,
  ): void {
    if (args.length === 0) {
      // Print all env vars
      for (const [k, v] of Object.entries(this.state.env)) {
        out(`${k}=${v}`);
      }
      return;
    }
    if (args.length === 1) {
      // Get specific var
      const val = this.state.env[args[0]];
      if (val !== undefined) out(`${args[0]}=${val}`);
      else info(`${args[0]}: not set`);
      return;
    }
    // Set var
    this.state.env[args[0]] = args.slice(1).join(" ");
    out(`${args[0]}=${this.state.env[args[0]]}`);
  }

  private cmdHistory(out: (t: string) => void): void {
    if (this.state.history.length === 0) {
      out("(empty history)");
      return;
    }
    this.state.history.slice(0, 20).forEach((cmd, i) => {
      out(`  ${String(i + 1).padStart(3)}  ${cmd}`);
    });
  }

  private async cmdSave(
    out: (t: string) => void, info: (t: string) => void,
    err: (t: string) => void, effects: ShellEffects,
  ): Promise<void> {
    if (!this.onSave) { err("Persistence not configured."); return; }
    info("Saving all processes…");
    const count = await this.onSave(this.engine, this.blueprintMap);
    if (count > 0) {
      out(`✓ Saved ${count} process(es) to persistent storage.`);
      info("  Processes will be restored on next page load.");
      effects.persistedCount = count;
    } else {
      info("No running processes to save.");
    }
  }

  private async cmdLoad(
    out: (t: string) => void, info: (t: string) => void,
    err: (t: string) => void, effects: ShellEffects,
  ): Promise<void> {
    if (!this.onLoad) { err("Persistence not configured."); return; }
    info("Loading persisted sessions…");
    const { pids, blueprintMap } = await this.onLoad(this.engine);
    for (const [pid, bp] of blueprintMap) {
      this.blueprintMap.set(pid, bp);
    }
    effects.processCount = this.engine.processCount;
    if (pids.length > 0) {
      this.state.selectedPid = pids[0];
      effects.selectedPid = pids[0];
      const tick = await this.engine.tick(pids[0]);
      effects.identity = tick.identity;
      effects.tick = tick;
      effects.persistedCount = pids.length;
      out(`✓ Restored ${pids.length} process(es).`);
    } else {
      info("No saved sessions found.");
    }
  }

  // ── GPU Commands ────────────────────────────────────────────────────────

  private async cmdGpu(
    args: string[], out: (t: string) => void, info: (t: string) => void,
    err: (t: string) => void, effects: ShellEffects,
  ): Promise<void> {
    const sub = args[0] ?? "info";
    const gpu = getHologramGpu();

    switch (sub) {
      case "info": {
        const devInfo = await gpu.init();
        out("── GPU Device (/dev/gpu) ─────────────────────");
        out(`  Status:       ${devInfo.status}`);
        out(`  Adapter:      ${devInfo.adapterName}`);
        out(`  Vendor:       ${devInfo.vendor}`);
        out(`  Architecture: ${devInfo.architecture}`);
        out(`  Max Buffer:   ${(devInfo.maxBufferSize / 1048576).toFixed(0)} MB`);
        out(`  Workgroup:    ${devInfo.maxWorkgroupSizeX}×${devInfo.maxWorkgroupSizeY}×${devInfo.maxWorkgroupSizeZ}`);
        out(`  Bind Groups:  ${devInfo.maxBindGroups}`);
        out("──────────────────────────────────────────────");
        break;
      }

      case "bench": {
        info("Running GPU benchmark…");
        await gpu.init();
        if (!gpu.isReady) { err("GPU unavailable — cannot benchmark."); return; }
        const bench = await gpu.benchmark();
        out("── GPU Benchmark Results ─────────────────────");
        out(`  MatMul (128×128): ${bench.matmulGflops} GFLOPS`);
        out(`  Bandwidth:        ${bench.bandwidthGBps} GB/s`);
        out(`  Shader Compile:   ${bench.compileTimeMs} ms`);
        out(`  Total Time:       ${bench.totalTimeMs} ms`);
        out("──────────────────────────────────────────────");
        effects.gpuBenchmark = bench;
        break;
      }

      case "matmul": {
        const size = parseInt(args[1] ?? "64", 10);
        info(`Running ${size}×${size} matrix multiply on GPU…`);
        await gpu.init();
        const a = new Float32Array(size * size);
        const b = new Float32Array(size * size);
        for (let i = 0; i < a.length; i++) { a[i] = Math.random(); b[i] = Math.random(); }
        const r = await gpu.matmul(a, b, size, size, size);
        out(`✓ MatMul ${size}×${size}: ${r.timeMs} ms (${r.gflops.toFixed(2)} GFLOPS)`);
        out(`  GPU accelerated: ${gpu.isReady}`);
        break;
      }

      case "relu": {
        const len = parseInt(args[1] ?? "1024", 10);
        info(`Running ReLU on ${len} elements…`);
        await gpu.init();
        const input = new Float32Array(len);
        for (let i = 0; i < len; i++) input[i] = Math.random() * 2 - 1;
        const start = performance.now();
        const result = await gpu.relu(input);
        const ms = Math.round((performance.now() - start) * 100) / 100;
        const negCount = Array.from(result).filter(v => v === 0).length;
        out(`✓ ReLU: ${ms} ms — ${negCount}/${len} values clamped to 0`);
        break;
      }

      default:
        err(`Unknown gpu subcommand: ${sub}`);
        info("  Usage: gpu info | gpu bench | gpu matmul [size] | gpu relu [size]");
    }
  }
}
