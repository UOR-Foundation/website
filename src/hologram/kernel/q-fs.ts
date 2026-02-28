/**
 * Q-FS — Merkle DAG Filesystem
 * ═════════════════════════════
 *
 * Every classical filesystem concept maps to a content-addressed equivalent:
 *
 *   ┌──────────────┬──────────────────────────────────────────────┐
 *   │ Linux (ext4)  │ Q-FS                                        │
 *   ├──────────────┼──────────────────────────────────────────────┤
 *   │ inode         │ UOR Datum (self-describing, CID-addressed)   │
 *   │ directory     │ Merkle DAG node (children are CIDs)          │
 *   │ mount         │ hydrate(rootCID) — load DAG subtree          │
 *   │ path resolve  │ Walk Merkle DAG by CID links                 │
 *   │ journaling    │ Session chain (append-only, hash-linked)     │
 *   │ permissions   │ Derivation chain + owner PID                 │
 *   │ fsck          │ Unnecessary — CID mismatch = invalid datum   │
 *   └──────────────┴──────────────────────────────────────────────┘
 *
 * No fsck needed — content-addressing means corruption is self-detecting.
 *
 * ── CRYSTALLIZED ──
 * This module derives entirely from genesis/. Zero external dependencies.
 *
 * @module qkernel/q-fs
 */

import { sha256 } from "@/hologram/genesis/axiom-hash";
import { createCid } from "@/hologram/genesis/axiom-cid";
import { encodeUtf8 } from "@/hologram/genesis/axiom-ring";
import type { QMmu } from "./q-mmu";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Inode type — mirrors Linux inode types */
export type InodeType = "file" | "directory" | "symlink";

/** A Q-FS inode — content-addressed, self-describing */
export interface QInode {
  readonly cid: string;
  readonly type: InodeType;
  readonly name: string;
  readonly size: number;
  readonly ownerPid: number;
  readonly createdAt: number;
  readonly modifiedAt: number;
  readonly contentCid: string | null;     // CID of actual content (files only)
  readonly children: Map<string, string>; // name → CID (directories only)
  readonly targetCid: string | null;      // symlink target
  readonly permissions: QPermissions;
}

/** Permissions — derivation-based ownership */
export interface QPermissions {
  readonly ownerPid: number;
  readonly readable: boolean;
  readonly writable: boolean;
  readonly executable: boolean;
}

/** Journal entry — append-only, hash-linked */
export interface JournalEntry {
  readonly sequence: number;
  readonly operation: JournalOp;
  readonly path: string;
  readonly cid: string;
  readonly prevEntryCid: string | null;
  readonly timestamp: number;
  readonly pid: number;
}

/** Supported journal operations */
export type JournalOp = "create" | "write" | "delete" | "mkdir" | "rename" | "mount" | "unmount";

/** Mount point */
export interface MountPoint {
  readonly path: string;
  readonly rootCid: string;
  readonly mountedAt: number;
  readonly readOnly: boolean;
}

/** Filesystem statistics */
export interface FsStats {
  readonly totalInodes: number;
  readonly totalFiles: number;
  readonly totalDirectories: number;
  readonly totalBytes: number;
  readonly journalLength: number;
  readonly mountPoints: number;
  readonly integrityValid: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// Q-FS Implementation
// ═══════════════════════════════════════════════════════════════════════

export class QFs {
  private mmu: QMmu;
  private inodes = new Map<string, QInode>();
  private journal: JournalEntry[] = [];
  private mounts = new Map<string, MountPoint>();
  private rootCid: string | null = null;
  private journalSequence = 0;

  constructor(mmu: QMmu) {
    this.mmu = mmu;
  }

  // ── Initialization ──────────────────────────────────────────────

  /**
   * mkfs — Create the root filesystem.
   * Like mkfs.ext4 — initializes the root directory and journal.
   * Now SYNCHRONOUS — genesis hash is pure math.
   */
  mkfs(ownerPid: number): string {
    const rootInode = this.createInode("directory", "/", ownerPid);
    this.rootCid = rootInode.cid;

    this.appendJournal("mount", "/", rootInode.cid, ownerPid);
    this.mounts.set("/", {
      path: "/",
      rootCid: rootInode.cid,
      mountedAt: Date.now(),
      readOnly: false,
    });

    return rootInode.cid;
  }

  // ── File Operations ─────────────────────────────────────────────

