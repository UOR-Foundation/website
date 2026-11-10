import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, Download, FileCode2, FileJson, Loader2, Play, Plus, RotateCcw, Share2, Square, TerminalSquare, Trash2, X } from "lucide-react";
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { strToU8, zipSync } from "fflate";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import SiteHeader from "@/site/SiteHeader";
import { Button } from "./Button";
import CodeEditor from "./CodeEditor";
import Terminal, { type TerminalHandle } from "./Terminal";
import { createProject, EXAMPLES, loadProject, encodeProject, PRISM_CODE_VERSION, STORAGE_KEY, validFilename, type ProjectFiles } from "./project";
import { ensureIsolation, getRuntime, pipeOutput, syncFiles } from "./runtime";

type Status = "starting" | "ready" | "installing" | "running" | "error" | "unavailable";
export default function Playground() {
  const [files, setFiles] = useState<ProjectFiles>(loadProject);
  const [active, setActive] = useState("index.ts");
  const [status, setStatus] = useState<Status>("starting");
  const [message, setMessage] = useState("");
  const [example, setExample] = useState("identity");
  const [copied, setCopied] = useState(false);
  const [mobileView, setMobileView] = useState<"editor" | "output">("editor");
  const [outputView, setOutputView] = useState<"console" | "terminal" | "preview">("console");
  const [previewUrl, setPreviewUrl] = useState("");
  const [addFile, setAddFile] = useState(false);
  const [filename, setFilename] = useState("");
  const [fileError, setFileError] = useState("");
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const runtime = useRef<WebContainer>();
  const process = useRef<WebContainerProcess>();
  const shell = useRef<WebContainerProcess>();
  const input = useRef<WritableStreamDefaultWriter<string>>();
  const terminal = useRef<TerminalHandle>();
  const terminalBuffer = useRef("");
  const installedPackage = useRef("");
  const syncedNames = useRef<string[]>([]);
  const filesRef = useRef(files); filesRef.current = files;
  const busy = useRef(false);
  const runRef = useRef<() => void>(() => {});
  const writeTerminal = useCallback((text: string) => {
    if (terminal.current) terminal.current.write(text); else terminalBuffer.current = (terminalBuffer.current + text).slice(-100_000);
  }, []);
  const writeConsole = useCallback((text: string) => {
    const clean = text.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "");
    setOutput((previous) => [...previous, clean].slice(-1000));
  }, []);

  useEffect(() => {
    document.title = "Playground · UOR Foundation";
    return () => { document.title = "UOR Foundation · Your Verifiable Agentic Foundation"; };
  }, []);
  useEffect(() => {
    const timeout = setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(files)); } catch { /* Storage can be unavailable in private browsing. */ } }, 300);
    return () => clearTimeout(timeout);
  }, [files]);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    async function start() {
      try {
        if (!(await ensureIsolation())) {
          if (!cancelled) { setStatus("unavailable"); setMessage(window.self !== window.top ? "Open Playground in its own tab to run code." : "This browser could not enable the runtime. Try a desktop Chrome or Edge window with site storage enabled."); }
          return;
        }
        const container = await getRuntime();
        if (cancelled) return;
        runtime.current = container;
        await syncFiles(container, filesRef.current); syncedNames.current = Object.keys(filesRef.current);
        unsubscribe = container.on("server-ready", (_port, url) => { setPreviewUrl(url); setOutputView("preview"); setMobileView("output"); });
        const sh = await container.spawn("jsh", [], { terminal: terminal.current?.size() ?? { cols: 80, rows: 20 } });
        if (cancelled) { sh.kill(); return; }
        shell.current = sh; input.current = sh.input.getWriter();
        void pipeOutput(sh, writeTerminal).catch(() => {});
        setStatus("installing");
        void install(container).then(() => { if (!busy.current) setStatus("ready"); }).catch((error) => { if (!cancelled) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Could not install prism-code."); } });
      } catch (error) {
        if (!cancelled) { setStatus("error"); setMessage(error instanceof Error ? error.message : "The browser runtime could not start."); }
      }
    }
    void start();
    return () => { cancelled = true; unsubscribe?.(); process.current?.kill(); shell.current?.kill(); input.current?.releaseLock(); };
  }, [writeTerminal]);

  const installing = useRef<Promise<void>>();
  const install = useCallback((container: WebContainer): Promise<void> => {
    const pkg = filesRef.current["package.json"];
    if (installedPackage.current === pkg) return Promise.resolve();
    if (installing.current) return installing.current;
    installing.current = (async () => {
      writeConsole("Installing prism-code…\n");
      const task = await container.spawn("npm", ["install", "--no-audit", "--no-fund", "--progress=false", "--prefer-offline", "--no-package-lock"]);
      const code = await task.exit;
      if (code !== 0) throw new Error("Could not install prism-code. Check your connection and package.json, then press Run to retry.");
      installedPackage.current = pkg; writeConsole("prism-code installed\n");
    })().finally(() => { installing.current = undefined; });
    return installing.current;
  }, [writeConsole]);

  const run = useCallback(async () => {
    const container = runtime.current;
    if (!container || busy.current) return;
    busy.current = true; setMessage(""); setExitCode(null); setMobileView("output"); setOutputView("console");
    try {
      await syncFiles(container, filesRef.current, syncedNames.current); syncedNames.current = Object.keys(filesRef.current);
      if (installing.current || installedPackage.current !== filesRef.current["package.json"]) { setStatus("installing"); await installing.current?.catch(() => {}); await install(container); }
      setOutput([]);
      setStatus("running"); writeConsole("$ npm start\n\n");
      const task = await container.spawn("npm", ["start"]); process.current = task;
      const streaming = pipeOutput(task, writeConsole); const code = await task.exit; await streaming;
      setExitCode(code); setStatus("ready");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Execution failed."); }
    finally { process.current = undefined; busy.current = false; }
  }, [writeConsole, install]);
  runRef.current = () => { void run(); };
  const stop = () => { process.current?.kill(); };
  const reset = (id: string) => { process.current?.kill(); setFiles(createProject(id)); setExample(id); setActive("index.ts"); setOutput([]); setExitCode(null); setConfirmReset(null); window.history.replaceState(null, "", window.location.pathname); };
  const share = async () => {
    try {
      const url = new URL(window.location.href); url.hash = `code=${encodeProject(files)}`;
      await navigator.clipboard.writeText(url.toString()); setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { setMessage("Could not copy the link. Allow clipboard access and try again."); }
  };
  const download = () => {
    const data = zipSync(Object.fromEntries(Object.entries(files).map(([name, value]) => [name, strToU8(value)])));
    const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: "application/zip" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "prism-playground.zip"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const createFile = () => {
    const name = filename.trim();
    if (!validFilename(name)) { setFileError("Enter a valid filename, such as helpers.ts."); return; }
    if (name in files) { setFileError("That file already exists."); return; }
    if (Object.keys(files).length >= 30) { setFileError("This project already has 30 files."); return; }
    setFiles((previous) => ({ ...previous, [name]: "" })); setActive(name); setAddFile(false); setFilename(""); setFileError("");
  };
  const blocked = status === "starting" || status === "unavailable" || !runtime.current;
  const executing = status === "running" || (status === "installing" && busy.current);

  return <div className="foundation playground">
    <SiteHeader />
    <main className="pg-main">
      <div className="pg-heading"><div><p className="pg-eyebrow">// EXPLORE WITH CODE</p><h1>Prism Playground<span className="pg-heading-dot">.</span></h1></div><span className="pg-runtime-status"><span className={`pg-status-dot ${status === "ready" ? "pg-status-ready" : ""}`} />{status === "starting" ? "Starting runtime" : status === "installing" ? "Installing prism-code" : status === "running" ? "Running" : status === "ready" ? "Ready" : "Runtime unavailable"}</span></div>
      <div className="pg-workspace">
        <div className="pg-toolbar">
          <div className="pg-example"><FileCode2 size={16} /><select aria-label="Example" value={example} onChange={(event) => setConfirmReset(event.target.value)} disabled={executing}>{EXAMPLES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14} /></div>
          <span className="pg-toolbar-spacer" />
          <Button icon title="Reset example" aria-label="Reset example" onClick={() => setConfirmReset(example)} disabled={executing}><RotateCcw size={16} /></Button>
          <Button icon title="Download project" aria-label="Download project" onClick={download}><Download size={16} /></Button>
          <Button onClick={() => { void share(); }} title="Copy share link" aria-label="Copy share link">{copied ? <Check size={16} /> : <Share2 size={16} />}<span className="pg-share-label">{copied ? "Copied" : "Share"}</span></Button>
          <span className="pg-toolbar-divider" />
          <Button variant="primary" onClick={executing ? stop : () => { void run(); }} disabled={blocked}>{executing ? <Square size={13} /> : <Play size={13} />} {executing ? "Stop" : "Run"}</Button>
        </div>
        {(message || status === "unavailable") && <div className="pg-notice" role="status"><span>{message}</span>{status === "unavailable" && <a href={window.location.href} target="_blank" rel="noreferrer">Open Playground <ArrowUpRight size={15} /></a>}{status === "error" && !runtime.current && <Button onClick={() => window.location.reload()}>Retry</Button>}</div>}
        <div className="pg-mobile-tabs"><Button aria-pressed={mobileView === "editor"} onClick={() => setMobileView("editor")}>Editor</Button><Button aria-pressed={mobileView === "output"} onClick={() => setMobileView("output")}>Output</Button></div>
        <div className="pg-panels">
          <section className={`pg-editor-panel ${mobileView !== "editor" ? "pg-mobile-hidden" : ""}`} aria-label="Code editor">
            <div className="pg-filebar"><div className="pg-file-tabs">{Object.keys(files).map((name) => <Button key={name} className={active === name ? "pg-file-active" : ""} onClick={() => setActive(name)} title={name}>{name.endsWith(".json") ? <FileJson size={14} /> : <FileCode2 size={14} />}{name}</Button>)}</div><Button icon aria-label="Add file" title="Add file" onClick={() => setAddFile(true)}><Plus size={16} /></Button>{active !== "index.ts" && active !== "package.json" && active !== "tsconfig.json" && <Button icon aria-label="Delete file" title="Delete file" onClick={() => { setFiles((previous) => Object.fromEntries(Object.entries(previous).filter(([name]) => name !== active))); setActive("index.ts"); }}><X size={15} /></Button>}</div>
            <div className="pg-editor"><CodeEditor filename={active} value={files[active] ?? ""} onChange={(value) => setFiles((previous) => ({ ...previous, [active]: value }))} onRun={() => runRef.current()} /></div>
            <div className="pg-editor-footer"><span>TypeScript</span><span>UTF 8<span className="pg-footer-divider" />prism-code {PRISM_CODE_VERSION}</span></div>
          </section>
          <section className={`pg-output-panel ${mobileView !== "output" ? "pg-mobile-hidden" : ""}`} aria-label="Output">
            <div className="pg-output-tabs"><Button className={outputView === "console" ? "pg-tab-active" : ""} onClick={() => setOutputView("console")}>Console</Button><Button className={outputView === "terminal" ? "pg-tab-active" : ""} onClick={() => setOutputView("terminal")}><TerminalSquare size={14} />Terminal</Button><Button className={outputView === "preview" ? "pg-tab-active" : ""} onClick={() => setOutputView("preview")}>Preview</Button><span className="pg-toolbar-spacer" /><Button icon title="Clear output" aria-label="Clear output" onClick={() => { setOutput([]); setExitCode(null); terminal.current?.clear(); }}><Trash2 size={14} /></Button></div>
            {outputView === "console" && <div className="pg-console" role="log" aria-live="polite">{output.length ? <><pre>{output.join("")}</pre>{exitCode !== null && <p className="pg-exit">{exitCode === 0 ? <Check size={14} /> : <X size={14} />}Process exited with code {exitCode}</p>}</> : <div className="pg-empty"><TerminalSquare size={30} strokeWidth={1} /><span>{status === "starting" ? "Starting browser runtime…" : "Ready when you are."}</span>{status === "starting" && <Loader2 className="pg-spinner" size={16} />}</div>}</div>}
            <div className={`pg-terminal-wrap ${outputView !== "terminal" ? "pg-hidden" : ""}`}><Terminal visible={outputView === "terminal" && mobileView === "output"} onReady={(handle) => { terminal.current = handle; handle.write(terminalBuffer.current); terminalBuffer.current = ""; }} onData={(data) => { void input.current?.write(data).catch(() => {}); }} onResize={(size) => shell.current?.resize(size)} /></div>
            {outputView === "preview" && (previewUrl ? <iframe className="pg-preview" title="Application preview" src={previewUrl} allow="cross-origin-isolated" /> : <div className="pg-empty"><FileCode2 size={30} strokeWidth={1} /><span>No server running.</span></div>)}
            <div className="pg-output-footer"><span>{executing ? <Loader2 className="pg-spinner" size={12} /> : <span className="pg-status-dot" />}{executing ? "Executing" : "Output"}</span>{previewUrl && <a href={previewUrl} target="_blank" rel="noreferrer">Open preview <ArrowUpRight size={12} /></a>}<span>WebContainers</span></div>
          </section>
        </div>
      </div>
      <footer className="pg-page-footer"><span>© 2026 The UOR Foundation.</span><a href="https://webcontainers.io" target="_blank" rel="noreferrer">Powered by WebContainers <ArrowUpRight size={12} /></a></footer>
    </main>
    {addFile && <div className="pg-modal-backdrop"><form className="pg-modal" onSubmit={(event) => { event.preventDefault(); createFile(); }}><div className="pg-modal-title"><h2>New file</h2><Button icon aria-label="Close dialog" onClick={() => { setAddFile(false); setFileError(""); }} type="button"><X size={18} /></Button></div><input autoFocus aria-label="Filename" placeholder="helpers.ts" value={filename} onChange={(event) => setFilename(event.target.value)} />{fileError && <p role="alert">{fileError}</p>}<div className="pg-modal-actions"><Button type="button" onClick={() => setAddFile(false)}>Cancel</Button><Button variant="primary" type="submit"><Plus size={14} />Create</Button></div></form></div>}
    {confirmReset && <div className="pg-modal-backdrop"><div className="pg-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">Replace this project?</h2><p>Your current edits will be replaced with the selected example.</p><div className="pg-modal-actions"><Button onClick={() => setConfirmReset(null)}>Cancel</Button><Button variant="primary" onClick={() => reset(confirmReset)}>Replace</Button></div></div></div>}
  </div>;
}