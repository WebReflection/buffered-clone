//@ts-check

import {
  // JSON
  ARRAY,
  OBJECT,
  STRING,
  TRUE,
  FALSE,
  NULL,

  // numbers
  I8A, I8,
  U8A, U8,
  I16A, I16,
  U16A, U16,
  I32A, I32,
  F32A, F32,
  U32A, U32,
  I64A, I64,
  F64A, F64,
  U64A, U64,

  // JS types
  BUFFER,
  RECURSIVE,
  ERROR,
  REGEXP,
  SET,
  MAP,
  DATE,
  DATAVIEW,
  IMAGEDATA,
} from './constants.js';

import * as number from './number.js';

/**
 * @typedef {object} Options
 * @prop {'all'|'some'|'none'} recursion With `all`, the default, everything recursive will be tracked. With `some`, all primitives get ignored or fail if found as recursive. With `none`, no recursion is ever tracked and an error is thrown when any recursive data is found.
 */

const { fromCharCode } = String;
const decoder = new TextDecoder;

/**
 * @param {number} at
 */
const throwOnRecursion = at => {
  M.clear();
  throw new SyntaxError(`Unexpected Recursion @ ${at}`);
};

/**
 * @param {M|V} map
 * @param {number} as
 * @param {any} value
 * @returns
 */
const track = (map, as, value) => {
  map.set(as, value);
  return value;
};

class Decoder {
  /**
   * @param {Uint8Array} a
   * @param {M|V} m
   * @param {boolean} p
   */
  constructor(m, a, p) {
    this.i = 0;
    this.m = m;
    this.a = a;
    this.p = p;
  }

  /**
   * @param {any[]} value
   * @returns
   */
  array(value) {
    for (let i = 0; i < value.length; i++)
      value[i] = this.decode();
    return value;
  }

  /**
   * @returns {string}
   */
  ascii() {
    const length = this.length();
    if (length) {
      const i = this.i;
      const codes = this.a.subarray(i, (this.i += length));
      return fromCharCode.apply(null, codes);
    }
    return '';
  }

  buffer() {
    const length = this.length();
    const start = this.i;
    const end = (this.i += length);
    return this.a.buffer.slice(start, end);
  }

  decode() {
    const as = this.i;
    switch (this.a[this.i++]) {
      case RECURSIVE: return this.m.get(this.length()) ?? throwOnRecursion(as);
      // JSON arrays / objects
      case OBJECT:    return this.object(track(this.m, as, {}));
      case ARRAY:     return this.array(track(this.m, as, new Array(this.length())));
      // strings
      // case ASCII:     return this.string(as, true);
      case STRING:    return this.string(as);
      // numbers
      case I8:        return this.number(as, number.i8);
      case U8:        return this.number(as, number.u8);
      case I16:       return this.number(as, number.i16);
      case U16:       return this.number(as, number.u16);
      case I32:       return this.number(as, number.i32);
      case F32:       return this.number(as, number.f32);
      case U32:       return this.number(as, number.u32);
      case I64:       return this.number(as, number.i64);
      case F64:       return this.number(as, number.f64);
      case U64:       return this.number(as, number.u64);
      // typed / dataview
      case I8A:       return track(this.m, as, new Int8Array(this.decode()));
      case U8A:       return track(this.m, as, new Uint8Array(this.decode()));
      case I16A:      return track(this.m, as, new Int16Array(this.decode()));
      case U16A:      return track(this.m, as, new Uint16Array(this.decode()));
      case I32A:      return track(this.m, as, new Int32Array(this.decode()));
      case F32A:      return track(this.m, as, new Float32Array(this.decode()));
      case U32A:      return track(this.m, as, new Uint32Array(this.decode()));
      case I64A:      return track(this.m, as, new BigInt64Array(this.decode()));
      case F64A:      return track(this.m, as, new Float64Array(this.decode()));
      case U64A:      return track(this.m, as, new BigUint64Array(this.decode()));
      case DATAVIEW:  return track(this.m, as, new DataView(this.decode()));
      /* c8 ignore next */
      case IMAGEDATA: return this.imageData(as);
      // boolean
      case TRUE:      return true;
      case FALSE:     return false;
      // null
      case NULL:      return null;
      // other types
      case DATE:      return track(this.m, as, new Date(this.ascii()));
      case MAP:       return this.map(track(this.m, as, new Map));
      case SET:       return this.set(track(this.m, as, new Set));
      case BUFFER:    return track(this.m, as, this.buffer());
      case REGEXP:    return track(this.m, as, this.regexp());
      case ERROR:     return track(this.m, as, this.error());
      default: {
        M.clear();
        const type = fromCharCode(this.a[as]);
        throw new TypeError(`Unable to decode type: ${type}`);
      }
    }
  }

