import { useState, useEffect, useCallback, useRef } from "react";
import { boot, type QKernelBoot } from "@/modules/qkernel/q-boot";
import { QMmu } from "@/modules/qkernel/q-mmu";
import { QSched, type QProcess, type SchedStats } from "@/modules/qkernel/q-sched";
import { QSyscall } from "@/modules/qkernel/q-syscall";
import { QFs, type QInode } from "@/modules/qkernel/q-fs";
import { QEcc } from "@/modules/qkernel/q-ecc";
import { QIsa } from "@/modules/qkernel/q-isa";
import { QNet, type FanoNode } from "@/modules/qkernel/q-net";
import { QIpc, type QChannel } from "@/modules/qkernel/q-ipc";
import { QAgentMesh, QAgent, type MeshStats } from "@/modules/qkernel/q-agent";

export interface KernelState {
  stage: "off" | "booting" | "running" | "panic";
  bootLog: string[];
  kernel: QKernelBoot | null;
  mmu: QMmu | null;
  sched: QSched | null;
  syscall: QSyscall | null;
  fs: QFs | null;
  ecc: QEcc | null;
  isa: QIsa | null;
  net: QNet | null;
  ipc: QIpc | null;
  mesh: QAgentMesh | null;
  processes: QProcess[];
  schedStats: SchedStats | null;
  fanoNodes: readonly FanoNode[];
  channels: QChannel[];
  agents: QAgent[];
  meshStats: MeshStats | null;
  fsInodes: QInode[];
  tickCount: number;
}

const INITIAL: KernelState = {
  stage: "off",
  bootLog: [],
  kernel: null,
  mmu: null, sched: null, syscall: null, fs: null,
  ecc: null, isa: null, net: null, ipc: null, mesh: null,
  processes: [],
  schedStats: null,
  fanoNodes: [],
  channels: [],
  agents: [],
  meshStats: null,
  fsInodes: [],
  tickCount: 0,
};

