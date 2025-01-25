//@ts-check

import {
  NULL,
  TRUE,
  FALSE,
  NUMBER,
  STRING,
  ARRAY,
  OBJECT,
  BUFFER,
  TYPED,
  RECURSIVE,
  BIGINT,
  ERROR,
  REGEXP,
  SET,
  MAP,
  DATE,
} from './constants.js';

/**
 * @typedef {object} Options
 * @prop {'all'|'some'|'none'} recursion With `all`, the default, everything recursive will be tracked. With `some`, all primitives get ignored or fail if found as recursive. With `none`, no recursion is ever tracked and an error is thrown when any recursive data is found.
 */

/**
 * @typedef {Object} Position
 * @property {number} i
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
    for (let i = 0, length = this.length(); i < length; i++)
      value.push(this.decode());
    return value;
  }

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
      case OBJECT:    return this.object(track(this.m, as, {}));
      case ARRAY:     return this.array(track(this.m, as, []));
      case STRING:    return this.string(as);
      case NUMBER:    return this.number(as, parseFloat);
      case TRUE:      return true;
      case FALSE:     return false;
      case NULL:      return null;
      case DATE:      return track(this.m, as, new Date(this.ascii()));
      case MAP:       return this.map(track(this.m, as, new Map));
      case SET:       return this.set(track(this.m, as, new Set));
      case TYPED:     return (this.i++, track(this.m, as, this.typed()));
      case BUFFER:    return track(this.m, as, this.buffer());
      case BIGINT:    return this.number(as, BigInt);
      case REGEXP:    return track(this.m, as, this.regexp());
      case ERROR:     return (this.i++, track(this.m, as, this.error()));
      default: {
        const type = fromCharCode(this.a[as]);
        throw new TypeError(`Unable to decode type: ${type}`);
      }
    }
  }

  error() {
    const name = this.ascii();
    const Class = globalThis[name] || Error;
    return new Class(this.decode());
  }

  length() {
    let { a, i } = this, value = 0;
    for (let j = 0, length = a[i++]; j < length; j++)
      value += a[i++] << (j * 8);
    this.i = i;
    return value;
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
   * @param {typeof parseFloat|typeof BigInt} create
   * @returns 
   */
  number(as, create) {
    const value = create(this.ascii());
    return this.p ? track(this.m, as, value) : value;
  }

  /**
   * @param {object} value
   * @returns
   */
  object(value) {
    for (let i = 0, length = this.length(); i < length; i += 2)
      value[this.decode()] = this.decode();
    return value;
  }

  regexp() {
    const source = this.decode();
    const flags = (this.i++, this.ascii());
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
   * @returns
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

  typed() {
    const view = this.ascii();
    const Class = globalThis[view] || Uint16Array;
    return new Class(this.decode());
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
  const value = new Decoder(r === 'none' ? V : M, ui8a, r !== 'some').decode();
  M.clear();
  return value;
};
