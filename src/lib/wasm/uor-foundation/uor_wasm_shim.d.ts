/* tslint:disable */
/* eslint-disable */

export function bnot(x: number): number;
export function byte_basis(x: number): Uint8Array;
export function byte_popcount(x: number): number;
export function classify_byte(x: number): string;
export function crate_version(): string;
export function evaluate_expr(expr: string): number;
export function factorize(x: number): Uint8Array;
export function list_namespaces(): string;
export function neg(x: number): number;
export function pred(x: number): number;
export function ring_add(a: number, b: number): number;
export function ring_and(a: number, b: number): number;
export function ring_mul(a: number, b: number): number;
export function ring_or(a: number, b: number): number;
export function ring_sub(a: number, b: number): number;
export function ring_xor(a: number, b: number): number;
export function succ(x: number): number;
export function verify_all_critical_identity(): boolean;
export function verify_critical_identity(x: number): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;
export type SyncInitInput = BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly bnot: (a: number) => number;
    readonly byte_basis: (a: number) => [number, number];
    readonly byte_popcount: (a: number) => number;
    readonly classify_byte: (a: number) => [number, number];
    readonly crate_version: () => [number, number];
    readonly evaluate_expr: (a: number, b: number) => number;
    readonly factorize: (a: number) => [number, number];
    readonly list_namespaces: () => [number, number];
    readonly neg: (a: number) => number;
    readonly pred: (a: number) => number;
    readonly ring_add: (a: number, b: number) => number;
    readonly ring_and: (a: number, b: number) => number;
    readonly ring_mul: (a: number, b: number) => number;
    readonly ring_or: (a: number, b: number) => number;
    readonly ring_sub: (a: number, b: number) => number;
    readonly ring_xor: (a: number, b: number) => number;
    readonly succ: (a: number) => number;
    readonly verify_all_critical_identity: () => number;
    readonly verify_critical_identity: (a: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;
export default function __wbg_init(module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
