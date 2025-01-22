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

/** @typedef {Map<number,any>} Cache */

/**
 * @typedef {object} Options
 * @prop {'all' | 'some' | 'none'} recursion With `all`, the default, everything recursive will be tracked. With `some`, all primitives get ignored or fail if found as recursive. With `none`, no recursion is ever tracked and an error is thrown when any recursive data is found.
 */

/**
 * @typedef {Object} Position
 * @property {number} i
 */

const decoder = new TextDecoder;

/**
 * @param {number} i
 */
const throwOnRecursiveValue = i => {
  throw new SyntaxError('Unexpected recursive value @ ' + i);
};

class Decoder {
  /**
   * @param {Uint8Array} a
   * @param {Loophole | Cache} m
   * @param {boolean} p
   */
  constructor(a, m, p) {
    this.i = 0;
    this.a = a;
    this.m = m;
    this.p = p;
  }
  decode() {
    const index = this.i++;
    const type = this.a[index];
    switch (type) {
      case RECURSIVE: {
        const i = this.length();
        return this.m.get(i) ?? throwOnRecursiveValue(i);
      }
      case ARRAY: {
        const value = [];
        this.m.set(index, value);
        for (let i = 0, length = this.length(); i < length; i++)
          value.push(this.decode());
        return value;
      }
      case OBJECT: {
        const value = {};
        this.m.set(index, value);
        for (let i = 0, length = this.length(); i < length; i += 2)
          value[this.decode()] = this.decode();
        return value;
      }
      case STRING: {
        const length = this.length();
        if (length) {
          const start = this.i;
          const end = (this.i += length);
          const value = decoder.decode(this.a.subarray(start, end));
          if (this.p) this.m.set(index, value);
          return value;
        }
        return '';
      }
      case NUMBER:
      case BIGINT: {
        const string = this.ascii();
        const value = type === BIGINT ? BigInt(string) : parseFloat(string);
        if (this.p) this.m.set(index, value);
        return value;
      }
      case BOOLEAN: return this.a[this.i++] === 1;
      case NULL: return null;
      case BUFFER: {
        const length = this.length();
        const start = this.i;
        const end = (this.i += length);
        // can't subarray in here or the buffer won't be usable
        const { buffer } = this.a.slice(start, end);
        this.m.set(index, buffer);
        return buffer;
      }
      case DATE: {
        const value = new Date(this.ascii());
        this.m.set(index, value);
        return value;
      }
      case MAP: {
        const value = new Map;
        this.m.set(index, value);
        for (let i = 0, length = this.length(); i < length; i += 2)
          value.set(this.decode(), this.decode());
        return value;
      }
      case SET: {
        const value = new Set;
        this.m.set(index, value);
        for (let i = 0, length = this.length(); i < length; i++)
          value.add(this.decode());
        return value;
      }
      case REGEXP: {
        const value = new RegExp(this.decode(), this.decode());
        this.m.set(index, value);
        return value;
      }
      case TYPED: {
        const Class = globalThis[this.decode()];
        const value = new Class(this.decode());
        this.m.set(index, value);
        return value;
      }
      case ERROR: {
        const Class = globalThis[this.decode()];
        const value = new Class(this.decode());
        this.m.set(index, value);
        return value;
      }
      default: {
        const { fromCharCode } = String;
        throw new TypeError(`Unable to decode type: ${fromCharCode(type)}`);
      }
    }
  }
  ascii() {
    const length = this.length();
    const { i } = this;
    const value = this.a.subarray(i, (this.i += length));
    let s = '';
    for (let i = 0; i < length; i++) {
      switch (value[i]) {
        case 48: s += '0'; break;
        case 49: s += '1'; break;
        case 50: s += '2'; break;
        case 51: s += '3'; break;
        case 52: s += '4'; break;
        case 53: s += '5'; break;
        case 54: s += '6'; break;
        case 55: s += '7'; break;
        case 56: s += '8'; break;
        case 57: s += '9'; break;
        case 45: s += '-'; break;
        case 46: s += '.'; break;
        case 58: s += ':'; break;
        case 84: s += 'T'; break;
        case 90: s += 'Z'; break;
        // ⚠️ this is never the case in JS encoding
        //    but buffers could come from other PLs
        case 101: s += 'e'; break;
        case 69: s += 'E'; break;
        default: s += '+'; break;
      }
    }
    return s;
  }
  length() {
    const { a } = this;
    let value = 0;
    for (let i = 0, length = a[this.i++]; i < length; i++)
      value += a[this.i++] << (i * 8);
    return value;
  }
}

class Loophole {
  /**
   * @param {number} i
   */
  get(i) {
    throwOnRecursiveValue(i);
  }

  /**
   * @param {number} i
   * @param {any} value
   */
  set(i, value) {
    // do nothing
  }
}

/**
 * @param {Uint8Array<ArrayBuffer>} ui8a
 * @param {Options?} options
 * @returns
 */
export default (ui8a, options) => {
  const r = options?.recursion;
  const map = r === 'none' ? new Loophole : new Map;
  return new Decoder(ui8a, map, r !== 'some').decode();
};
