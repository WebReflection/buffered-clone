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
 * @typedef {Object} Position
 * @property {number} i
 */

const decoder = new TextDecoder;

/**
 * @param {Uint8Array} ui8
 * @param {Position} at
 * @param {Cache} map
 * @returns
 */
const decode = (ui8, at, map) => {
  const i = at.i++;
  const type = ui8[i];
  switch (type) {
    case RECURSIVE: {
      return map.get(fromLength(ui8, at));
    }
    case ARRAY: {
      const value = [];
      map.set(i, value);
      for (let i = 0, length = fromLength(ui8, at); i < length; i++)
        value.push(decode(ui8, at, map));
      return value;
    }
    case OBJECT: {
      const value = {};
      map.set(i, value);
      for (let i = 0, length = fromLength(ui8, at); i < length; i += 2)
        value[decode(ui8, at, map)] = decode(ui8, at, map);
      return value;
    }
    case STRING: {
      const length = fromLength(ui8, at);
      if (length) {
        const start = at.i;
        const end = (at.i += length);
        const value = decoder.decode(ui8.slice(start, end));
        map.set(i, value);
        return value;
      }
      return '';
    }
    case NUMBER:
    case BIGINT: {
      const string = fromASCII(ui8, at);
      const value = type === BIGINT ? BigInt(string) : parseFloat(string);
      map.set(i, value);
      return value;
    }
    case BIGINT: {
      const string = fromASCII(ui8, at);
      const value = BigInt(string);
      map.set(i, value);
      return value;
    }
    case BOOLEAN: return ui8[at.i++] === 1;
    case NULL: return null;
    case BUFFER: {
      const length = fromLength(ui8, at);
      const start = at.i;
      const end = (at.i += length);
      const { buffer } = ui8.slice(start, end);
      map.set(i, buffer);
      return buffer;
    }
    case DATE: {
      const value = new Date(fromASCII(ui8, at));
      map.set(i, value);
      return value;
    }
    case MAP: {
      const value = new Map;
      map.set(i, value);
      for (let i = 0, length = fromLength(ui8, at); i < length; i += 2)
        value.set(decode(ui8, at, map), decode(ui8, at, map));
      return value;
    }
    case SET: {
      const value = new Set;
      map.set(i, value);
      for (let i = 0, length = fromLength(ui8, at); i < length; i++)
        value.add(decode(ui8, at, map));
      return value;
    }
    case ERROR: {
      const Class = globalThis[decode(ui8, at, map)];
      const value = new Class(decode(ui8, at, map));
      map.set(i, value);
      return value;
    }
    case REGEXP: {
      const value = new RegExp(decode(ui8, at, map), decode(ui8, at, map));
      map.set(i, value);
      return value;
    }
    case TYPED: {
      const Class = globalThis[decode(ui8, at, map)];
      const value = new Class(decode(ui8, at, map));
      map.set(i, value);
      return value;
    }
    default: {
      throw new TypeError(`Unable to decode type: ${fromCharCode(type)}`);
    }
  }
};

/**
 * @param {Uint8Array<ArrayBuffer>} ui8
 * @returns
 */
export default ui8 => {
  const at = /** @type {Position} */({ i: 0 });
  return decode(ui8, at, new Map);
};
