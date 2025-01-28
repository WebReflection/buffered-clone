//@ts-check

import {
  BIGINT,
  NUMBER,

  I8,
  U8,
  I16,
  U16,
  I32,
  F32,
  U32,
  I64,
  F64,
  U64,

  MAX_U8,
  MAX_I8,
  MAX_U16,
  MAX_I16,
  MAX_U32,
  MAX_I32,
} from './constants.js';

/** @typedef {I8|U8|I16|U16|I32|F32|U32|I64|F64|U64} Type */
/** @typedef {Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Float32Array|Uint32Array|BigInt64Array|Float64Array|BigUint64Array} TypedArray */

// type "number"
export class Number {
  /**
   * @param {TypedArray} view
   * @param {Uint8Array<ArrayBufferLike>} [ui8a]
   */
  constructor(view, ui8a = new Uint8Array(view.buffer)) {
    this.$ = view;
    this._ = ui8a;
    this.length = view.BYTES_PER_ELEMENT;
  }
  /**
   * @param {number|bigint} value
   * @returns
   */
  encode(value) {
    this.$[0] = value;
    return this._;
  }
  /**
   * @param {Uint8Array<ArrayBufferLike>} value
   * @returns {number|bigint}
   */
  decode(value) {
    this.$[0] = 0;
    this._.set(value);
    return this.$[0];
  }
}

// signed
export const i8   = new Number(new Int8Array(1));
export const i16  = new Number(new Int16Array(1));
export const i32  = new Number(new Int32Array(1));

// unsigned
const ui8a = new Uint8Array(1);
export const u8   = new Number(ui8a, ui8a);
export const u16  = new Number(new Uint16Array(1));
export const u32  = new Number(new Uint32Array(1));

// float or double precision
export const f32  = new Number(new Float32Array(1));
export const f64  = new Number(new Float64Array(1));

// type "bigint"
export class BigNumber extends Number {
  /**
   * @param {Uint8Array<ArrayBufferLike>} value
   * @returns {bigint}
   */
  decode(value) {
    this.$[0] = 0n;
    this._.set(value);
    return this.$[0];
  }
}

// signed
export const i64  = new BigNumber(new BigInt64Array(1));

// unsigned
export const u64  = new BigNumber(new BigUint64Array(1));



// encode
const { isInteger } = globalThis.Number;

/**
 * @param {number} value
 * @returns {[number,Uint8Array<ArrayBufferLike>]}
 */
const signed = value => (
  -MAX_I8 < value ? [I8, i8.encode(value)] :
  -MAX_I16 < value ? [I16, i16.encode(value)] :
  -MAX_I32 < value ? [I32, i32.encode(value)] :
  [F64, f64.encode(value)]
);

/**
 * @param {number} value
 * @returns {[number,Uint8Array<ArrayBufferLike>]}
 */
export const unsigned = value => (
  value < MAX_U8 ? [U8, u8.encode(value)] :
  value < MAX_U16 ? [U16, u16.encode(value)] :
  value < MAX_U32 ? [U32, u32.encode(value)] :
  [F64, f64.encode(value)]
);

/**
 * @param {NUMBER|BIGINT} type
 * @param {number|bigint} value
 * @returns {[number,Uint8Array<ArrayBufferLike>]}
 */
export const encode = (type, value) => type === NUMBER ?
  //@ts-ignore
  (isInteger(value) ? (value < 0 ? signed(value) : unsigned(value)) : [F64, f64.encode(value)]) :
  (value < 0n ? [I64, i64.encode(value)] : [U64, u64.encode(value)])
;

// ⚠️ F32 really messes things up losing details
// if (-MAX_F32 < valueOf && valueOf < MAX_F32) {
//   return [F32, f32.encode(valueOf)]
// }

// export const serialize = {
//   i8:   /** @param {number} value */ value => ([I8, ...i8.encode(value)]),
//   i16:  /** @param {number} value */ value => ([I16, ...i16.encode(value)]),
//   i32:  /** @param {number} value */ value => ([I32, ...i32.encode(value)]),
//   i64:  /** @param {bigint} value */ value => ([I64, ...i64.encode(value)]),
//   u8:   /** @param {number} value */ value => ([U8, ...u8.encode(value)]),
//   u16:  /** @param {number} value */ value => ([U16, ...u16.encode(value)]),
//   u32:  /** @param {number} value */ value => ([U32, ...u32.encode(value)]),
//   u64:  /** @param {bigint} value */ value => ([U64, ...u64.encode(value)]),
//   f32:  /** @param {number} value */ value => ([F32, ...f32.encode(value)]),
//   f64:  /** @param {number} value */ value => ([F64, ...f64.encode(value)]),
// };
