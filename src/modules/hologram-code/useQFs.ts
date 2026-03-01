/**
 * useQFs — React hook bridging Q-FS Merkle DAG to Hologram Code
 * ══════════════════════════════════════════════════════════════
 *
 * Initializes a Q-FS instance, seeds it with workspace files,
 * and exposes a reactive file tree + read/write operations.
 *
 * **Persistence**: The Merkle DAG is serialized to localStorage
 * after every mutation (debounced 500ms), so the workspace
 * survives page reloads. Authenticated users also get cloud
 * sync via the Data Bank.
 *
 * Every file operation flows through Q-FS:
 *   open file  → qfs.readFile(path)  → Uint8Array → string
 *   save file  → qfs.writeFile(path) → new CID (immutable)
 *   ls folder  → qfs.ls(path)        → {name, cid, type}[]
 *
 * The file tree is rebuilt from Q-FS after every mutation,
 * ensuring the explorer always reflects the Merkle DAG state.
 *
 * @module hologram-code/useQFs
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { QFs, type InodeType } from "@/hologram/kernel/q-fs";
import { QMmu } from "@/hologram/kernel/q-mmu";
import { encodeUtf8 } from "@/hologram/genesis/axiom-ring";

// ── Persistence constants ───────────────────────────────────────────────────
const QFS_STORAGE_KEY = "uor:qfs:workspace";
const QFS_VERSION_KEY = "uor:qfs:version";
const PERSIST_DEBOUNCE_MS = 500;
const QFS_SCHEMA_VERSION = 1;

interface PersistedWorkspace {
  version: number;
  files: { path: string; content: string }[];
  savedAt: string;
}

/** Serialize the entire Q-FS tree into a flat file list */
function serializeFs(fs: QFs): PersistedWorkspace {
  const files: { path: string; content: string }[] = [];

  function walk(dirPath: string): void {
    const entries = fs.ls(dirPath);
    for (const entry of entries) {
      const childPath = dirPath === "/" ? `/${entry.name}` : `${dirPath}/${entry.name}`;
      if (entry.type === "directory") {
        walk(childPath);
      } else {
        const bytes = fs.readFile(childPath, 0);
        if (bytes) {
          files.push({ path: childPath, content: new TextDecoder().decode(bytes) });
        }
      }
    }
  }

  walk("/");
  return { version: QFS_SCHEMA_VERSION, files, savedAt: new Date().toISOString() };
}

/** Persist to localStorage */
function persistToLocal(fs: QFs): void {
  try {
    const snapshot = serializeFs(fs);
    localStorage.setItem(QFS_STORAGE_KEY, JSON.stringify(snapshot));
    localStorage.setItem(QFS_VERSION_KEY, String(QFS_SCHEMA_VERSION));
  } catch (e) {
    console.warn("[Q-FS Persist] Failed to save:", e);
  }
}

