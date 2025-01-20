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

import { fromASCII, fromCharCode } from './utils/ascii.js';
import { fromLength } from './utils/length.js';

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

/**
 * @param {Uint8Array} ui8a
 * @param {Position} at
 * @param {Cache|Loophole} m
 * @param {boolean} p
 * @returns
 */
const decode = (ui8a, at, m, p) => {
  const i = at.i++;
  const type = ui8a[i];
  switch (type) {
    case RECURSIVE: {
      const i = fromLength(ui8a, at);
      return m.get(i) ?? throwOnRecursiveValue(i);
    }
    case ARRAY: {
      const value = [];
      m.set(i, value);
      for (let i = 0, length = fromLength(ui8a, at); i < length; i++)
        value.push(decode(ui8a, at, m, p));
      return value;
    }
    case OBJECT: {
      const value = {};
      m.set(i, value);
      for (let i = 0, length = fromLength(ui8a, at); i < length; i += 2)
        value[decode(ui8a, at, m, p)] = decode(ui8a, at, m, p);
      return value;
    }
    case STRING: {
      const length = fromLength(ui8a, at);
      if (length) {
        const start = at.i;
        const end = (at.i += length);
        const value = decoder.decode(ui8a.slice(start, end));
        if (p) m.set(i, value);
        return value;
      }
      return '';
    }
    case NUMBER:
    case BIGINT: {
      const string = fromASCII(ui8a, at);
      const value = type === BIGINT ? BigInt(string) : parseFloat(string);
      if (p) m.set(i, value);
      return value;
    }
    case BOOLEAN: return ui8a[at.i++] === 1;
    case NULL: return null;
    case BUFFER: {
      const length = fromLength(ui8a, at);
      const start = at.i;
      const end = (at.i += length);
      const { buffer } = ui8a.slice(start, end);
      m.set(i, buffer);
      return buffer;
    }
    case DATE: {
      const value = new Date(fromASCII(ui8a, at));
      m.set(i, value);
      return value;
    }
    case MAP: {
      const value = new Map;
      m.set(i, value);
      for (let i = 0, length = fromLength(ui8a, at); i < length; i += 2)
        value.set(decode(ui8a, at, m, p), decode(ui8a, at, m, p));
      return value;
    }
    case SET: {
      const value = new Set;
      m.set(i, value);
      for (let i = 0, length = fromLength(ui8a, at); i < length; i++)
        value.add(decode(ui8a, at, m, p));
      return value;
    }
    case ERROR: {
      const Class = globalThis[decode(ui8a, at, m, p)];
      const value = new Class(decode(ui8a, at, m, p));
      m.set(i, value);
      return value;
    }
    case REGEXP: {
      const value = new RegExp(decode(ui8a, at, m, p), decode(ui8a, at, m, p));
      m.set(i, value);
      return value;
    }
    case TYPED: {
      const Class = globalThis[decode(ui8a, at, m, p)];
      const value = new Class(decode(ui8a, at, m, p));
      m.set(i, value);
      return value;
    }
    default: {
      throw new TypeError(`Unable to decode type: ${fromCharCode(type)}`);
    }
  }
};

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
  const at = /** @type {Position} */({ i: 0 });
  const r = options?.recursion;
  return decode(ui8a, at, r === 'none' ? new Loophole : new Map, r !== 'some');
};
