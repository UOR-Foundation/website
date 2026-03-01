/**
 * PageShell — Hologram-enhanced wrapper around the shared PageShell.
 * Injects CoherenceWidget into the header automatically.
 */

import { PageShell as SharedPageShell, type PageShellProps as SharedPageShellProps } from "@/modules/core/ui/PageShell";
import { CoherenceWidget } from "../CoherenceWidget";
import type { ReactNode } from "react";

export type PageShellProps = SharedPageShellProps;

export function PageShell(props: PageShellProps) {
  const headerRight: ReactNode = (
    <>
      <CoherenceWidget />
      {props.headerRight}
    </>
  );

  return <SharedPageShell {...props} headerRight={headerRight} />;
}
