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
  U8A,
  I64,
  F64,

  // JS types
  BUFFER,
  RECURSIVE,
  SET,
  MAP,
  DATE,
} from '../constants.js';

import { f64, i64 } from '../number.js';

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
 * @template T
 * @param {number} as
 * @param {T} value
 * @returns {T}
 */
const track = (as, value) => {
  M.set(as, value);
  return value;
};

class Decoder {
  /**
   * @param {Uint8Array} a
   */
  constructor(a) {
    this.i = 0;
    this.a = a;
  }

  /**
   * @param {any[]} value
   * @returns
   */
  array(value) {
    for (let i = 0, length = this.length(); i < length; i++)
      value[i] = this.decode();
    return value;
  }

  /**
   * @returns {string}
   */
  ascii() {
    const length = this.length();
    const i = this.i;
    const codes = this.a.subarray(i, (this.i += length));
    return fromCharCode.apply(null, codes);
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
      case RECURSIVE: return M.get(this.length()) ?? throwOnRecursion(as);
      // JSON arrays / objects
      case OBJECT:    return this.object(track(as, {}));
      case ARRAY:     return this.array(track(as, []));
      // string
      // case ASCII:     return this.string(as, true);
      case STRING:    return this.string(as);
      // number
      case F64:       return /** @type {number} */(this.number(f64));
      // boolean
      case TRUE:      return true;
      case FALSE:     return false;
      // null
      case NULL:      return null;
      // other types
      // typed / dataview
      case U8A:       return track(as, new Uint8Array(/** @type {ArrayBuffer} */(this.decode())));
      case BUFFER:    return track(as, this.buffer());
      case DATE:      return track(as, new Date(this.ascii()));
      case MAP:       return this.map(track(as, new Map));
      case SET:       return this.set(track(as, new Set));
      case I64:       return /** @type {bigint} */(this.number(i64));
      default: {
        M.clear();
        const type = fromCharCode(this.a[as]);
        throw new TypeError(`Unable to decode type: ${type}`);
      }
    }
  }

  length() {
    let { i, a } = this;
    this.i += 9;
    return /** @type {number} */(f64.decode(a.subarray(i + 1, this.i)));
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
   * @param {import("../number.js").Number} decoder
   * @returns {number|bigint}
   */
  number(decoder) {
    let { i, a } = this;
    this.i += 8;
    return decoder.decode(a.subarray(i, this.i));
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
      return track(as, value);
    }
    return '';
  }
}

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
 * @returns
 */
export default ui8a => {
  const value = new Decoder(ui8a).decode();
  M.clear();
  return value;
};