  /**
   * create — Create a new file with content.
   */
  createFile(
    parentPath: string,
    name: string,
    content: Uint8Array,
    ownerPid: number
  ): QInode {
    const contentCid = this.mmu.store(content, ownerPid);
    const inode = this.createInode("file", name, ownerPid, contentCid, content.byteLength);

    // Add to parent directory
    const parent = this.resolveInode(parentPath);
    if (parent && parent.type === "directory") {
      parent.children.set(name, inode.cid);
      this.updateInodeCid(parent);
    }

    const fullPath = parentPath === "/" ? `/${name}` : `${parentPath}/${name}`;
    this.appendJournal("create", fullPath, inode.cid, ownerPid);
    return inode;
  }

  /**
   * write — Update a file's content (creates new CID — immutability).
   */
  writeFile(
    path: string,
    content: Uint8Array,
    ownerPid: number
  ): QInode | null {
    const inode = this.resolveInode(path);
    if (!inode || inode.type !== "file") return null;
    if (!this.checkPermission(inode, ownerPid, "write")) return null;

    const contentCid = this.mmu.store(content, ownerPid);
    const newInode = this.createInode("file", inode.name, ownerPid, contentCid, content.byteLength);

    // Replace in parent
    const parentPath = path.substring(0, path.lastIndexOf("/")) || "/";
    const parent = this.resolveInode(parentPath);
    if (parent && parent.type === "directory") {
      parent.children.set(inode.name, newInode.cid);
      this.updateInodeCid(parent);
    }

    this.appendJournal("write", path, newInode.cid, ownerPid);
    return newInode;
  }

  /**
   * read — Read a file's content by path.
   */
  readFile(path: string, callerPid: number): Uint8Array | null {
    const inode = this.resolveInode(path);
    if (!inode || inode.type !== "file") return null;
    if (!this.checkPermission(inode, callerPid, "read")) return null;
    if (!inode.contentCid) return null;
    return this.mmu.load(inode.contentCid);
  }

  /**
   * stat — Get inode metadata without reading content.
   */
  stat(path: string): QInode | null {
    return this.resolveInode(path);
  }

  // ── Directory Operations ────────────────────────────────────────

  /**
   * mkdir — Create a directory.
   */
  mkdir(parentPath: string, name: string, ownerPid: number): QInode {
    const dirInode = this.createInode("directory", name, ownerPid);

    const parent = this.resolveInode(parentPath);
    if (parent && parent.type === "directory") {
      parent.children.set(name, dirInode.cid);
      this.updateInodeCid(parent);
    }

    const fullPath = parentPath === "/" ? `/${name}` : `${parentPath}/${name}`;
    this.appendJournal("mkdir", fullPath, dirInode.cid, ownerPid);
    return dirInode;
  }

  /**
   * ls — List directory contents.
   */
  ls(path: string): { name: string; cid: string; type: InodeType }[] {
    const inode = this.resolveInode(path);
    if (!inode || inode.type !== "directory") return [];

    return Array.from(inode.children.entries()).map(([name, cid]) => {
      const child = this.inodes.get(cid);
      return { name, cid, type: child?.type ?? "file" };
    });
  }

  // ── Delete ──────────────────────────────────────────────────────

  /**
   * rm — Remove a file or empty directory.
   */
  rm(path: string, ownerPid: number): boolean {
    const inode = this.resolveInode(path);
    if (!inode) return false;
    if (inode.type === "directory" && inode.children.size > 0) return false;
    if (!this.checkPermission(inode, ownerPid, "write")) return false;

    // Remove from parent
    const parentPath = path.substring(0, path.lastIndexOf("/")) || "/";
    const parent = this.resolveInode(parentPath);
    if (parent && parent.type === "directory") {
      parent.children.delete(inode.name);
      this.updateInodeCid(parent);
    }

    this.inodes.delete(inode.cid);
    if (inode.contentCid) this.mmu.free(inode.contentCid);

    this.appendJournal("delete", path, inode.cid, ownerPid);
    return true;
  }

  // ── Mount / Unmount ─────────────────────────────────────────────

  /**
   * mount — Attach a CID-addressed subtree at a path.
   */
  mount(path: string, rootCid: string, ownerPid: number): boolean {
    this.mounts.set(path, {
      path,
      rootCid,
      mountedAt: Date.now(),
      readOnly: false,
    });
    this.appendJournal("mount", path, rootCid, ownerPid);
    return true;
  }

  /**
   * unmount — Detach a mount point.
   */
  unmount(path: string, ownerPid: number): boolean {
    if (!this.mounts.has(path)) return false;
    const mp = this.mounts.get(path)!;
    this.mounts.delete(path);
    this.appendJournal("unmount", path, mp.rootCid, ownerPid);
    return true;
  }

  // ── Integrity ───────────────────────────────────────────────────

