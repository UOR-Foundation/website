import { useEffect, useRef } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export type TerminalHandle = { write: (text: string) => void; clear: () => void; size: () => { cols: number; rows: number } };
export default function Terminal({ onReady, onData, onResize, visible }: { onReady: (handle: TerminalHandle) => void; onData: (data: string) => void; onResize: (size: { cols: number; rows: number }) => void; visible: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onData, onResize });
  callbacks.current = { onReady, onData, onResize };
  const fitRef = useRef<FitAddon>();
  useEffect(() => {
    if (!host.current) return;
    const style = getComputedStyle(host.current);
    const terminal = new XTerminal({ fontFamily: "JetBrains Mono, monospace", fontSize: 12, lineHeight: 1.6, cursorBlink: true, convertEol: true, scrollback: 5000, theme: { background: style.getPropertyValue("--pg-editor").trim(), foreground: style.getPropertyValue("--pg-text").trim(), cursor: style.getPropertyValue("--pg-text").trim(), selectionBackground: style.getPropertyValue("--pg-selection").trim() } });
    const fit = new FitAddon(); fitRef.current = fit;
    terminal.loadAddon(fit); terminal.open(host.current);
    const observer = new ResizeObserver(() => { if (host.current?.offsetWidth && host.current?.offsetHeight) fit.fit(); });
    observer.observe(host.current);
    const data = terminal.onData((chunk) => callbacks.current.onData(chunk));
    const resize = terminal.onResize((size) => callbacks.current.onResize(size));
    callbacks.current.onReady({ write: (text) => terminal.write(text), clear: () => terminal.clear(), size: () => ({ cols: terminal.cols, rows: terminal.rows }) });
    return () => { observer.disconnect(); data.dispose(); resize.dispose(); terminal.dispose(); };
  }, []);
  useEffect(() => { if (visible) requestAnimationFrame(() => fitRef.current?.fit()); }, [visible]);
  return <div className="pg-terminal" ref={host} aria-label="Interactive terminal" />;
}