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

import {
  pushLength,
  asASCII,
  asValid,
  pushValue,
  pushValues,
  pushView,
  mapPair,
  setValue,
} from './encode/utils.js';

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

const toBufferedClone = Symbol.for('buffered-clone');

const encoder = new TextEncoder;

/**
 * @param {Map} value
 * @param {any} value
 * @param {number} at
 */
const recursive = (map, value, at) => {
  const a = [];
  map.set(value, a);
  pushLength(
    /** @type {Recursion} */({ a, $: false, _: 0 }),
    RECURSIVE,
    at
  );
};

class Encoder {
  /**
   * @param {recursion} r
   * @param {number[]|Uint8Array} a
   * @param {Cache?} m
   * @param {boolean} resizable
   * @param {boolean} typed
   */
  constructor(r, a, m, resizable, typed) {
    this._ = 0;
    this.r = r;
    this.a = a;
    this.m = m;

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
   * @param {bigint} value
   */
  bigint(value) {
    this.track(1, value);
    asASCII(this, BIGINT, String(value));
  }

  /**
   * @param {ArrayBufferLike} value
   */
  buffer(value) {
    this.track(0, value);
    const ui8a = new Uint8Array(value);
    pushLength(this, BUFFER, ui8a.length);
    if (this.T) pushView(this, ui8a);
    else pushValues(this, ui8a);
  }

  /**
   * @param {Date} value
   */
  date(value) {
    this.track(0, value);
    asASCII(this, DATE, value.toISOString());
  }

  /**
   * @param {Error} error
   */
  error(error) {
    this.track(0, error);
    pushValue(this, ERROR);
    const { name, message } = error;
    if (!this.known(name)) asASCII(this, STRING, name);
    if (!this.known(message)) this.string(message);
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
          case toBufferedClone in value: this.indirect(value); break;
          case value.constructor === Object: this.generic(value); break;
          case isArray(value): this.array(value); break;
          case isView(value): this.typed(value); break;
          case value instanceof Date: this.date(value); break;
          case value instanceof ArrayBuffer: this.buffer(value); break;
          case value instanceof Map: this.map(value); break;
          case value instanceof Set: this.set(value); break;
          case value instanceof RegExp: this.regexp(value); break;
          case value instanceof Error: this.error(value); break;
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
      case 'number': this.number(value); break;
      case 'boolean': pushValue(this, value ? TRUE : FALSE); break;
      case 'bigint': this.bigint(value); break;
      default: if (asNull) pushValue(this, NULL); break;
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
   * @param {object} wrap
   */
  indirect(wrap) {
    const { _, r, a, m } = this;
    const recursion = r > 0;
    // store `value` at current position in case
    // the returned value also point at itself
    if (recursion) recursive(m, wrap, _);
    const wrapped = wrap[toBufferedClone]();
    // if the method returned itself, make it null
    // because there is literally nothing to encode
    if (wrapped === wrap) {
      if (recursion) {
        pushValue(this, NULL);
        /** @type {Cache} */(m).set(wrap, [0]);
      }
    }
    else {
      this.encode(wrapped, true);
      // if the returned value was not recursive
      // avoid multiple invocations of the method
      // by storing whatever result it produced
      if (recursion && !/** @type {Cache} */(m).has(wrapped))
        /** @type {Cache} */(m).set(wrap, /** @type {number[]} */(a.slice(_)));
    }
  }

  /**
   * @param {any} value
   * @returns
   */
  known(value) {
    if (this.r > 0) {
      const recursive = /** @type {Cache} */(this.m).get(value);
      if (recursive) {
        pushValues(this, recursive);
        return true;
      }
    }
    return false;
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
   * @param {number} value
   */
  number(value) {
    if (isFinite(value)) {
      this.track(1, value);
      asASCII(this, NUMBER, String(value));
    }
    else pushValue(this, NULL);
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
  regexp(re) {
    this.track(0, re);
    pushValue(this, REGEXP);
    const { source, flags } = re;
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
    if (this.r > level) recursive(this.m, value, this._);
  }

  /**
   * @param {ArrayBufferView} view
   */
  typed(view) {
    this.track(0, view);
    pushValue(this, TYPED);
    //@ts-ignore
    const { [toStringTag]: Class, buffer } = view;
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
    //@ts-ignore
    new Uint8Array(buffer || new ArrayBuffer(0, { maxByteLength })) :
    []
  ;
  const m = r > 0 ? new Map : null;
  (new Encoder(r, a, m, resizable, typed)).encode(value, false);
  return typed ? /** @type {Uint8Array} */(a) : new Uint8Array(a);
};
