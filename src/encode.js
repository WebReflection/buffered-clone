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
import { asValid, pushValue, pushValues, pushView, mapPair, setValue } from './utils/value.js';

/** @typedef {Map<any,number[]>} Cache */
/** @typedef {0|1|2} recursion */
/** @typedef {{r:recursion, a:number[]|Uint8Array, m:Cache?, $:boolean, _:number}} RAM */
/** @typedef {{a:number[]|Uint8Array, $:false, _:number}} Recursion */

/**
 * @typedef {object} Options
 * @prop {'all' | 'some' | 'none'} recursion With `all` being the default, everything but `null`, `boolean` and empty `string` will be tracked recursively. With `some`, all primitives get ignored. With `none`, no recursion is ever tracked, leading to *maximum callstack* if present in the encoded data.
 * @prop {boolean?} resizable If `true` it will use a growing `ArrayBuffer` instead of an array.
 * @prop {ArrayBuffer?} buffer If passed, it will be filled with all encoded *uint8* values.
 * @prop {number} maxByteLength If passed, no more than those bytes will ever be allocated. The maximum value is `(2 ** 32) - 1` but here its default is `2 ** 26` (8MB of data, usually plenty for normal operations). See https://tc39.es/ecma262/multipage/structured-data.html#sec-resizable-arraybuffer-guidelines to know more.
 */

const MAX_BYTE_LENGTH = (2 ** 26);

const { isArray } = Array;
const { isView } = ArrayBuffer;
const { isFinite } = Number;
const { entries } = Object;
const { toStringTag } = Symbol;

const encoder = new TextEncoder;

class Encoder {
  /**
   * @param {recursion} r
   * @param {number[]|Uint8Array} a
   * @param {Cache?} m
   * @param {boolean} resizable
   * @param {boolean} typed
   */
  constructor(r, a, m, resizable, typed) {
    this.r = r;
    this.a = a;
    this.m = m;

    /** @type {number} */
    this._ = 0;
    this.$ = resizable;
    this.T = typed;
  }

  /**
   * @param {any[]} value
   */
  array(value) {
    this.track(0, value);
    const { length } = value;
    pushLength(this, ARRAY, length);
    for (let i = 0; i < length; i++)
      this.encode(value[i], true);
  }

  /**
   * @param {ArrayBuffer} value
   */
  buffer(value) {
    this.track(0, value);
    const ui8a = new Uint8Array(value);
    pushLength(this, BUFFER, ui8a.length);
    if (this.T) pushView(this, ui8a);
    else pushValues(this, ui8a);
  }

  /**
   * @param {Error} error
   */
  error({ name, message }) {
    pushValue(this, ERROR);
    if (!this.known(name)) asASCII(this, STRING, name);
    if (!this.known(message)) this.string(message);
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
            pushValue(this, NULL);
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
            asASCII(this, DATE, value.toISOString());
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
            this.regexp(value);
            break;
          }
          case isView(value): {
            this.track(0, value);
            const Class = value[toStringTag];
            this.typed(Class, /** @type {ArrayBuffer} */(value.buffer));
            break;
          }
          case value instanceof Error: {
            this.track(0, value);
            this.error(value);
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
          asASCII(this, NUMBER, String(value));
        }
        else pushValue(this, NULL);
        break;
      }
      case 'boolean': {
        pushValues(this, [BOOLEAN, value ? 1 : 0]);
        break;
      }
      case 'bigint': {
        this.track(1, value);
        asASCII(this, BIGINT, String(value));
        break;
      }
      default: {
        if (asNull) pushValue(this, NULL);
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
    return recursive ? (pushValues(this, recursive), true) : false;
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
    pushLength(this, type, length);
    for (let i = 0; i < length; i++)
      this.encode(values[i], false);
  }

  /**
   * @param {RegExp} re
   */
  regexp({ source, flags }) {
    pushValue(this, REGEXP);
    if (!this.known(source)) this.string(source);
    if (!this.known(flags)) asASCII(this, STRING, flags);
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
   * @param {string} value
   */
  string(value) {
    if (value.length) {
      this.track(1, value);
      const str = encoder.encode(value);
      pushLength(this, STRING, str.length);
      if (this.T) pushView(this, str);
      else pushValues(this, str);
    }
    else pushValues(this, [STRING, 0]);
  }

  /**
   * @param {recursion} level
   * @param {any} value
   */
  track(level, value) {
    if (this.r > level) {
      const a = [];
      pushLength(
        /** @type {Recursion} */({ a, $: false, _: 0 }),
        RECURSIVE,
        this._
      );
      /** @type {Cache} */(this.m).set(value, a);
    }
  }

  /**
   * @param {string} Class
   * @param {ArrayBuffer} buffer
   */
  typed(Class, buffer) {
    pushValue(this, TYPED);
    if (!this.known(Class)) asASCII(this, STRING, Class);
    if (!this.known(buffer)) this.buffer(buffer);
  }
}

/**
 * @template T
 * @param {T extends undefined ? never : T extends Function ? never : T extends symbol ? never : T} value
 * @param {Options?} options
 * @returns {Uint8Array}
 */
export default (value, options = null) => {
  const maxByteLength = options?.maxByteLength ?? MAX_BYTE_LENGTH;
  const recursion = options?.recursion ?? 'all';
  const resizable = !!options?.resizable;
  const buffer = options?.buffer;
  const typed = resizable || !!buffer;

  const r = recursion === 'all' ? 2 : (recursion === 'none' ? 0 : 1);

  const a = typed ?
    new Uint8Array(
      //@ts-ignore
      buffer || new ArrayBuffer(0, { maxByteLength })
    ) :
    []
  ;

  const m = r > 0 ? new Map : null;

  (new Encoder(r, a, m, resizable, typed)).encode(value, false);

  return typed ? /** @type {Uint8Array} */(a) : new Uint8Array(a);
};
