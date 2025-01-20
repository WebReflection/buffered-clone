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

import { toASCII } from './utils/ascii.js';
import { toLength } from './utils/length.js';

/** @typedef {Map<any,number[]>} Cache */

/**
 * @typedef {object} Options
 * @prop {'all' | 'some' | 'none'} recursion With `all`, the default, everything but `null`, `boolean` and empty `string` will be tracked recursively. With `some`, all primitives get ignored. With `none`, no recursion is ever tracked, leading to *maximum callstack* if present in the encoded data.
 */

const { isArray } = Array;
const { isFinite } = Number;
const { toStringTag } = Symbol;
const { entries, getPrototypeOf } = Object;

const TypedArray = getPrototypeOf(Uint8Array);
const encoder = new TextEncoder;

/**
 * @param {any} value
 * @param {boolean} asNull
 * @returns {[boolean, number]}
 */
const asSerialized = (value, asNull) => {
  switch (asValid(value)) {
    case 'object': {
      if (value === null) return [true, NULL];
      if (value.constructor === Object) return [true, OBJECT];
      if (isArray(value)) return [true, ARRAY];
      if (value instanceof ArrayBuffer) return [true, BUFFER];
      if (value instanceof Date) return [true, DATE];
      if (value instanceof Map) return [true, MAP];
      if (value instanceof Set) return [true, SET];
      if (value instanceof Error) return [true, ERROR];
      if (value instanceof RegExp) return [true, REGEXP];
      if (
        value instanceof TypedArray ||
        value instanceof DataView
      ) return [true, TYPED];
      return [true, OBJECT];
    }
    case 'string': return [true, STRING];
    case 'number': return [true, isFinite(value) ? NUMBER : NULL];
    case 'boolean': return [true, BOOLEAN];
    case 'bigint': return [true, BIGINT];
    default: return [asNull, NULL];
  }
};

/**
 * @param {number[]} ui8
 * @param {number} type
 * @param {Uint8Array} value
 * @returns
 */
const asUint8Array = (ui8, type, value) => {
  const { length } = value;
  switch (toLength(ui8, type, length)) {
    case 1:
    case 2:
      ui8.push(...value);
      break;
    case 3:
    case 4: {
      for (let i = 0; i < length; i += (1 << 16))
        ui8.push(...value.slice(i, i + (1 << 16)));
    }
  }
};

/**
 * @param {any} value
 * @returns
 */
const asValid = value => {
  const type = typeof value;
  switch (type) {
    case 'symbol':
    case 'function':
    case 'undefined': return '';
    default: return type;
  }
};

class Is {
  /**
   * @param {Options} options
   */
  constructor(options) {
    const r = options.recursion;
    /** @type {0 | 1 | 2} */
    this.r = r === 'all' ? 2 : (r === 'none' ? 0 : 1);
    /** @type {number[]} */
    this.a = [];
    /** @type {Cache?} */
    this.m = this.r > 0 ? new Map : null;
  }

  /**
   * @param {any} value
   * @param {boolean} asNull
   */
  encode(value, asNull) {
    const known = this.r > 0 && /** @type {Cache} */(this.m).get(value);
    if (known) {
      this.a.push(...known);
      return;
    }

    const [OK, type] = asSerialized(value, asNull);
    if (OK) {
      switch (type) {
        case ARRAY: {
          this.array(value);
          break;
        }
        case OBJECT: {
          this.track(0, value);
          const values = [];
          for (const [k, v] of entries(value)) {
            if (asValid(v)) values.push(k, v);
          }
          this.object(OBJECT, values);
          break;
        }
        case STRING: {
          if (value.length) {
            this.track(1, value);
            asUint8Array(this.a, STRING, encoder.encode(value));
          }
          else this.a.push(STRING, 0);
          break;
        }
        case NUMBER:
        case BIGINT: {
          this.track(1, value);
          toASCII(this.a, type, String(value));
          break;
        }
        case BOOLEAN: {
          this.a.push(BOOLEAN, value ? 1 : 0);
          break;
        }
        case NULL: {
          this.a.push(NULL);
          break;
        }
        case BUFFER: {
          this.buffer(value);
          break;
        }
        case DATE: {
          this.track(0, value);
          toASCII(this.a, DATE, value.toISOString());
          break;
        }
        case MAP: {
          this.track(0, value);
          const values = [];
          for (const [k, v] of value) {
            if (asValid(k) && asValid(v)) values.push(k, v);
          }
          this.object(MAP, values);
          break;
        }
        case SET: {
          this.track(0, value);
          const values = [];
          for (const v of value) {
            if (asValid(v)) values.push(v);
          }
          this.object(SET, values);
          break;
        }
        case ERROR: {
          this.track(0, value);
          this.simple(ERROR, value.name, value.message);
          break;
        }
        case REGEXP: {
          this.track(0, value);
          this.simple(REGEXP, value.source, value.flags);
          break;
        }
        case TYPED: {
          this.track(0, value);
          this.simple(TYPED, value[toStringTag], value.buffer);
          break;
        }
      }
    }
  }

  /**
   * @param {0 | 1 | 2} level
   * @param {any} value
   */
  track(level, value) {
    if (this.r > level) {
      const r = [];
      toLength(r, RECURSIVE, this.a.length);
      /** @type {Cache} */(this.m).set(value, r);
    }
  }

  /**
   * @param {any[]} value
   */
  array(value) {
    this.track(0, value);
    this.null = true;
    const { length } = value;
    toLength(this.a, ARRAY, length);
    for (let i = 0; i < length; i++)
      this.encode(value[i], true);
    this.null = false;
  }

  /**
   * @param {ArrayBuffer} value
   */
  buffer(value) {
    this.track(0, value);
    asUint8Array(this.a, BUFFER, new Uint8Array(value));
  }

  /**
   * @param {number} type
   * @param {any[]} values
   */
  object(type, values) {
    const { length } = values;
    if (length) {
      toLength(this.a, type, length);
      for (let i = 0; i < length; i++)
        this.encode(values[i], false);
    }
    else
      this.a.push(type, 0);
  }

  /**
   * @param {number} type
   * @param {any} key
   * @param {any} value
   */
  simple(type, key, value) {
    this.a.push(type);
    this.encode(key, false);
    this.encode(value, false);
  }
}

/**
 * @template T
 * @param {T extends undefined ? never : T extends Function ? never : T extends symbol ? never : T} value
 * @param {Options?} options
 * @returns
 */
export default (value, options = null) => {
  const is = new Is({ recursion: 'all', ...options });
  is.encode(value, false);
  return new Uint8Array(is.a);
};
