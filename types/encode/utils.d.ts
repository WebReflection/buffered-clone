export function asASCII(RAM: RAM, type: number, str: string): void;
export function asValid(value: any): "string" | "number" | "bigint" | "boolean" | "object" | "";
export function pushLength(RAM: RAM | Recursion, type: number, length: number): void;
export function pushValue(RAM: RAM, value: number): void;
export function pushValues(RAM: RAM, values: number[] | Uint8Array): void;
export function pushView(RAM: RAM, view: number[] | Uint8Array): void;
export type RAM = import("../encode.js").RAM;
export type Recursion = import("../encode.js").Recursion;
