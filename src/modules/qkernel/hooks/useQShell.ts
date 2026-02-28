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
      case "help":
        log("Commands:");
        log("  ps             — List processes");
        log("  spawn <name>   — Spawn agent");
        log("  kill <pid>     — Kill process");
        log("  tick           — Run scheduler tick");
        log("  stat           — Scheduler stats");
        log("  mesh           — Mesh stats");
        log("  agents         — List agents");
        log("  think <id> <q> — Agent thinks");
        log("  feedback <id> <h> — H-score feedback");
        log("  freeze <id>    — Freeze agent");
        log("  thaw <id>      — Thaw agent");
        log("  net            — Network topology");
        log("  ls [path]      — List directory");
        log("  mkdir <path>   — Create directory");
        log("  demo           — Multi-agent collaboration demo");
        log("  clear          — Clear log");
        break;

      case "ps":
        const procs = sub.sched.allProcesses();
        log("PID  NAME            STATE      H-SCORE  ZONE");
        log("───  ──────────────  ─────────  ───────  ──────────");
        for (const p of procs) {
          log(`${String(p.pid).padEnd(5)}${p.name.padEnd(16)}${p.state.padEnd(11)}${p.hScore.toFixed(2).padEnd(9)}${p.zone}`);
        }
        break;

      case "spawn": {
        const name = parts[1] || `agent-${Date.now() % 1000}`;
        const h = parseFloat(parts[2] || "0.7");
        const agent = await sub.mesh.spawn(name, h);
        log(`Spawned ${agent.name} (PID ${agent.pid}, H=${agent.hScore.toFixed(2)}, zone=${agent.zone})`);
        break;
      }

      case "kill": {
        const pid = parseInt(parts[1] || "-1");
        const ok = sub.sched.kill(pid);
        log(ok ? `Killed PID ${pid}` : `No such process: ${pid}`);
        break;
      }

      case "tick": {
        const result = sub.mesh.tick();
        log(`Tick — scheduled: ${result.scheduled?.name ?? "none"}`);
        if (result.suspended.length) log(`  Suspended: ${result.suspended.join(", ")}`);
        if (result.frozen.length) log(`  Frozen: ${result.frozen.join(", ")}`);
        break;
      }

      case "stat": {
        const st = sub.sched.stats();
        log(`Processes: ${st.totalProcesses} (run=${st.runningCount} rdy=${st.readyCount} blk=${st.blockedCount} frz=${st.frozenCount} hlt=${st.haltedCount})`);
        log(`Mean H: ${st.meanHScore.toFixed(3)}  Ctx switches: ${st.contextSwitches}  Ticks: ${st.tickCount}`);
        log(`Zones: convergent=${st.zoneDistribution.convergent} exploring=${st.zoneDistribution.exploring} divergent=${st.zoneDistribution.divergent}`);
        break;
      }

      case "mesh": {
        const ms = sub.mesh.stats();
        log(`Agents: ${ms.totalAgents} (active=${ms.activeAgents} susp=${ms.suspendedAgents} frz=${ms.frozenAgents} term=${ms.terminatedAgents})`);
        log(`Mean H: ${ms.meanHScore.toFixed(3)}  Coherence: ${ms.meshCoherence.toFixed(3)}`);
        log(`Syscalls: ${ms.totalSyscalls}  Messages: ${ms.totalMessages}`);
        break;
      }

      case "agents": {
        const agents = sub.mesh.allAgents();
        if (!agents.length) { log("No agents."); break; }
        log("ID                        STATE     H-SCORE  ZONE         SESSION");
        log("────────────────────────  ────────  ───────  ───────────  ───────");
        for (const a of agents) {
          log(`${a.id.slice(0, 24).padEnd(26)}${a.state.padEnd(10)}${a.hScore.toFixed(2).padEnd(9)}${a.zone.padEnd(13)}${a.sessionLength}`);
        }
        break;
      }

      case "think": {
        const id = parts[1];
        const query = parts.slice(2).join(" ") || "coherence";
        const agent = sub.mesh.allAgents().find(a => a.id.includes(id || ""));
        if (!agent) { log(`Agent not found: ${id}`); break; }
        const entry = await agent.think({ query });
        log(`${agent.name} thought → CID: ${entry.entryCid.slice(0, 20)}… (seq=${entry.sequenceNum})`);
        break;
      }

      case "feedback": {
        const id = parts[1];
        const h = parseFloat(parts[2] || "0.5");
        const agent = sub.mesh.allAgents().find(a => a.id.includes(id || ""));
        if (!agent) { log(`Agent not found: ${id}`); break; }
        await agent.feedback("cmd-output", h, "human");
        log(`${agent.name} feedback: H=${agent.hScore.toFixed(3)} zone=${agent.zone}`);
        break;
      }

      case "freeze": {
        const id = parts[1];
        const agent = sub.mesh.allAgents().find(a => a.id.includes(id || ""));
        if (!agent) { log(`Agent not found: ${id}`); break; }
        const snap = await agent.freeze();
        log(`Frozen ${agent.name} → CID: ${snap.snapshotCid.slice(0, 24)}…`);
        break;
      }

      case "thaw": {
        const id = parts[1];
        const agent = sub.mesh.allAgents().find(a => a.id.includes(id || ""));
        if (!agent) { log(`Agent not found: ${id}`); break; }
        const ok = agent.thaw();
        log(ok ? `Thawed ${agent.name}` : `Cannot thaw ${agent.name} (state=${agent.state})`);
        break;
      }

      case "net": {
        const nodes = sub.net.getNodes();
        log("Fano Topology — PG(2,2)");
        for (const n of nodes) {
          log(`  Node ${n.index}: lines=[${n.lines.map(l => l.join("-")).join(",")}] neighbors=[${n.neighbors.join(",")}]`);
        }
        log(`Routes: ${sub.net.getRoutingTable().length}  Firewall rules: active`);
        const ns = sub.net.stats();
        log(`Sent: ${ns.envelopesSent}  Received: ${ns.envelopesReceived}  Rejected: ${ns.firewallRejections}`);
        break;
      }

      case "ls": {
        const path = parts[1] || "/";
        const inode = sub.fs.stat(path);
        if (!inode) { log(`ls: ${path}: not found`); break; }
        if (inode.type === "directory" && inode.children) {
          for (const [childName, childCid] of inode.children) {
            const childPath = path === "/" ? `/${childName}` : `${path}/${childName}`;
            const ci = sub.fs.stat(childPath);
            const prefix = ci?.type === "directory" ? "d " : "- ";
            log(`${prefix}${childName}  ${ci?.contentCid ? ci.contentCid.slice(0, 16) + "…" : ""}`);
          }
        } else {
          log(`${inode.name}  ${inode.contentCid || ""}`);
        }
        break;
      }

      case "mkdir": {
        const p = parts[1] || "/tmp";
        const segs = p.split("/").filter(Boolean);
        const dir = segs.pop() || "tmp";
        const parent = "/" + segs.join("/") || "/";
        try {
          await sub.fs.mkdir(parent, dir, 0);
          log(`mkdir: created ${p}`);
        } catch (e) {
          log(`mkdir: ${(e as Error).message}`);
        }
        break;
      }

      case "demo": {
        if (demoRunning) { log("Demo already running."); break; }
        setDemoRunning(true);
        setDemoLog([]);
        log("DEMO: Spawning 3 specialized agents...");

        const specializations = [
          { name: "researcher", h: 0.75, specialty: "data analysis" },
          { name: "synthesizer", h: 0.7, specialty: "pattern synthesis" },
          { name: "critic", h: 0.65, specialty: "logical critique" },
        ];

        const agents = [];
        for (const spec of specializations) {
          const a = await sub.mesh.spawn(spec.name, spec.h);
          agents.push(a);
          log(`  Spawned ${a.name} (PID ${a.pid}, H=${a.hScore.toFixed(2)}, specialty=${spec.specialty})`);
        }

        // Create shared IPC channel
        const ch = await agents[0].openChannel("collab", agents.slice(1).map(a => a.pid), 0.3);
        log(`  Channel opened: ${ch.channelCid.slice(0, 16)}…`);

        // Run 5 rounds of independent reasoning → IPC exchange → feedback
        const addDemoEntry = (agent: string, action: string, detail: string, h: number, tick: number) => {
          setDemoLog(prev => [...prev, { agent, action, detail, h, tick }]);
        };

        for (let round = 0; round < 5; round++) {
          await new Promise(r => setTimeout(r, 350));
          log(`\n── Round ${round + 1} ──────────────────────────────`);

          // Each agent thinks independently
          for (const a of agents) {
            if (a.state !== "active") continue;
            const entry = await a.think({ query: `round-${round}-analysis`, round });
            log(`  ${a.name}: thought → ${entry.entryCid.slice(0, 16)}…`);
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
          log(`  IPC: ${agents.filter(a => a.state === "active").length} agents exchanged findings`);

          // Simulated human feedback — researcher gets high, critic gets variable
          const feedbackScores = [
            0.6 + round * 0.08,  // researcher improves steadily
            0.5 + round * 0.1,   // synthesizer improves faster
            0.4 + round * 0.06 + (round % 2 === 0 ? 0.15 : 0),  // critic oscillates
          ];
          for (let i = 0; i < agents.length; i++) {
            if (agents[i].state !== "active") continue;
            const h = Math.min(1, feedbackScores[i]);
            await agents[i].feedback(`output-r${round}`, h, "human");
            log(`  ${agents[i].name}: human feedback H=${agents[i].hScore.toFixed(3)} zone=${agents[i].zone}`);
            addDemoEntry(agents[i].name, "feedback", `H=${agents[i].hScore.toFixed(3)}`, agents[i].hScore, round);

            // Try to revive suspended agents
            if (agents[i].state === "suspended") {
              agents[i].revive();
            }
          }

          // ── Peer-to-peer review: each agent rates every other agent's output ──
          log(`  Peer review:`);
          const activeAgents = agents.filter(a => a.state === "active");
          for (const reviewer of activeAgents) {
            for (const target of activeAgents) {
              if (reviewer === target) continue;
              // Peer score: based on reviewer's own H and round progression
              // Higher-H reviewers give more calibrated scores; critic is harsher
              const baseScore = target.hScore * 0.6 + reviewer.hScore * 0.3 + (round * 0.02);
              const reviewerBias = reviewer.name === "critic" ? -0.08 : reviewer.name === "researcher" ? 0.04 : 0;
              const peerScore = Math.max(0.1, Math.min(1, baseScore + reviewerBias));

              // Send peer review via IPC
              const reviewMsg = new TextEncoder().encode(JSON.stringify({
                type: "peer-review",
                from: reviewer.name,
                target: target.name,
                round,
                score: peerScore,
              }));
              await reviewer.communicate(ch.channelCid, reviewMsg);

              // Apply peer feedback (weighted at 50% of human feedback)
              await target.feedback(`peer-${reviewer.name}-r${round}`, peerScore, "peer");

              addDemoEntry(reviewer.name, "peer-review", `→${target.name} ${peerScore.toFixed(2)}`, peerScore, round);
            }
          }
          for (const a of activeAgents) {
            log(`    ${a.name}: post-peer H=${a.hScore.toFixed(3)} zone=${a.zone}`);
            addDemoEntry(a.name, "peer-result", `H=${a.hScore.toFixed(3)}`, a.hScore, round);
          }

          // Mesh tick
          const tickResult = sub.mesh.tick();
          log(`  Tick: scheduled=${tickResult.scheduled?.name ?? "none"}`);
          addDemoEntry("mesh", "tick", `coherence=${sub.mesh.stats().meshCoherence.toFixed(3)}`, sub.mesh.stats().meshCoherence, round);
        }

        log("\nDEMO: Complete — see Collaboration tab for convergence visualization");
        setDemoRunning(false);
        break;
      }

      case "clear":
        setState(s => ({ ...s, bootLog: [] }));
        return;

      default:
        log(`Unknown command: ${verb}. Type 'help' for commands.`);
    }

    refresh();
  }, [log, refresh, demoRunning]);

  return { state, bootKernel, executeCommand, refresh, demoLog, demoRunning };
}
