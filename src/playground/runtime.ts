import { WebContainer, type WebContainerProcess } from "@webcontainer/api";
import type { ProjectFiles } from "./project";

let instance: Promise<WebContainer> | undefined;

export async function ensureIsolation(): Promise<boolean> {
  if (window.crossOriginIsolated) { sessionStorage.removeItem("prism-isolation-reloaded"); return true; }
  if (window.self !== window.top || !window.isSecureContext || !("serviceWorker" in navigator)) return false;
  if (sessionStorage.getItem("prism-isolation-reloaded")) return false;
  await navigator.serviceWorker.register("/playground/coi-serviceworker.js", { scope: "/playground/" });
  await navigator.serviceWorker.ready;
  sessionStorage.setItem("prism-isolation-reloaded", "1");
  window.location.reload();
  return false;
}

export async function getRuntime(): Promise<WebContainer> {
  if (!window.crossOriginIsolated) throw new Error("Open Playground in its own tab to enable the browser runtime.");
  if (!instance) instance = WebContainer.boot({ coep: "credentialless", workdirName: "prism-playground" }).catch((error) => { instance = undefined; throw error; });
  return instance;
}

export async function syncFiles(runtime: WebContainer, files: ProjectFiles, previous: string[] = []): Promise<void> {
  for (const name of previous) if (!(name in files)) await runtime.fs.rm(name, { force: true });
  for (const [name, contents] of Object.entries(files)) {
    const directory = name.slice(0, name.lastIndexOf("/"));
    if (name.includes("/")) await runtime.fs.mkdir(directory, { recursive: true });
    await runtime.fs.writeFile(name, contents);
  }
}

export function pipeOutput(process: WebContainerProcess, write: (chunk: string) => void): Promise<void> {
  return process.output.pipeTo(new WritableStream({ write }));
}