  /**
   * @returns {Error}
   */
  error() {
    this.i++;
    const name = this.ascii();
    const Class = globalThis[name] || Error;
    return new Class(this.decode());
  }

  /* c8 ignore next 11 */
  imageData(as) {
    const data = this.decode();
    const width = this.decode();
    const height = this.decode();
    this.i++;
    const colorSpace = /** @type {PredefinedColorSpace} */(this.ascii());
    const ui8c = new Uint8ClampedArray(data.buffer);
    const value = new ImageData(ui8c, width, height, { colorSpace });
    this.m.set(as, value);
    return value;
  }

  /**
   * @returns {number}
   */
  length() {
    const { a, i } = this;
    switch (a[i]) {
      case U8:  {
        this.i += 2;
        return a[i + 1];
      };
      case U16: {
        const value = a.subarray(i + 1, this.i += 3);
        return /** @type {number} */(number.u16.decode(value));
      }
      default: {
        const value = a.subarray(i + 1, this.i += 5);
        return /** @type {number} */(number.u32.decode(value));
      }
    }
  }

  /**
   * @param {Map} value
   * @returns
   */
  map(value) {
    for (let i = 0, length = this.length(); i < length; i += 2)
      value.set(this.decode(), this.decode());
    return value;
  }

  /**
   * @param {number} as
   * @param {import("./number.js").Number} decoder
   * @returns {number|bigint}
   */
  number(as, decoder) {
    let { i, m, a } = this;
    this.i += decoder.length;
    const value = decoder === number.u8 ? a[i] : decoder.decode(a.subarray(i, this.i));
    return this.p ? track(m, as, value) : value;
  }

  /**
   * @param {object} value
   * @returns {object}
   */
  object(value) {
    for (let i = 0, length = this.length(); i < length; i += 2)
      value[this.decode()] = this.decode();
    return value;
  }

  /**
   * @returns {RegExp}
   */
  regexp() {
    const source = this.decode();
    this.i++;
    const flags = this.ascii();
    return new RegExp(source, flags);
  }

  /**
   * @param {Set} value
   * @returns
   */
  set(value) {
    for (let i = 0, length = this.length(); i < length; i++)
      value.add(this.decode());
    return value;
  }

  /**
   * @param {number} as
   * @returns {string}
   */
  string(as) {
    const length = this.length();
    if (length) {
      const start = this.i;
      const end = (this.i += length);
      // ⚠️ this cannot be a subarray because TextDecoder will
      // complain if the view's buffer is a SharedArrayBuffer
      // or, probably, also if it was a resizable ArrayBuffer
      const value = decoder.decode(this.a.slice(start, end));
      return this.p ? track(this.m, as, value) : value;
    }
    return '';
  }
}

const V = {
  /**
   * @param {number} i
   */
  get(i) {},

  /**
   * @param {number} i
   * @param {any} value
   */
  set(i, value) {},
};

// ⚠️ in encode it was not possible to
//    encode while encoding due shared Map
//    in here there is not such thing because
//    nothing can decode while decoding *but*
//    if one day a fromBufferedClone thing happens
//    and it happens during decoding, this shared
//    map idea becomes more dangerous than useful.
/** @typedef {Map<number,any>} */
const M = new Map;

/**
 * @param {Uint8Array<ArrayBuffer>} ui8a
 * @param {Options?} options
 * @returns
 */
export default (ui8a, options) => {
  const r = options?.recursion;
  const value = ui8a.length ? new Decoder(r === 'none' ? V : M, ui8a, r !== 'some').decode() : void 0;
  M.clear();
  return value;
};
