/**
 * @this {any[]}
 * @param {any} v
 * @param {string|symbol} k
 */
export function mapPair(this: any[], v: any, k: string | symbol): void;
/**
 * @this {any[]}
 * @param {any} v
 */
export function setValue(this: any[], v: any): void;
export function pushLength(RAM: RAM | Recursion, type: number, length: number): void;
export function asASCII(RAM: RAM, type: number, str: string): void;
export function asValid(value: any): "string" | "number" | "bigint" | "boolean" | "object" | "";
export function pushValue(RAM: RAM, value: number): void;
export function pushValues(RAM: RAM, values: number[] | Uint8Array): void;
export function pushView(RAM: RAM, view: Uint8Array): void;
export type RAM = import("../encode.js").RAM;
export type Recursion = import("../encode.js").Recursion;
