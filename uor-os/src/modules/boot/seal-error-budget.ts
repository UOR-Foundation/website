/**
 * Seal Error Budget — Rolling Window Tracker
 * ═══════════════════════════════════════════
 *
 * Subscribes to SystemEventBus sovereignty events and maintains a
 * circular buffer of the last 100 checks. Exposes a live error budget
 * (success rate %) for the self-assessment dashboard.
 *
 * @module boot/seal-error-budget
 */

import { SystemEventBus } from "@/modules/observable/system-event-bus";

const WINDOW_SIZE = 100;

interface BudgetEntry {
  success: boolean;
  timestamp: number;
}

const buffer: BudgetEntry[] = [];
let cursor = 0;
let totalRecorded = 0;

function record(success: boolean) {
  const entry: BudgetEntry = { success, timestamp: Date.now() };
  if (totalRecorded < WINDOW_SIZE) {
    buffer.push(entry);
  } else {
    buffer[cursor % WINDOW_SIZE] = entry;
  }
  cursor = (cursor + 1) % WINDOW_SIZE;
  totalRecorded++;
}

// Auto-subscribe on import
SystemEventBus.subscribe((event) => {
  if (event.source !== "sovereignty") return;
  const op = event.operation;
  if (op.startsWith("violation:")) {
    record(false);
  } else if (op === "heartbeat" || op.startsWith("boot:")) {
    record(true);
  }
});

export interface ErrorBudget {
  total: number;
  failures: number;
  successRate: number; // 0–100
}

export function getErrorBudget(): ErrorBudget {
  const total = buffer.length;
  if (total === 0) return { total: 0, failures: 0, successRate: 100 };
  const failures = buffer.filter((e) => !e.success).length;
  const successRate = ((total - failures) / total) * 100;
  return { total, failures, successRate: Math.round(successRate * 10) / 10 };
}