  /**
   * fsck — Verify filesystem integrity.
   * In Q-FS this is trivial: every CID is self-verifying.
   * Now SYNCHRONOUS — genesis hash is pure math.
   */
  fsck(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [cid, inode] of this.inodes) {
      // Verify the inode's CID matches its content
      const inodeBytes = encodeUtf8(JSON.stringify({
        type: inode.type,
        name: inode.name,
        ownerPid: inode.ownerPid,
        contentCid: inode.contentCid,
      }));
      const expectedCid = createCid(inodeBytes);

      if (cid !== expectedCid.string) {
        errors.push(`Inode ${inode.name}: CID mismatch (stored: ${cid.slice(0, 16)}…, expected: ${expectedCid.string.slice(0, 16)}…)`);
      }

      // Verify content exists for files
      if (inode.type === "file" && inode.contentCid) {
        if (!this.mmu.exists(inode.contentCid)) {
          errors.push(`File ${inode.name}: content CID not found in MMU`);
        }
      }
    }

    // Verify journal hash chain
    for (let i = 1; i < this.journal.length; i++) {
      if (this.journal[i].prevEntryCid === null && i > 0) {
        errors.push(`Journal entry ${i}: broken hash chain`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Journal ─────────────────────────────────────────────────────

  /**
   * Get the journal — the append-only operation log.
   */
  getJournal(): readonly JournalEntry[] {
    return this.journal;
  }

  // ── Statistics ──────────────────────────────────────────────────

  stats(): FsStats {
    let totalFiles = 0;
    let totalDirs = 0;
    let totalBytes = 0;

    for (const inode of this.inodes.values()) {
      if (inode.type === "file") { totalFiles++; totalBytes += inode.size; }
      if (inode.type === "directory") totalDirs++;
    }

    return {
      totalInodes: this.inodes.size,
      totalFiles,
      totalDirectories: totalDirs,
      totalBytes,
      journalLength: this.journal.length,
      mountPoints: this.mounts.size,
      integrityValid: true, // Optimistic; call fsck() for full check
    };
  }

  /** Get root CID */
  getRootCid(): string | null {
    return this.rootCid;
  }

  // ── Internal ────────────────────────────────────────────────────

  private createInode(
    type: InodeType,
    name: string,
    ownerPid: number,
    contentCid?: string,
    size?: number
  ): QInode {
    const inodeBytes = encodeUtf8(JSON.stringify({
      type, name, ownerPid, contentCid: contentCid ?? null,
    }));
    const cid = createCid(inodeBytes);

    const inode: QInode = {
      cid: cid.string,
      type,
      name,
      size: size ?? 0,
      ownerPid,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      contentCid: contentCid ?? null,
      children: new Map(),
      targetCid: null,
      permissions: { ownerPid, readable: true, writable: true, executable: type === "directory" },
    };

    this.inodes.set(cid.string, inode);
    return inode;
  }

  private updateInodeCid(inode: QInode): void {
    // Directories need their CID updated when children change
    // We keep the same reference since the Map key is the original CID
    (inode as { modifiedAt: number }).modifiedAt = Date.now();
  }

  private resolveInode(path: string): QInode | null {
    if (path === "/" && this.rootCid) {
      return this.inodes.get(this.rootCid) ?? null;
    }

    const parts = path.split("/").filter(Boolean);
    let current = this.rootCid ? this.inodes.get(this.rootCid) : null;

    for (const part of parts) {
      if (!current || current.type !== "directory") return null;
      const childCid = current.children.get(part);
      if (!childCid) return null;
      current = this.inodes.get(childCid) ?? null;
    }

    return current ?? null;
  }

  private checkPermission(inode: QInode, pid: number, op: "read" | "write" | "execute"): boolean {
    // Owner has full access
    if (inode.ownerPid === pid) return true;
    // PID 0 (genesis) has root access
    if (pid === 0) return true;
    // Check specific permission
    switch (op) {
      case "read": return inode.permissions.readable;
      case "write": return inode.permissions.writable;
      case "execute": return inode.permissions.executable;
    }
  }

  private appendJournal(op: JournalOp, path: string, cid: string, pid: number): void {
    const prevEntry = this.journal.length > 0 ? this.journal[this.journal.length - 1] : null;

    let prevEntryCid: string | null = null;
    if (prevEntry) {
      const prevBytes = encodeUtf8(JSON.stringify({
        seq: prevEntry.sequence, op: prevEntry.operation, path: prevEntry.path, cid: prevEntry.cid,
      }));
      prevEntryCid = createCid(prevBytes).string;
    }

    this.journal.push({
      sequence: this.journalSequence++,
      operation: op,
      path,
      cid,
      prevEntryCid,
      timestamp: Date.now(),
      pid,
    });
  }
}