/** Load persisted workspace from localStorage */
function loadFromLocal(): PersistedWorkspace | null {
  try {
    const raw = localStorage.getItem(QFS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWorkspace;
    if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Public types ────────────────────────────────────────────────────────────

export interface FSNode {
  name: string;
  type: "file" | "folder";
  children?: FSNode[];
  content?: string;
  path: string;
}

export interface QFsHandle {
  /** The live file tree derived from Q-FS */
  tree: FSNode[];
  /** Read a file's content as string */
  readFile: (path: string) => string | null;
  /** Write content to an existing file (creates new CID) */
  writeFile: (path: string, content: string) => boolean;
  /** Create a new file */
  createFile: (parentPath: string, name: string, content: string) => boolean;
  /** Create a new directory */
  mkdir: (parentPath: string, name: string) => boolean;
  /** Delete a file or empty directory */
  rm: (path: string) => boolean;
  /** Q-FS stats (inode count, total bytes, journal length) */
  stats: { totalInodes: number; totalFiles: number; totalBytes: number; journalLength: number };
  /** Root CID of the filesystem */
  rootCid: string | null;
  /** Whether Q-FS is initialized */
  ready: boolean;
  /** Clear persisted data and re-seed default workspace files */
  resetWorkspace: () => void;
}

// ── Workspace seed files ────────────────────────────────────────────────────
// These are the initial project files seeded into Q-FS on first mount.
// In Phase 2 these will come from persistent storage / CID rehydration.

const SEED_FILES: { path: string; content: string }[] = [
  {
    path: "/src/main.ts",
    content: `/**
 * Hologram Code — Main Entry Point
 * ═════════════════════════════════
 *
 * Welcome to Hologram Code, the native code editor
 * running on Q-Linux inside the Hologram OS.
 *
 * This is Monaco Editor — the same engine that powers
 * Visual Studio Code. Every keystroke, every shortcut,
 * every feature you know works exactly the same here.
 *
 * Try:
 *   Ctrl+Shift+P  → Command Palette
 *   Ctrl+P        → Quick Open
 *   Ctrl+D        → Select next occurrence
 *   Ctrl+/        → Toggle comment
 *   Ctrl+Backtick → Toggle terminal
 */

import { boot } from "./kernel";
import { createProjection } from "./projection";
import type { HologramConfig } from "./types";

const config: HologramConfig = {
  name: "hologram-code",
  version: "1.0.0",
  kernel: "q-linux",
  projection: "monaco",
};

async function main(): Promise<void> {
  console.log("⬡ Booting Hologram Code...");
  
  const kernel = await boot(config);
  const surface = createProjection(kernel);
  
  surface.mount(document.getElementById("root")!);
  
  console.log("✓ Hologram Code is live.");
}

main().catch(console.error);
`,
  },
  {
    path: "/src/kernel.ts",
    content: `/**
 * Q-Linux Kernel Interface
 * ════════════════════════
 *
 * Provides the bridge between the editor and the
 * Q-Linux kernel running in the Hologram OS.
 */

export interface KernelInstance {
  readonly pid: number;
  readonly cid: string;
  readonly hScore: number;
  exec(command: string): Promise<string>;
  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array): Promise<void>;
}

export async function boot(config: Record<string, unknown>): Promise<KernelInstance> {
  const ring = verifyRing();
  const topology = await hydrateTopology(ring);
  
  return {
    pid: 1,
    cid: "baguqeera...",
    hScore: 1.0,
    exec: async (cmd) => "$ " + cmd + "\\n(executed)",
    read: async () => new Uint8Array(),
    write: async () => {},
  };
}

function verifyRing(): boolean {
  for (let x = 0; x < 256; x++) {
    const neg = (256 - x) & 0xff;
    const bnot = x ^ 0xff;
    if (neg !== ((bnot + 1) & 0xff)) return false;
  }
  return true;
}

async function hydrateTopology(ring: boolean): Promise<void> {
  if (!ring) throw new Error("Ring coherence failed");
}
`,
  },
  {
    path: "/src/types.ts",
    content: `/**
 * Core Type Definitions
 */

export interface HologramConfig {
  name: string;
  version: string;
  kernel: string;
  projection: string;
  features?: string[];
}

export interface ProjectionSurface {
  mount(root: HTMLElement): void;
  unmount(): void;
  resize(width: number, height: number): void;
}

export type CoherenceZone = "convergent" | "exploring" | "divergent";

export interface ProcessState {
  pid: number;
  name: string;
  zone: CoherenceZone;
  hScore: number;
  memoryUsage: number;
}
`,
  },
  {
    path: "/src/projection.ts",
    content: `/**
 * Projection Surface
 * ══════════════════
 *
 * Creates the rendering surface for the editor.
 */

import type { ProjectionSurface } from "./types";

export function createProjection(kernel: unknown): ProjectionSurface {
  return {
    mount(root: HTMLElement) {
      root.innerHTML = "";
      console.log("Projection surface mounted");
    },
    unmount() {
      console.log("Projection surface unmounted");
    },
    resize(w: number, h: number) {
      console.log("Resized to " + w + "x" + h);
    },
  };
}
`,
  },
  {
    path: "/src/components/App.tsx",
    content: `/**
 * App Component — Root projection surface
 */

import React from "react";

interface AppProps {
  children?: React.ReactNode;
}

export default function App({ children }: AppProps) {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Hologram</h1>
      </header>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
`,
  },
  {
    path: "/src/utils/hash.ts",
    content: `/**
 * Hash Utilities — Content-addressed helpers
 */

export function shortCid(cid: string, len = 8): string {
  return cid.length > len * 2
    ? cid.slice(0, len) + "…" + cid.slice(-len)
    : cid;
}

export function cidEquals(a: string, b: string): boolean {
  return a === b;
}

export function isValidCid(cid: string): boolean {
  return /^[a-z0-9]+$/i.test(cid) && cid.length >= 46;
}
`,
  },
  {
    path: "/package.json",
    content: `{
  "name": "hologram-workspace",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
`,
  },
  {
    path: "/tsconfig.json",
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
`,
  },
  {
    path: "/README.md",
    content: `# Hologram Workspace

Welcome to your Hologram Code workspace.

This editor runs natively on **Q-Linux** inside the Hologram OS.
It uses the **Monaco Editor** engine — the same core that powers
Visual Studio Code.

## Features

- Full syntax highlighting for 50+ languages
- IntelliSense & autocomplete
- Multi-cursor editing
- Find & replace with regex
- Code folding & bracket matching
- Minimap navigation
- Command Palette (Ctrl+Shift+P)
- Integrated terminal

## Q-FS Integration

Every file in this workspace is stored in the Q-FS Merkle DAG:
- Each file is a content-addressed inode (CID)
- Edits create new CIDs (immutable history)
- The journal records every operation as a hash-linked chain

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save (creates new CID) |
| Ctrl+P | Quick Open |
| Ctrl+Shift+P | Command Palette |
| Ctrl+/ | Toggle Comment |
| Ctrl+D | Select Next Occurrence |
| Alt+↑/↓ | Move Line Up/Down |
| Ctrl+Shift+K | Delete Line |
`,
  },
  // ── Quantum sample files ──────────────────────────────────────────
  {
    path: "/quantum/bell-state.qasm",
    content: `// Bell State — OpenQASM 3.0
OPENQASM 3.0;
include "stdgates.inc";

qubit[2] q;
bit[2] c;

// Create Bell pair |Φ+⟩ = (|00⟩ + |11⟩) / √2
h q[0];
cx q[0], q[1];

// Measure both qubits
c = measure q;
`,
  },
  {
    path: "/quantum/grover.qs",
    content: `/// Grover's Search Algorithm — Q#
namespace Quantum.Grover {
    open Microsoft.Quantum.Canon;
    open Microsoft.Quantum.Intrinsic;
    open Microsoft.Quantum.Measurement;

    operation GroverSearch(nQubits : Int, iterations : Int) : Result[] {
        use qubits = Qubit[nQubits];

        // Initialize superposition
        ApplyToEach(H, qubits);

        for _ in 1..iterations {
            // Oracle (mark target state)
            Oracle(qubits);
            // Diffusion operator
            DiffusionOperator(qubits);
        }

        return ForEach(MResetZ, qubits);
    }

    operation Oracle(qubits : Qubit[]) : Unit is Adj + Ctl {
        Controlled Z(Most(qubits), Tail(qubits));
    }

    operation DiffusionOperator(qubits : Qubit[]) : Unit {
        ApplyToEach(H, qubits);
        ApplyToEach(X, qubits);
        Controlled Z(Most(qubits), Tail(qubits));
        ApplyToEach(X, qubits);
        ApplyToEach(H, qubits);
    }
}
`,
  },
  // ── Systems sample files ──────────────────────────────────────────
  {
    path: "/examples/fibonacci.zig",
    content: `const std = @import("std");

pub fn fibonacci(n: u64) u64 {
    if (n <= 1) return n;

    var prev: u64 = 0;
    var curr: u64 = 1;

    for (2..n + 1) |_| {
        const next = prev + curr;
        prev = curr;
        curr = next;
    }
    return curr;
}

test "fibonacci" {
    try std.testing.expectEqual(fibonacci(10), 55);
    try std.testing.expectEqual(fibonacci(0), 0);
    try std.testing.expectEqual(fibonacci(1), 1);
}
`,
  },
  {
    path: "/examples/token.sol",
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HologramToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10 ** 18;

    constructor()
        ERC20("Hologram", "HOLO")
        Ownable(msg.sender)
    {
        _mint(msg.sender, MAX_SUPPLY);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
`,
  },
  {
    path: "/examples/pipeline.ex",
    content: `defmodule Hologram.Pipeline do
  @moduledoc \"\"\"
  Data transformation pipeline using Elixir pipes.
  \"\"\"

  def transform(data) when is_list(data) do
    data
    |> Enum.map(&process_item/1)
    |> Enum.filter(&valid?/1)
    |> Enum.sort_by(& &1.score, :desc)
    |> Enum.take(10)
  end

  defp process_item(%{raw: raw} = item) do
    score = raw
    |> String.downcase()
    |> String.split()
    |> length()

    %{item | score: score}
  end

  defp valid?(%{score: score}), do: score > 0
end
`,
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a path like "/src/main.ts" → { dirs: ["src"], file: "main.ts" } */
function parsePath(path: string): { dirs: string[]; file: string | null } {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { dirs: [], file: null };
  const last = parts[parts.length - 1];
  // If has extension, treat as file
  if (last.includes(".")) {
    return { dirs: parts.slice(0, -1), file: last };
  }
  return { dirs: parts, file: null };
}

/** Recursively build FSNode tree from Q-FS ls() calls */
function buildTree(fs: QFs, dirPath: string): FSNode[] {
  const entries = fs.ls(dirPath);
  const nodes: FSNode[] = [];

  for (const entry of entries) {
    const childPath = dirPath === "/" ? `/${entry.name}` : `${dirPath}/${entry.name}`;

    if (entry.type === "directory") {
      nodes.push({
        name: entry.name,
        type: "folder",
        path: childPath,
        children: buildTree(fs, childPath),
      });
    } else {
      // Read content for display
      const bytes = fs.readFile(childPath, 0);
      const content = bytes ? new TextDecoder().decode(bytes) : "";
      nodes.push({
        name: entry.name,
        type: "file",
        path: childPath,
        content,
      });
    }
  }

  // Sort: folders first, then alphabetical
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useQFs(): QFsHandle {
  const fsRef = useRef<QFs | null>(null);
  const mmuRef = useRef<QMmu | null>(null);
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Q-FS once — restore from persistence or seed defaults
  useEffect(() => {
    if (fsRef.current) return;

    const mmu = new QMmu();
    const fs = new QFs(mmu);
    fs.mkfs(0);

    // Try to restore from persisted workspace first
    const persisted = loadFromLocal();
    const filesToLoad = persisted ? persisted.files : SEED_FILES.map(s => ({ path: s.path, content: s.content }));

    if (persisted) {
      console.log(`⬡ Q-FS: Restoring ${persisted.files.length} files from persistent storage (saved ${persisted.savedAt})`);
    }

    for (const seed of filesToLoad) {
      const { dirs, file } = parsePath(seed.path);

      let currentPath = "/";
      for (const dir of dirs) {
        const existing = fs.ls(currentPath);
        if (!existing.some(e => e.name === dir && e.type === "directory")) {
          fs.mkdir(currentPath, dir, 0);
        }
        currentPath = currentPath === "/" ? `/${dir}` : `${currentPath}/${dir}`;
      }

      if (file) {
        const content = encodeUtf8(seed.content);
        fs.createFile(currentPath, file, content, 0);
      }
    }

    fsRef.current = fs;
    mmuRef.current = mmu;
    setReady(true);
    setVersion(1);

    // If this was a fresh seed (no persistence), persist immediately
    if (!persisted) {
      persistToLocal(fs);
    }
  }, []);

  // Debounced persistence after every mutation
  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      if (fsRef.current) {
        persistToLocal(fsRef.current);
      }
    }, PERSIST_DEBOUNCE_MS);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      // Final flush on unmount
      if (fsRef.current) persistToLocal(fsRef.current);
    };
  }, []);

  // Bump version to trigger tree rebuild + schedule persistence
  const bump = useCallback(() => {
    setVersion(v => v + 1);
    schedulePersist();
  }, [schedulePersist]);

  // Build tree from Q-FS (reactive via version)
  const tree = useMemo(() => {
    if (!fsRef.current || !ready) return [];
    return buildTree(fsRef.current, "/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ready]);

  const readFile = useCallback((path: string): string | null => {
    if (!fsRef.current) return null;
    const bytes = fsRef.current.readFile(path, 0);
    if (!bytes) return null;
    return new TextDecoder().decode(bytes);
  }, []);

  const writeFile = useCallback((path: string, content: string): boolean => {
    if (!fsRef.current) return false;
    const result = fsRef.current.writeFile(path, encodeUtf8(content), 0);
    if (result) bump();
    return !!result;
  }, [bump]);

  const createFile = useCallback((parentPath: string, name: string, content: string): boolean => {
    if (!fsRef.current) return false;
    try {
      fsRef.current.createFile(parentPath, name, encodeUtf8(content), 0);
      bump();
      return true;
    } catch {
      return false;
    }
  }, [bump]);

  const mkdir = useCallback((parentPath: string, name: string): boolean => {
    if (!fsRef.current) return false;
    try {
      fsRef.current.mkdir(parentPath, name, 0);
      bump();
      return true;
    } catch {
      return false;
    }
  }, [bump]);

  const rm = useCallback((path: string): boolean => {
    if (!fsRef.current) return false;
    const result = fsRef.current.rm(path, 0);
    if (result) bump();
    return result;
  }, [bump]);

  const stats = useMemo(() => {
    if (!fsRef.current) return { totalInodes: 0, totalFiles: 0, totalBytes: 0, journalLength: 0 };
    const s = fsRef.current.stats();
    return { totalInodes: s.totalInodes, totalFiles: s.totalFiles, totalBytes: s.totalBytes, journalLength: s.journalLength };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ready]);

  const rootCid = fsRef.current?.getRootCid() ?? null;

  const resetWorkspace = useCallback(() => {
    // Clear persisted data
    localStorage.removeItem(QFS_STORAGE_KEY);
    localStorage.removeItem(QFS_VERSION_KEY);

    // Re-initialize Q-FS with seed files
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    fs.mkfs(0);

    for (const seed of SEED_FILES) {
      const { dirs, file } = parsePath(seed.path);
      let currentPath = "/";
      for (const dir of dirs) {
        const existing = fs.ls(currentPath);
        if (!existing.some(e => e.name === dir && e.type === "directory")) {
          fs.mkdir(currentPath, dir, 0);
        }
        currentPath = currentPath === "/" ? `/${dir}` : `${currentPath}/${dir}`;
      }
      if (file) {
        fs.createFile(currentPath, file, encodeUtf8(seed.content), 0);
      }
    }

    fsRef.current = fs;
    mmuRef.current = mmu;
    persistToLocal(fs);
    setVersion(v => v + 1);
    console.log("⬡ Q-FS: Workspace reset to defaults");
  }, []);

  return { tree, readFile, writeFile, createFile, mkdir, rm, stats, rootCid, ready, resetWorkspace };
}
