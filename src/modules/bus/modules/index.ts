/**
 * Sovereign Bus — Module Registrations Barrel.
 * ═════════════════════════════════════════════════════════════════
 *
 * Import this file to register all core modules on the bus.
 * Each import triggers the module's register() call as a side effect.
 *
 * @version 2.0.0
 */

// ── Layer 0: Engine (pure computation) ────────────────────────────────
import "./kernel";
import "./ring";
import "./identity";
import "./morphism";
import "./verify";

// ── Layer 1: Knowledge Graph & Services ───────────────────────────────
import "./graph";
import "./cert";
import "./uns";
import "./resolver";
import "./observable";
import "./trace";
import "./vault";
import "./continuity";
import "./local-llm";

// ── Layer 2: Bus / API Surface ────────────────────────────────────────
import "./data-engine";
import "./blueprint";
import "./oracle";
import "./store";
import "./scrape";
import "./wolfram";
import "./audio";
import "./social";
import "./sparql";
import "./mcp";

// ── Layer 3: Mesh Sync ───────────────────────────────────────────────
import "./mesh-sync";

// ── Layer 4: Sovereign Portal ────────────────────────────────────────
import "./clipboard";
