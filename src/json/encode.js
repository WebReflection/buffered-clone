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
  NUMBER,
  BIGINT,

  // typed
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

import {
  asASCII,
  asValid,
  pushLength,
  pushValue,
  pushValues,
  pushView,
} from '../encode/json.js';

import * as number from '../number.js';

/** @typedef {Map<any,number[]>} Cache */
/** @typedef {0|1|2} recursion */
/** @typedef {{a:number[]|Uint8Array, m:Cache?, _:number}} RAM */
/** @typedef {{a:number[]|Uint8Array, $:false, _:number}} Recursion */

/**
 * @typedef {object} Options
 * @prop {'all' | 'some' | 'none'} recursion With `all` being the default, everything but `null`, `boolean` and empty `string` will be tracked recursively. With `some`, all primitives get ignored. With `none`, no recursion is ever tracked, leading to *maximum callstack* if present in the encoded data.
 * @prop {boolean?} resizable If `true` it will use a growing `ArrayBuffer` instead of an array.
 * @prop {ArrayBuffer?} buffer If passed, it will be filled with all encoded *uint8* values.
 * @prop {number} maxByteLength If passed, no more than those bytes will ever be allocated. The maximum value is `(2 ** 32) - 1` but here its default is `2 ** 26` (8MB of data, usually plenty for normal operations). See https://tc39.es/ecma262/multipage/structured-data.html#sec-resizable-arraybuffer-guidelines to know more.
 */

const { isArray } = Array;
const { isView } = ArrayBuffer;
const { isFinite } = Number;
const { entries } = Object;

const encoder = new TextEncoder;

/**
 * @param {Cache} map
 * @param {any} value
 * @param {number} at
 */
const recursive = (map, value, at) => {
  const a = [];
  map.set(value, a);
  pushLength(
    /** @type {Recursion} */({ _: 0, a }),
    RECURSIVE,
    at
  );
};

class Encoder {
  /**
   * @param {number[]|Uint8Array} a
   * @param {Cache} m
   */
  constructor(a, m) {
    this._ = 0;
    this.a = a;
    this.m = m;
  }

  /**
   * @param {any[]} value
   */
  array(value) {
    this.track(value);
    const { length } = value;
    pushLength(this, ARRAY, length);
    for (let i = 0; i < length; i++)
      this.encode(value[i], true);
  }

  /**
   * @param {bigint} value
   */
  bigint(value) {
    pushValue(this, I64);
    pushValues(this, number.i64.encode(value));
  }

  /**
   * @param {ArrayBufferLike} value
   */
  buffer(value) {
    this.track(value);
    const ui8a = new Uint8Array(value);
    this.push(BUFFER, ui8a);
  }

  /**
   * @param {Date} value
   */
  date(value) {
    this.track(value);
    asASCII(this, DATE, value.toISOString());
  }

  /**
   * @param {any} value
   * @param {boolean} asNull
   */
  encode(value, asNull) {
    if (value === null) return pushValue(this, NULL);
    if (this.known(value)) return;
    switch (asValid(value)) {
      case 'object': {
        switch (true) {
          case 'toJSON' in value: this.indirect(value); break;
          case value.constructor === Object: this.generic(value); break;
          case isArray(value): this.array(value); break;
          //@ts-ignore
          case isView(value): this.typed(value); break;
          case value instanceof Date: this.date(value); break;
          case value instanceof ArrayBuffer: this.buffer(value); break;
          case value instanceof Map: this.map(value); break;
          case value instanceof Set: this.set(value); break;
          // TODO: objects like new Boolean(false) or others
          //       don't exist in other PLs and I still haven't
          //       found a use case for those ... only new String
          //       might be an exception but then again, maybe a
          //       solution such as toBufferedClone is better here?
          default: this.generic(value); break;
        }
        break;
      }
      case 'string': this.string(value); break;
      case 'number': isFinite(value) ? this.number(value) : pushValue(this, NULL); break;
      case 'boolean': pushValue(this, value ? TRUE : FALSE); break;
      case 'bigint': this.bigint(value); break;
      default: if (asNull) pushValue(this, NULL); break;
    }
  }

  /**
   * @param {object} value
   */
  generic(value) {
    this.track(value);
    const values = [];
    for (let pairs = entries(value), j = 0, l = pairs.length; j < l; j++) {
      const [k, v] = pairs[j];
      if (asValid(v)) values.push(k, v);
    }
    this.object(OBJECT, values);
  }

  /**
   * @param {object} wrap
   */
  indirect(wrap) {
    const { _, a, m } = this;
    recursive(m, wrap, _);
    const wrapped = wrap.toJSON();
    if (wrapped === wrap) {
      pushValue(this, NULL);
      m.set(wrap, [0]);
    }
    else {
      this.encode(wrapped, true);
      if (!m.has(wrapped))
        m.set(wrap, /** @type {number[]} */(a.slice(_)));
    }
  }

  /**
   * @param {any} value
   * @returns
   */
  known(value) {
    const recursive = this.m.get(value);
    if (recursive) {
      pushValues(this, recursive);
      return true;
    }
    return false;
  }

  /**
   * @param {Map} value
   */
  map(value) {
    this.track(value);
    const values = [];
    let i = 0;
    for (const [k, v] of value) {
      if (asValid(v) && asValid(k)) {
        values[i++] = k;
        values[i++] = v;
      }
    }
    this.object(MAP, values);
  }

  /**
   * @param {NUMBER|BIGINT} type
   * @param {number|bigint} value
   */
  number(value) {
    pushValue(this, F64);
    pushValues(this, number.f64.encode(value));
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
   * @param {number} type
   * @param {number[]|Uint8Array<ArrayBufferLike>} view
   */
  push(type, view) {
    pushLength(this, type, view.length);
    pushValues(this, view);
  }

  /**
   * @param {Set} value
   */
  set(value) {
    this.track(0, value);
    const values = [];
    let i = 0;
    for (const v of value) {
      if (asValid(v)) values[i++] = v;
    }
    this.object(SET, values);
  }

  /**
   * @param {string} value
   */
  string(value) {
    const { length } = value;
    if (length) {
      const { _, m } = this;
      const str = m.get(value);
      if (str) {
        pushValues(this, str);
        return;
      }
      this.push(STRING, encoder.encode(value));
      recursive(m, value, _);
    }
    else pushValues(this, [STRING, 0]);
  }

  /**
   * @param {recursion} level
   * @param {any} value
   */
  track(value) {
    recursive(this.m, value, this._);
  }

  /**
   * @param {import("../number.js").TypedArray|DataView} view
   */
  typed(view) {
    this.track(view);
    pushValue(this, U8A);
    const { buffer } = view;
    if (!this.known(buffer)) this.buffer(buffer);
  }
}

/**
 * @template T
 * @param {T extends undefined ? never : T extends Function ? never : T extends symbol ? never : T} value
 * @returns {Uint8Array<ArrayBuffer>}
 */
export default value  => {
  const a = [];
  const m = new Map;
  (new Encoder(a, m)).encode(value, false);
  return new Uint8Array(a);
};