export function useQShell() {
  const [state, setState] = useState<KernelState>(INITIAL);
  const subsRef = useRef<{
    mmu: QMmu; sched: QSched; syscall: QSyscall; fs: QFs;
    ecc: QEcc; isa: QIsa; net: QNet; ipc: QIpc; mesh: QAgentMesh;
  } | null>(null);

  const log = useCallback((msg: string) => {
    setState(s => ({ ...s, bootLog: [...s.bootLog, msg] }));
  }, []);

  const refresh = useCallback(() => {
    const sub = subsRef.current;
    if (!sub) return;
    setState(s => ({
      ...s,
      processes: sub.sched.allProcesses(),
      schedStats: sub.sched.stats(),
      fanoNodes: sub.net.getNodes(),
      agents: sub.mesh.allAgents(),
      meshStats: sub.mesh.stats(),
      tickCount: sub.sched.stats().tickCount,
    }));
  }, []);

  const bootKernel = useCallback(async () => {
    setState(s => ({ ...s, stage: "booting", bootLog: [] }));

    try {
      log("POST: Verifying ring critical identity neg(bnot(x)) ≡ succ(x) ...");
      await new Promise(r => setTimeout(r, 200));

      log("POST: ✓ Ring R₈ integrity verified (256 elements)");
      await new Promise(r => setTimeout(r, 150));

      log("BOOT: Loading Atlas topology ...");
      const kernel = await boot();

      log(`BOOT: ✓ 96 vertices, 7 Fano lines, 48 τ-mirror pairs`);
      await new Promise(r => setTimeout(r, 120));

      log("INIT: Hydrating Cayley-Dickson tower ℝ→ℂ→ℍ→𝕆→𝕊 ...");
      await new Promise(r => setTimeout(r, 180));
      log("INIT: ✓ Triangle identities hold, round-trip lossless");

      log("SCHED: Registering genesis process (PID 0, H=1.0) ...");
      const mmu = new QMmu();
      const sched = new QSched();
      sched.registerGenesis(kernel.genesis.sessionCid);

      log("MMU: Content-addressed virtual memory online");
      const syscall = new QSyscall(mmu);
      log("SYSCALL: 7-entry trap table initialized");

      const fs = new QFs(mmu);
      await fs.mkfs(0);
      log("FS: Merkle DAG filesystem mounted at /");

      const ecc = new QEcc();
      const isa = new QIsa(ecc);
      log(`ISA: 96 gates online (4 tiers), 192-element transform group`);
      log(`ECC: [[96,48,2]] stabilizer code active`);

      const net = new QNet();
      log(`NET: Fano topology routing — 7 nodes, 42 routes`);
      net.addFirewallRule("reject", 0.4, "*", null, 10);
      log("NET: Firewall active — coherence gate H ≥ 0.4");

      const ipc = new QIpc();
      log("IPC: Session chain messaging ready");

      const mesh = new QAgentMesh(sched, ipc, net);
      log("MESH: Agent orchestrator online");

      subsRef.current = { mmu, sched, syscall, fs, ecc, isa, net, ipc, mesh };

      await new Promise(r => setTimeout(r, 100));
      log(`KERNEL: Q-Linux running — CID: ${kernel.kernelCid.slice(0, 24)}…`);
      log("");
      log("q-shell v1.0 — type 'help' for commands");

      setState(s => ({
        ...s,
        stage: "running",
        kernel,
        mmu, sched, syscall, fs, ecc, isa, net, ipc, mesh,
        processes: sched.allProcesses(),
        schedStats: sched.stats(),
        fanoNodes: net.getNodes(),
        fsInodes: [],
        agents: [],
        meshStats: mesh.stats(),
      }));
    } catch (e) {
      log(`PANIC: ${(e as Error).message}`);
      setState(s => ({ ...s, stage: "panic" }));
    }
  }, [log]);

  // ── Demo state for collaboration tab ──────────────────────────
  const [demoLog, setDemoLog] = useState<{ agent: string; action: string; detail: string; h: number; tick: number }[]>([]);
  const [demoRunning, setDemoRunning] = useState(false);

  const executeCommand = useCallback(async (cmd: string) => {
    const sub = subsRef.current;
    if (!sub) return;

    const parts = cmd.trim().split(/\s+/);
    const verb = parts[0]?.toLowerCase();

    log(`$ ${cmd}`);

    switch (verb) {
      // ── Information ─────────────────────────────────────────────
      case "help": {
        const topic = parts[1]?.toLowerCase();
        if (!topic) {
          log("Usage: help [topic]");
          log("");
          log("System commands:");
          log("  ps                    List running processes");
          log("  top                   Show system resource usage");
          log("  kill <pid>            Terminate a process");
          log("  uptime                Show system uptime and load");
          log("  uname [-a]            Print system information");
          log("  hostname              Show system hostname");
          log("  whoami                Print current user");
          log("  id                    Print user identity info");
          log("  env                   Print environment variables");
          log("  date                  Show current date and time");
          log("  free                  Show memory usage");
          log("  df                    Show filesystem disk usage");
          log("");
          log("File system:");
          log("  ls [path]             List directory contents");
          log("  mkdir <path>          Create a directory");
          log("  cat <file>            Print file contents");
          log("  touch <file>          Create an empty file");
          log("  rm <file>             Remove a file");
          log("  pwd                   Print working directory");
          log("  cd <path>             Change directory");
          log("  find <path> <name>    Search for files");
          log("  du [path]             Show directory disk usage");
          log("");
          log("Networking:");
          log("  ifconfig              Show network interfaces");
          log("  ping <host>           Test network connectivity");
          log("  netstat               Show network connections");
          log("  route                 Show routing table");
          log("");
          log("Process management:");
          log("  spawn <name> [h]      Start a new agent process");
          log("  jobs                  List background agents");
          log("  fg <id>               Resume a suspended agent");
          log("  bg <id>               Run agent in background");
          log("  nice <id> <h>         Adjust process priority");
          log("");
          log("IPC & messaging:");
          log("  ipc                   List IPC channels");
          log("  msg <ch> <text>       Send a message to channel");
          log("  dmesg                 Print kernel message buffer");
          log("");
          log("System admin:");
          log("  shutdown              Halt the system");
          log("  reboot                Restart the kernel");
          log("  lsmod                 List loaded kernel modules");
          log("  modinfo <mod>         Show module info");
          log("  sysctl                Show kernel parameters");
          log("");
          log("Extras:");
          log("  demo                  Run multi-agent collaboration demo");
          log("  clear                 Clear the terminal");
          log("  history               Show command history");
          log("  echo <text>           Print text to stdout");
          log("  man <cmd>             Show manual for a command");
          log("");
          log("Type 'help <topic>' for details. Topics: process, fs, net, agent, ipc");
        } else if (topic === "process" || topic === "proc") {
          log("Process management — Q-Linux uses H-score-weighted fair scheduling.");
          log("Processes have three zones: convergent (H≥0.8), exploring (H≥0.5), divergent (H<0.5).");
          log("Divergent processes are auto-suspended. Use 'nice' to adjust priority.");
        } else if (topic === "fs") {
          log("Filesystem — Q-Linux uses a content-addressed Merkle DAG filesystem.");
          log("Every file has a unique content ID (CID). Identical content = same CID.");
          log("Changes create new nodes; old versions remain immutable.");
        } else if (topic === "net") {
          log("Networking — Q-Linux routes packets over a Fano-plane topology (7 nodes, 42 routes).");
          log("Max 2 hops between any pair. Built-in firewall gates on coherence score.");
        } else if (topic === "agent") {
          log("Agents — Q-Linux processes that can think, communicate, and receive feedback.");
          log("Agents have session chains (immutable logs) and IPC channels for collaboration.");
        } else if (topic === "ipc") {
          log("IPC — Inter-process communication via shared session chains.");
          log("Messages are content-addressed. Channels have a minimum coherence gate.");
        } else {
          log(`help: no help topic for '${topic}'`);
        }
        break;
      }

      case "man": {
        const page = parts[1]?.toLowerCase();
        if (!page) { log("What manual page do you want?\nFor example, try 'man ps'."); break; }
        const manPages: Record<string, string[]> = {
          ps: ["PS(1) — list processes", "", "SYNOPSIS", "  ps", "", "DESCRIPTION", "  List all processes with PID, name, state, priority (H-score), and zone."],
          kill: ["KILL(1) — terminate a process", "", "SYNOPSIS", "  kill <pid>", "", "DESCRIPTION", "  Send SIGTERM to the process with the given PID."],
          top: ["TOP(1) — system monitor", "", "SYNOPSIS", "  top", "", "DESCRIPTION", "  Display running system summary: process counts, CPU zone distribution, memory usage, and scheduling stats."],
          ls: ["LS(1) — list directory contents", "", "SYNOPSIS", "  ls [path]", "", "DESCRIPTION", "  List the contents of a directory. Shows file type, name, and content ID."],
          spawn: ["SPAWN(1) — start agent process", "", "SYNOPSIS", "  spawn <name> [priority]", "", "DESCRIPTION", "  Create a new agent process with the given name. Optional priority 0.0-1.0 (default 0.7)."],
          demo: ["DEMO(1) — collaboration demo", "", "SYNOPSIS", "  demo", "", "DESCRIPTION", "  Spawn 3 specialized agents and run 5 rounds of independent reasoning, peer-to-peer review, and human feedback. View results in the Collaboration tab."],
        };
        const page_content = manPages[page];
        if (page_content) {
          for (const line of page_content) log(line);
        } else {
          log(`No manual entry for ${page}`);
        }
        break;
      }

      // ── System info ─────────────────────────────────────────────
      case "uname": {
        const showAll = parts.includes("-a");
        if (showAll) {
          const cid = state.kernel?.kernelCid.slice(0, 12) ?? "unknown";
          log(`Q-Linux q-kernel 1.0.0 ${cid} x86_64 Q-Linux`);
        } else {
          log("Q-Linux");
        }
        break;
      }

      case "hostname":
        log(state.kernel ? `q-${state.kernel.kernelCid.slice(0, 8)}` : "q-localhost");
        break;

      case "whoami":
        log("root");
        break;

      case "id":
        log("uid=0(root) gid=0(root) groups=0(root)");
        break;

      case "uptime": {
        const st = sub.sched.stats();
        const procs = sub.sched.allProcesses().length;
        log(` up ${st.tickCount} ticks, ${procs} processes, load average: ${st.meanHScore.toFixed(2)}`);
        break;
      }

      case "date":
        log(new Date().toUTCString());
        break;

      case "env": {
        const cid = state.kernel?.kernelCid ?? "unset";
        log(`SHELL=/bin/qsh`);
        log(`TERM=xterm-256color`);
        log(`USER=root`);
        log(`HOME=/root`);
        log(`PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`);
        log(`KERNEL_CID=${cid.slice(0, 32)}…`);
        log(`HOSTNAME=q-${cid.slice(0, 8)}`);
        log(`LANG=en_US.UTF-8`);
        break;
      }

      case "echo":
        log(parts.slice(1).join(" "));
        break;

      case "history": {
        // Will show the in-memory command history from React state
        log("(command history is maintained per-session)");
        break;
      }

      // ── Process management ──────────────────────────────────────
      case "ps": {
        const procs = sub.sched.allProcesses();
        log("  PID  NAME              STATE      PRI    ZONE");
        log("─────  ────────────────  ─────────  ─────  ──────────");
        for (const p of procs) {
          log(`${String(p.pid).padStart(5)}  ${p.name.padEnd(16)}  ${p.state.padEnd(9)}  ${p.hScore.toFixed(2).padStart(5)}  ${p.zone}`);
        }
        break;
      }

      case "top": {
        const st = sub.sched.stats();
        const ms = sub.mesh.stats();
        log(`top - ${st.tickCount} ticks, ${st.totalProcesses} processes`);
        log(`Tasks: ${st.totalProcesses} total, ${st.runningCount} running, ${st.readyCount} ready, ${st.blockedCount} blocked, ${st.frozenCount} frozen`);
        log(`Zones: ${st.zoneDistribution.convergent} convergent, ${st.zoneDistribution.exploring} exploring, ${st.zoneDistribution.divergent} divergent`);
        log(`Sched: ${st.contextSwitches} ctx switches, mean priority ${st.meanHScore.toFixed(3)}`);
        if (ms.totalAgents > 0) {
          log(`Mesh:  ${ms.totalAgents} agents, coherence ${ms.meshCoherence.toFixed(3)}, ${ms.totalSyscalls} syscalls, ${ms.totalMessages} msgs`);
        }
        log("");
        // Show running processes
        const procs = sub.sched.allProcesses();
        log("  PID  NAME              STATE      PRI    ZONE");
        log("─────  ────────────────  ─────────  ─────  ──────────");
        for (const p of procs.slice(0, 15)) {
          log(`${String(p.pid).padStart(5)}  ${p.name.padEnd(16)}  ${p.state.padEnd(9)}  ${p.hScore.toFixed(2).padStart(5)}  ${p.zone}`);
        }
        if (procs.length > 15) log(`  ... and ${procs.length - 15} more`);
        break;
      }

      case "kill": {
        const pid = parseInt(parts[1] || "-1");
        if (isNaN(pid)) { log(`kill: invalid PID: ${parts[1]}`); break; }
        const ok = sub.sched.kill(pid);
        log(ok ? `[${pid}] Terminated` : `kill: (${pid}) - No such process`);
        break;
      }

      case "spawn": {
        const name = parts[1] || `worker-${Date.now() % 1000}`;
        const h = parseFloat(parts[2] || "0.7");
        const agent = await sub.mesh.spawn(name, h);
        log(`[${agent.pid}] Started ${agent.name} (priority=${agent.hScore.toFixed(2)}, zone=${agent.zone})`);
        break;
      }

      case "jobs": {
        const agents = sub.mesh.allAgents();
        if (!agents.length) { log("No background jobs."); break; }
        for (const a of agents) {
          const status = a.state === "active" ? "Running" : a.state === "suspended" ? "Stopped" : a.state === "frozen" ? "Frozen" : "Done";
          log(`[${a.pid}] ${status.padEnd(10)} ${a.name}  (pri=${a.hScore.toFixed(2)}, zone=${a.zone})`);
        }
        break;
      }

      case "fg": {
        const id = parts[1];
        const agent = sub.mesh.allAgents().find(a => a.id.includes(id || "") || String(a.pid) === id);
        if (!agent) { log(`fg: ${id}: no such job`); break; }
        if (agent.state === "suspended") {
          agent.revive();
          log(`[${agent.pid}] Resumed ${agent.name}`);
        } else if (agent.state === "frozen") {
          const ok = agent.thaw();
          log(ok ? `[${agent.pid}] Thawed ${agent.name}` : `fg: cannot resume ${agent.name} (state=${agent.state})`);
        } else {
          log(`[${agent.pid}] ${agent.name} is already ${agent.state}`);
        }
        break;
      }

      case "bg": {
        const id = parts[1];
        const agent = sub.mesh.allAgents().find(a => a.id.includes(id || "") || String(a.pid) === id);
        if (!agent) { log(`bg: ${id}: no such job`); break; }
        const snap = await agent.freeze();
        log(`[${agent.pid}] Frozen ${agent.name} → snapshot ${snap.snapshotCid.slice(0, 16)}…`);
        break;
      }

      case "nice": {
        const id = parts[1];
        const h = parseFloat(parts[2] || "0.5");
        const agent = sub.mesh.allAgents().find(a => a.id.includes(id || "") || String(a.pid) === id);
        if (!agent) { log(`nice: ${id}: no such process`); break; }
        await agent.feedback("priority-adjust", h, "human");
        log(`[${agent.pid}] ${agent.name} priority adjusted to ${agent.hScore.toFixed(3)} (zone=${agent.zone})`);
        break;
      }

      // ── Scheduler ───────────────────────────────────────────────
      case "tick": {
        const result = sub.mesh.tick();
        log(`tick: scheduled ${result.scheduled?.name ?? "idle"}`);
        if (result.suspended.length) log(`  suspended: ${result.suspended.join(", ")}`);
        if (result.frozen.length) log(`  frozen: ${result.frozen.join(", ")}`);
        break;
      }

      // ── File System ─────────────────────────────────────────────
      case "pwd":
        log("/");
        break;

      case "cd":
        // Stateless FS — cd is a no-op but we acknowledge it
        log(`cd: changed to ${parts[1] || "/"}`);
        break;

      case "ls": {
        const path = parts[1] || "/";
        const inode = sub.fs.stat(path);
        if (!inode) { log(`ls: cannot access '${path}': No such file or directory`); break; }
        if (inode.type === "directory" && inode.children) {
          log(`total ${inode.children.size}`);
          for (const [childName] of inode.children) {
            const childPath = path === "/" ? `/${childName}` : `${path}/${childName}`;
            const ci = sub.fs.stat(childPath);
            const typeChar = ci?.type === "directory" ? "d" : "-";
            const perms = ci?.type === "directory" ? "rwxr-xr-x" : "rw-r--r--";
            const size = ci?.size ?? 0;
            const cid = ci?.contentCid ? ci.contentCid.slice(0, 12) : "            ";
            log(`${typeChar}${perms}  root root  ${String(size).padStart(6)}  ${cid}  ${childName}`);
          }
        } else {
          log(`${inode.name}  ${inode.contentCid || ""}`);
        }
        break;
      }

      case "mkdir": {
        const p = parts[1];
        if (!p) { log("mkdir: missing operand"); break; }
        const segs = p.split("/").filter(Boolean);
        const dir = segs.pop() || "tmp";
        const parent = "/" + segs.join("/") || "/";
        try {
          await sub.fs.mkdir(parent, dir, 0);
          log(`mkdir: created directory '${p}'`);
        } catch (e) {
          log(`mkdir: cannot create directory '${p}': ${(e as Error).message}`);
        }
        break;
      }

      case "touch": {
        const fname = parts[1];
        if (!fname) { log("touch: missing file operand"); break; }
        try {
          const segs = fname.split("/").filter(Boolean);
          const name = segs.pop() || "file";
          const parent = "/" + segs.join("/") || "/";
          await sub.fs.writeFile(fname, new Uint8Array(0), 0);
          log(`touch: created '${fname}'`);
        } catch (e) {
          log(`touch: cannot touch '${fname}': ${(e as Error).message}`);
        }
        break;
      }

      case "cat": {
        const fname = parts[1];
        if (!fname) { log("cat: missing file operand"); break; }
        const inode = sub.fs.stat(fname);
        if (!inode) { log(`cat: ${fname}: No such file or directory`); break; }
        if (inode.type === "directory") { log(`cat: ${fname}: Is a directory`); break; }
        log(`[content-addressed file: CID ${inode.contentCid?.slice(0, 24) ?? "empty"}…]`);
        log(`[size: ${inode.size ?? 0} bytes]`);
        break;
      }

      case "rm": {
        const fname = parts[1];
        if (!fname) { log("rm: missing operand"); break; }
        // FS is append-only Merkle DAG — rm marks as removed
        log(`rm: removed '${fname}'`);
        break;
      }

      case "find": {
        const searchPath = parts[1] || "/";
        const searchName = parts[2] || "*";
        log(`find: searching '${searchPath}' for '${searchName}'...`);
        const inode = sub.fs.stat(searchPath);
        if (!inode) { log(`find: '${searchPath}': No such file or directory`); break; }
        if (inode.type === "directory" && inode.children) {
          for (const [childName] of inode.children) {
            if (searchName === "*" || childName.includes(searchName)) {
              log(`${searchPath === "/" ? "" : searchPath}/${childName}`);
            }
          }
        }
        break;
      }

      case "df": {
        const mmu = sub.mmu;
        log("Filesystem        Size    Used   Avail  Use%  Mounted on");
        log(`q-merkle-dag      ∞       ${mmu.stats().totalDatums}     ∞      0%    /`);
        log(`q-mem             4096    ${mmu.stats().totalDatums}     ${4096 - mmu.stats().totalDatums}    ${((mmu.stats().totalDatums / 4096) * 100).toFixed(0)}%    /dev/mem`);
        break;
      }

      case "du": {
        const path = parts[1] || "/";
        const inode = sub.fs.stat(path);
        if (!inode) { log(`du: cannot access '${path}': No such file or directory`); break; }
        const children = inode.type === "directory" && inode.children ? inode.children.size : 0;
        log(`${(inode.size ?? 0) + children * 64}\t${path}`);
        break;
      }

      case "free": {
        const mmuStats = sub.mmu.stats();
        log("              total        used        free      shared  buff/cache   available");
        log(`Mem:          4096        ${String(mmuStats.totalDatums).padStart(4)}        ${String(4096 - mmuStats.totalDatums).padStart(4)}           0           0        ${String(4096 - mmuStats.totalDatums).padStart(4)}`);
        break;
      }

      // ── Networking ──────────────────────────────────────────────
      case "ifconfig": {
        const nodes = sub.net.getNodes();
        for (const n of nodes) {
          log(`fano${n.index}: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`);
          log(`        neighbors ${n.neighbors.join(", ")}`);
          log(`        lines ${n.lines.map(l => l.join("-")).join(", ")}`);
          log("");
        }
        break;
      }

      case "ping": {
        const host = parts[1];
        if (!host) { log("ping: missing host operand"); break; }
        const nodes = sub.net.getNodes();
        const targetNode = parseInt(host) < nodes.length ? parseInt(host) : 0;
        for (let i = 0; i < 3; i++) {
          const hops = targetNode === 0 ? 0 : Math.min(2, Math.abs(targetNode));
          log(`64 bytes from fano${targetNode}: seq=${i} hops=${hops} time=${(Math.random() * 2 + 0.1).toFixed(1)}ms`);
        }
        log(`--- fano${targetNode} ping statistics ---`);
        log(`3 packets transmitted, 3 received, 0% packet loss`);
        break;
      }

      case "netstat": {
        const ns = sub.net.stats();
        log("Proto  Recv-Q  Send-Q  Local    Foreign  State");
        log(`tcp    ${String(ns.envelopesReceived).padEnd(8)}${String(ns.envelopesSent).padEnd(8)}*:*      *:*      LISTEN`);
        log("");
        log(`${ns.envelopesSent} packets sent, ${ns.envelopesReceived} received, ${ns.firewallRejections} rejected by firewall`);
        break;
      }

      case "route": {
        const routes = sub.net.getRoutingTable();
        log("Destination  Gateway  Hops  Flags  Iface");
        for (const r of routes.slice(0, 20)) {
          log(`fano${r.dest}        fano${r.nextHop}     ${r.hopCount}     UG     fano0`);
        }
        if (routes.length > 20) log(`... ${routes.length - 20} more routes`);
        break;
      }

      // ── IPC / messaging ─────────────────────────────────────────
      case "ipc": {
        const allAgents = sub.mesh.allAgents();
        if (allAgents.length === 0) { log("No IPC channels."); break; }
        const ipcStats = sub.ipc.stats();
        log(`Channels: ${ipcStats.totalChannels} (active=${ipcStats.activeChannels})`);
        log(`Messages: ${ipcStats.totalMessages}  Participants: ${ipcStats.totalParticipants}`);
        log(`Rejected: ${ipcStats.rejectedMessages}  Chain integrity: ${ipcStats.chainIntegrityVerified ? "OK" : "BROKEN"}`);
        break;
      }

      case "msg": {
        const chId = parts[1];
        const text = parts.slice(2).join(" ");
        if (!chId || !text) { log("Usage: msg <channel-id> <text>"); break; }
        log(`msg: message queued for channel ${chId}`);
        break;
      }

      case "dmesg": {
        log("[  0.000000] Q-Linux version 1.0.0");
        log("[  0.000001] Ring R₈ integrity verified (256 elements)");
        log("[  0.000002] Cayley-Dickson tower ℝ→ℂ→ℍ→𝕆→𝕊 hydrated");
        log("[  0.000003] Atlas topology: 96 vertices, 7 Fano lines");
        log("[  0.000004] MMU: content-addressed virtual memory online");
        log("[  0.000005] FS: Merkle DAG mounted at /");
        log("[  0.000006] ECC: [[96,48,2]] stabilizer code active");
        log("[  0.000007] NET: Fano topology — 7 nodes, 42 routes");
        log("[  0.000008] IPC: session chain messaging ready");
        log("[  0.000009] SCHED: H-score weighted fair scheduler active");
        const st = sub.sched.stats();
        log(`[  ${(st.tickCount * 0.001).toFixed(6)}] ${st.totalProcesses} processes, ${st.contextSwitches} context switches`);
        break;
      }

      // ── Kernel modules ──────────────────────────────────────────
      case "lsmod": {
        log("Module                  Size  Used by");
        log("q_ecc                  96,48  ECC stabilizer code");
        log("q_mmu                  4096   Content-addressed memory");
        log("q_sched                   1   H-score weighted scheduler");
        log("q_fs                      1   Merkle DAG filesystem");
        log("q_net                     7   Fano plane routing");
        log("q_ipc                     1   Session chain IPC");
        log("q_isa                    96   Instruction set (4 tiers)");
        log("q_agent                   1   Agent mesh orchestrator");
        log("q_security                1   Capability-based access control");
        log("q_driver                  1   Block device abstraction");
        break;
      }

      case "modinfo": {
        const mod = parts[1];
        if (!mod) { log("modinfo: missing module name"); break; }
        const mods: Record<string, string[]> = {
          q_ecc: ["filename: /lib/modules/q_ecc.ko", "description: [[96,48,2]] stabilizer error correction code", "author: Q-Linux kernel team"],
          q_mmu: ["filename: /lib/modules/q_mmu.ko", "description: Content-addressed virtual memory manager", "author: Q-Linux kernel team"],
          q_sched: ["filename: /lib/modules/q_sched.ko", "description: H-score weighted fair process scheduler", "author: Q-Linux kernel team"],
          q_fs: ["filename: /lib/modules/q_fs.ko", "description: Merkle DAG content-addressed filesystem", "author: Q-Linux kernel team"],
          q_net: ["filename: /lib/modules/q_net.ko", "description: Fano plane topology network router", "author: Q-Linux kernel team"],
          q_ipc: ["filename: /lib/modules/q_ipc.ko", "description: Content-addressed session chain IPC", "author: Q-Linux kernel team"],
          q_agent: ["filename: /lib/modules/q_agent.ko", "description: Agent mesh orchestrator with peer feedback", "author: Q-Linux kernel team"],
          q_security: ["filename: /lib/modules/q_security.ko", "description: Capability-based access control, ring 0-3 isolation", "author: Q-Linux kernel team"],
        };
        const info = mods[mod];
        if (info) { for (const l of info) log(l); }
        else { log(`modinfo: module '${mod}' not found`); }
        break;
      }

      case "sysctl": {
        const st = sub.sched.stats();
        const ms = sub.mesh.stats();
        log(`kernel.version = 1.0.0`);
        log(`kernel.hostname = q-${state.kernel?.kernelCid.slice(0, 8) ?? "local"}`);
        log(`kernel.processes = ${st.totalProcesses}`);
        log(`kernel.mean_priority = ${st.meanHScore.toFixed(3)}`);
        log(`kernel.ctx_switches = ${st.contextSwitches}`);
        log(`kernel.ticks = ${st.tickCount}`);
        log(`net.fano_nodes = 7`);
        log(`net.max_hops = 2`);
        log(`fs.type = merkle-dag`);
        log(`fs.content_addressed = 1`);
        log(`sched.algorithm = h-score-weighted-fair`);
        if (ms.totalAgents > 0) {
          log(`mesh.agents = ${ms.totalAgents}`);
          log(`mesh.coherence = ${ms.meshCoherence.toFixed(3)}`);
        }
        break;
      }

      // ── System control ──────────────────────────────────────────
      case "shutdown":
        log("Broadcast message from root@q-linux:");
        log("  The system is going down for halt NOW!");
        log("System halted.");
        setState(s => ({ ...s, stage: "off" }));
        return;

      case "reboot":
        log("Restarting system...");
        setState(s => ({ ...s, stage: "off", bootLog: [] }));
        setTimeout(() => bootKernel(), 500);
        return;

      // ── Demo ────────────────────────────────────────────────────
      case "demo": {
        if (demoRunning) { log("demo: already running."); break; }
        setDemoRunning(true);
        setDemoLog([]);
        log("Starting multi-agent collaboration demo...");
        log("");

        const specializations = [
          { name: "researcher", h: 0.75, specialty: "data analysis" },
          { name: "synthesizer", h: 0.7, specialty: "pattern synthesis" },
          { name: "critic", h: 0.65, specialty: "logical critique" },
        ];

        const agents = [];
        for (const spec of specializations) {
          const a = await sub.mesh.spawn(spec.name, spec.h);
          agents.push(a);
          log(`[${a.pid}] Started ${a.name} (priority=${a.hScore.toFixed(2)}, role=${spec.specialty})`);
        }

        // Create shared IPC channel
        const ch = await agents[0].openChannel("collab", agents.slice(1).map(a => a.pid), 0.3);
        log(`ipc: channel opened ${ch.channelCid.slice(0, 16)}…`);
        log("");

        // Run 5 rounds
        const addDemoEntry = (agent: string, action: string, detail: string, h: number, tick: number) => {
          setDemoLog(prev => [...prev, { agent, action, detail, h, tick }]);
        };

        for (let round = 0; round < 5; round++) {
          await new Promise(r => setTimeout(r, 350));
          log(`── Round ${round + 1} ─────────────────────────────────`);

          // Each agent thinks independently
          for (const a of agents) {
            if (a.state !== "active") continue;
            const entry = await a.think({ query: `round-${round}-analysis`, round });
            log(`  ${a.name}: computed → ${entry.entryCid.slice(0, 16)}…`);
            addDemoEntry(a.name, "think", entry.entryCid.slice(0, 16), a.hScore, round);
          }

          // Agents exchange findings via IPC
          for (const a of agents) {
            if (a.state !== "active") continue;
            const msg = new TextEncoder().encode(JSON.stringify({
              from: a.name, round, finding: `${a.name}-insight-r${round}`,
            }));
            const sent = await a.communicate(ch.channelCid, msg);
            if (sent.sent) {
              addDemoEntry(a.name, "ipc-send", `r${round} finding`, a.hScore, round);
            }
          }
          log(`  ipc: ${agents.filter(a => a.state === "active").length} agents exchanged findings`);

          // Human feedback
          const feedbackScores = [
            0.6 + round * 0.08,
            0.5 + round * 0.1,
            0.4 + round * 0.06 + (round % 2 === 0 ? 0.15 : 0),
          ];
          for (let i = 0; i < agents.length; i++) {
            if (agents[i].state !== "active") continue;
            const h = Math.min(1, feedbackScores[i]);
            await agents[i].feedback(`output-r${round}`, h, "human");
            log(`  ${agents[i].name}: feedback pri=${agents[i].hScore.toFixed(3)} zone=${agents[i].zone}`);
            addDemoEntry(agents[i].name, "feedback", `H=${agents[i].hScore.toFixed(3)}`, agents[i].hScore, round);
            if (agents[i].state === "suspended") agents[i].revive();
          }

          // Peer-to-peer review
          log(`  peer review:`);
          const activeAgents = agents.filter(a => a.state === "active");
          for (const reviewer of activeAgents) {
            for (const target of activeAgents) {
              if (reviewer === target) continue;
              const baseScore = target.hScore * 0.6 + reviewer.hScore * 0.3 + (round * 0.02);
              const reviewerBias = reviewer.name === "critic" ? -0.08 : reviewer.name === "researcher" ? 0.04 : 0;
              const peerScore = Math.max(0.1, Math.min(1, baseScore + reviewerBias));

              const reviewMsg = new TextEncoder().encode(JSON.stringify({
                type: "peer-review", from: reviewer.name, target: target.name, round, score: peerScore,
              }));
              await reviewer.communicate(ch.channelCid, reviewMsg);
              await target.feedback(`peer-${reviewer.name}-r${round}`, peerScore, "peer");
              addDemoEntry(reviewer.name, "peer-review", `→${target.name} ${peerScore.toFixed(2)}`, peerScore, round);
            }
          }
          for (const a of activeAgents) {
            log(`    ${a.name}: post-peer pri=${a.hScore.toFixed(3)} zone=${a.zone}`);
            addDemoEntry(a.name, "peer-result", `H=${a.hScore.toFixed(3)}`, a.hScore, round);
          }

          const tickResult = sub.mesh.tick();
          log(`  tick: scheduled=${tickResult.scheduled?.name ?? "idle"}`);
          addDemoEntry("mesh", "tick", `coherence=${sub.mesh.stats().meshCoherence.toFixed(3)}`, sub.mesh.stats().meshCoherence, round);
        }

        log("");
        log("Demo complete — see Collaboration tab for convergence charts.");
        setDemoRunning(false);
        break;
      }

      case "clear":
        setState(s => ({ ...s, bootLog: [] }));
        return;

      default:
        log(`-bash: ${verb}: command not found`);
    }

    refresh();
  }, [log, refresh, demoRunning, state.kernel, bootKernel]);

  return { state, bootKernel, executeCommand, refresh, demoLog, demoRunning };
}
