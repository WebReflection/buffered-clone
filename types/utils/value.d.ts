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
export function asValid(value: any): "string" | "number" | "bigint" | "boolean" | "object" | "";
export function pushValue(RAM: import("../encode.js").RAM, value: number): void;
export function pushValues(RAM: import("../encode.js").RAM, values: number[] | Uint8Array): void;
export function pushView(RAM: import("../encode.js").RAM, view: Uint8Array): void;
