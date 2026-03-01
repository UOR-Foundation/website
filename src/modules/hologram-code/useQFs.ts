/**
 * useQFs — React hook bridging Q-FS Merkle DAG to Hologram Code
 * ══════════════════════════════════════════════════════════════
 *
 * Initializes a Q-FS instance, seeds it with workspace files,
 * and exposes a reactive file tree + read/write operations.
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

  // Initialize Q-FS once
  useEffect(() => {
    if (fsRef.current) return;

    const mmu = new QMmu();
    const fs = new QFs(mmu);

    // mkfs — create root filesystem
    fs.mkfs(0);

    // Seed files: ensure directories exist, then create files
    for (const seed of SEED_FILES) {
      const { dirs, file } = parsePath(seed.path);

      // Ensure all parent directories exist
      let currentPath = "/";
      for (const dir of dirs) {
        const existing = fs.ls(currentPath);
        if (!existing.some(e => e.name === dir && e.type === "directory")) {
          fs.mkdir(currentPath, dir, 0);
        }
        currentPath = currentPath === "/" ? `/${dir}` : `${currentPath}/${dir}`;
      }

      // Create the file
      if (file) {
        const content = encodeUtf8(seed.content);
        fs.createFile(currentPath, file, content, 0);
      }
    }

    fsRef.current = fs;
    mmuRef.current = mmu;
    setReady(true);
    setVersion(1);
  }, []);

  // Bump version to trigger tree rebuild
  const bump = useCallback(() => setVersion(v => v + 1), []);

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

  return { tree, readFile, writeFile, createFile, mkdir, rm, stats, rootCid, ready };
}
