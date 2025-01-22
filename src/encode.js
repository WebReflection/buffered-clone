//@ts-check

import {
  NULL,
  BOOLEAN,
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

import { asASCII } from './utils/ascii.js';
import { pushLength } from './utils/length.js';
import { asValid, pushValue, pushValues, mapPair, setValue } from './utils/value.js';

/** @typedef {Map<any,number[]>} Cache */

/** @typedef {{r:number, a:number[]|Uint8Array, m:Cache?}} RAM */

/**
 * @typedef {object} Options
 * @prop {'all' | 'some' | 'none'} recursion With `all`, the default, everything but `null`, `boolean` and empty `string` will be tracked recursively. With `some`, all primitives get ignored. With `none`, no recursion is ever tracked, leading to *maximum callstack* if present in the encoded data.
 * @prop {boolean?} resizable If `true` it will use a growing `ArrayBuffer` instead of an array.
 */

const maxByteLength = (2 ** 32) - 1;

const { isArray } = Array;
const { isFinite } = Number;
const { toStringTag } = Symbol;
const { entries, getPrototypeOf } = Object;

const TypedArray = getPrototypeOf(Uint8Array);
const encoder = new TextEncoder;

class Encoder {
  /**
   * @param {0 | 1 | 2} r
   * @param {number[]|Uint8Array} a
   * @param {Map?} m
   * @param {boolean} resizable 
   */
  constructor(r, a, m, resizable) {
    this.r = r;
    this.a = a;
    this.m = m;
    this.$ = resizable;
  }

  /**
   * @param {any[]} value
   */
  array(value) {
    this.track(0, value);
    const { length } = value;
    pushLength(this.a, ARRAY, length, this.$);
    for (let i = 0; i < length; i++)
      this.encode(value[i], true);
  }

  /**
   * @param {ArrayBuffer} value
   */
  buffer(value) {
    this.track(0, value);
    const ui8a = new Uint8Array(value);
    pushLength(this.a, BUFFER, ui8a.length, this.$);
    pushValues(this.a, ui8a, this.$);
  }

  /**
   * @param {any} value
   * @param {boolean} asNull
   */
  encode(value, asNull) {
    if (this.known(value)) return;
    switch (asValid(value)) {
      case 'object': {
        switch (true) {
          case value === null: {
            pushValue(this.a, NULL, this.$);
            break;
          }
          case value.constructor === Object: {
            this.generic(value);
            break;
          }
          case isArray(value): {
            this.array(value);
            break;
          }
          case value instanceof ArrayBuffer: {
            this.buffer(value);
            break;
          }
          case value instanceof Date: {
            this.track(0, value);
            asASCII(this.a, DATE, value.toISOString(), this.$);
            break;
          }
          case value instanceof Map: {
            this.map(value);
            break;
          }
          case value instanceof Set: {
            this.set(value);
            break;
          }
          case value instanceof RegExp: {
            this.track(0, value);
            this.simple(REGEXP, value.source, value.flags, true);
            break;
          }
          case value instanceof TypedArray:
          case value instanceof DataView: {
            this.track(0, value);
            this.simple(TYPED, value[toStringTag], value.buffer, false);
            break;
          }
          case value instanceof Error: {
            this.track(0, value);
            this.simple(ERROR, value.name, value.message, true);
            break;
          }
          default: {
            this.generic(value);
            break;
          }
        }
        break;
      }
      case 'string': {
        this.string(value);
        break;
      }
      case 'number': {
        if (isFinite(value)) {
          this.track(1, value);
          asASCII(this.a, NUMBER, String(value), this.$);
        }
        else pushValue(this.a, NULL, this.$);
        break;
      }
      case 'boolean': {
        pushValues(this.a, [BOOLEAN, value ? 1 : 0], this.$);
        break;
      }
      case 'bigint': {
        this.track(1, value);
        asASCII(this.a, BIGINT, String(value), this.$);
        break;
      }
      default: {
        if (asNull) pushValue(this.a, NULL, this.$);
        break;
      }
    }
  }

  /**
   * @param {object} value
   */
  generic(value) {
    this.track(0, value);
    const values = [];
    for (let pairs = entries(value), i = 0, l = pairs.length; i < l; i++) {
      const [k, v] = pairs[i];
      if (asValid(v)) values.push(k, v);
    }
    this.object(OBJECT, values);
  }

  /**
   * @param {any} value
   * @returns
   */
  known(value) {
    const recursive = this.r > 0 && /** @type {Cache} */(this.m).get(value);
    return recursive ? (pushValues(this.a, recursive, this.$), true) : false;
  }

  /**
   * @param {Map} value
   */
  map(value) {
    this.track(0, value);
    const values = [];
    value.forEach(mapPair, values);
    this.object(MAP, values);
  }

  /**
   * @param {number} type
   * @param {any[]} values
   */
  object(type, values) {
    const { length } = values;
    pushLength(this.a, type, length, this.$);
    for (let i = 0; i < length; i++)
      this.encode(values[i], false);
  }

  /**
   * @param {Set} value
   */
  set(value) {
    this.track(0, value);
    const values = [];
    value.forEach(setValue, values);
    this.object(SET, values);
  }

  /**
   * @param {number} type
   * @param {string} key
   * @param {string|ArrayBuffer} value
   * @param {boolean} asString
   */
  simple(type, key, value, asString) {
    pushValue(this.a, type, this.$);
    if (!this.known(key)) this.string(key);
    if (!this.known(value)) {
      if (asString) this.string(/** @type {string} */(value));
      else this.buffer(/** @type {ArrayBuffer} */(value));
    }
  }

  /**
   * @param {string} value
   */
  string(value) {
    if (value.length) {
      this.track(1, value);
      const str = encoder.encode(value);
      pushLength(this.a, STRING, str.length, this.$);
      pushValues(this.a, str, this.$);
    }
    else pushValues(this.a, [STRING, 0], this.$);
  }

  /**
   * @param {0 | 1 | 2} level
   * @param {any} value
   */
  track(level, value) {
    if (this.r > level) {
      const recursive = [];
      pushLength(recursive, RECURSIVE, this.a.length, false);
      /** @type {Cache} */(this.m).set(value, recursive);
    }
  }
}

/**
 * @template T
 * @param {T extends undefined ? never : T extends Function ? never : T extends symbol ? never : T} value
 * @param {Options?} options
 * @returns {Uint8Array}
 */
export default (value, options = null) => {
  const recursion = options?.recursion ?? 'all';
  const resizable = !!options?.resizable;

  const r = recursion === 'all' ? 2 : (recursion === 'none' ? 0 : 1);

  //@ts-ignore
  const a = resizable ? new Uint8Array(new ArrayBuffer(0, { maxByteLength })) : [];

  const m = r > 0 ? new Map : null;

  (new Encoder(r, a, m, resizable)).encode(value, false);

  return /** @type {Uint8Array} */(resizable ? a : new Uint8Array(a));
};
