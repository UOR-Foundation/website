/**
 * useBootStatus — React hook for sovereign boot state.
 *
 * Subscribes to SystemEventBus for real-time seal status updates.
 *
 * @module boot/useBootStatus
 */

import { useState, useEffect, useCallback } from "react";
import type { BootReceipt, BootProgress, SealStatus } from "./types";
import { sovereignBoot, getBootReceipt } from "./sovereign-boot";
import { SystemEventBus } from "@/modules/kernel/observable/system-event-bus";

interface BootStatus {
  /** Boot receipt (null until boot completes). */
  receipt: BootReceipt | null;
  /** Current boot progress. */
  progress: BootProgress | null;
  /** Seal status. */
  status: SealStatus | "booting" | "failed";
  /** Whether the system is sealed (nominal). */
  isSealed: boolean;
  /** Boot time in ms. */
  bootTimeMs: number | null;
  /** Last verification timestamp. */
  lastVerified: string | null;
}

export function useBootStatus(): BootStatus {
  const [receipt, setReceipt] = useState<BootReceipt | null>(getBootReceipt);
  const [progress, setProgress] = useState<BootProgress | null>(null);
  const [status, setStatus] = useState<SealStatus | "booting" | "failed">(
    getBootReceipt() ? getBootReceipt()!.seal.status : "booting",
  );
  const [lastVerified, setLastVerified] = useState<string | null>(null);

  const handleProgress = useCallback((p: BootProgress) => {
    setProgress(p);
  }, []);

  useEffect(() => {
    // If already booted, use cached receipt
    const existing = getBootReceipt();
    if (existing) {
      setReceipt(existing);
      setStatus(existing.seal.status);
      setLastVerified(existing.lastVerified);
      return;
    }

    // Boot
    sovereignBoot(handleProgress)
      .then((r) => {
        setReceipt(r);
        setStatus(r.seal.status);
        setLastVerified(r.lastVerified);
      })
      .catch(() => {
        setStatus("failed");
      });
  }, [handleProgress]);

  // Subscribe to sovereignty events for live updates
  useEffect(() => {
    const unsub = SystemEventBus.subscribe((event) => {
      if (event.source !== "sovereignty") return;

      if (event.operation.startsWith("violation:")) {
        setStatus("broken");
      } else if (event.operation === "heartbeat") {
        setLastVerified(new Date().toISOString());
      }
    });
    return unsub;
  }, []);

  return {
    receipt,
    progress,
    status,
    isSealed: status === "sealed",
    bootTimeMs: receipt?.bootTimeMs ?? null,
    lastVerified,
  };
}
