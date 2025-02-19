/** @typedef {I8|U8|I16|U16|F16|I32|F32|U32|I64|F64|U64} Type */
/** @typedef {Int8Array|Uint8Array|Int16Array|Uint16Array|Float16Array|Int32Array|Float32Array|Uint32Array|BigInt64Array|Float64Array|BigUint64Array} TypedArray */
export class Number {
    /**
     * @param {TypedArray} view
     * @param {Uint8Array<ArrayBufferLike>} ui8a
     */
    constructor(view: TypedArray, ui8a: Uint8Array<ArrayBufferLike>);
    $: any;
    _: Uint8Array<ArrayBufferLike>;
    length: any;
    /**
     * @param {number|bigint} value
     * @returns
     */
    encode(value: number | bigint): Uint8Array<ArrayBufferLike>;
    /**
     * @param {Uint8Array<ArrayBufferLike>} value
     * @returns {number|bigint}
     */
    decode(value: Uint8Array<ArrayBufferLike>): number | bigint;
}
export const i8: Number;
export const i16: Number;
export const i32: Number;
export const u8: Number;
export const u16: Number;
export const u32: Number;
export const f16: Number;
export const f32: Number;
export const f64: Number;
export class BigNumber extends Number {
    /**
     * @param {Uint8Array<ArrayBufferLike>} value
     * @returns {bigint}
     */
    decode(value: Uint8Array<ArrayBufferLike>): bigint;
}
export const i64: BigNumber;
export const u64: BigNumber;
export function unsigned(value: number): [number, Uint8Array<ArrayBufferLike>];
export function encode(type: 110 | 73, value: number | bigint): [number, Uint8Array<ArrayBufferLike>];
export type Type = 129 | 133 | 137 | 141 | 143 | 145 | 153 | 149 | 161 | 157 | 165;
export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | any | Int32Array | Float32Array | Uint32Array | BigInt64Array | Float64Array | BigUint64Array;
