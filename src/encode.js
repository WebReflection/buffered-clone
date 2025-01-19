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

const { isArray } = Array;
const { isFinite } = Number;
const { toStringTag } = Symbol;
const { entries, getPrototypeOf } = Object;

const TypedArray = getPrototypeOf(Uint8Array);

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

/**
 * @param {number[]} ui8
 * @param {any} value
 * @param {Cache} map
 */
const array = (ui8, value, map) => {
  const { length } = value;
  toLength(ui8, ARRAY, length);
  for (let i = 0; i < length; i++)
    encode(ui8, value[i], map, true);
};

/**
 * @param {number[]} ui8
 * @param {ArrayBuffer} value
 * @returns
 */
const buffer = (ui8, value) => {
  asUint8Array(ui8, BUFFER, new Uint8Array(value));
};

/**
 * @param {number[]} ui8
 * @param {number} type
 * @param {any[]} values
 * @param {Cache} map
 */
const object = (ui8, type, values, map) => {
  const { length } = values;
  if (length) {
    toLength(ui8, type, length);
    for (let i = 0; i < length; i++)
      encode(ui8, values[i], map);
  }
  else
    ui8.push(type, 0);
};

/**
 * @param {number[]} ui8
 * @param {any} value
 * @param {Cache} map
 */
const recursive = (ui8, value, map) => {
  const r = [];
  toLength(r, RECURSIVE, ui8.length);
  map.set(value, r);
};

/**
 * @param {number[]} ui8
 * @param {number} type
 * @param {any} key
 * @param {any} value
 * @param {Cache} map
 */
const simple = (ui8, type, key, value, map) => {
  ui8.push(type);
  encode(ui8, key, map);
  encode(ui8, value, map);
};

const encoder = new TextEncoder;

/**
 * @param {number[]} ui8
 * @param {any} value
 * @param {Cache} map
 * @param {boolean} [asNull=false]
 */
const encode = (ui8, value, map, asNull = false) => {
  const known = map.get(value);
  if (known) {
    ui8.push(...known);
    return;
  }

  const [OK, type] = asSerialized(value, asNull);
  if (OK) {
    switch (type) {
      case ARRAY: {
        recursive(ui8, value, map);
        array(ui8, value, map);
        break;
      }
      case OBJECT: {
        recursive(ui8, value, map);
        const values = [];
        for (const [k, v] of entries(value)) {
          if (asValid(v)) values.push(k, v);
        }
        object(ui8, OBJECT, values, map);
        break;
      }
      case STRING: {
        if (value.length) {
          recursive(ui8, value, map);
          asUint8Array(ui8, STRING, encoder.encode(value));
        }
        else ui8.push(STRING, 0);
        break;
      }
      case NUMBER:
      case BIGINT: {
        recursive(ui8, value, map);
        toASCII(ui8, type, String(value));
        break;
      }
      case BOOLEAN: {
        ui8.push(BOOLEAN, value ? 1 : 0);
        break;
      }
      case NULL: {
        ui8.push(NULL);
        break;
      }
      case BUFFER: {
        recursive(ui8, value, map);
        buffer(ui8, value);
        break;
      }
      case DATE: {
        recursive(ui8, value, map);
        toASCII(ui8, DATE, value.toISOString());
        break;
      }
      case MAP: {
        recursive(ui8, value, map);
        const values = [];
        for (const [k, v] of value) {
          if (asValid(k) && asValid(v)) values.push(k, v);
        }
        object(ui8, MAP, values, map);
        break;
      }
      case SET: {
        recursive(ui8, value, map);
        const values = [];
        for (const v of value) {
          if (asValid(v)) values.push(v);
        }
        object(ui8, SET, values, map);
        break;
      }
      case ERROR: {
        const { name, message } = value;
        if (name in globalThis) {
          recursive(ui8, value, map);
          simple(ui8, ERROR, name, message, map);
        }
        break;
      }
      case REGEXP: {
        recursive(ui8, value, map);
        simple(ui8, REGEXP, value.source, value.flags, map);
        break;
      }
      case TYPED: {
        const Class = value[toStringTag];
        if (Class in globalThis) {
          recursive(ui8, value, map);
          simple(ui8, TYPED, Class, value.buffer, map);
        }
        break;
      }
    }
  }
};

/**
 * @template T
 * @param {T extends undefined ? never : T extends Function ? never : T extends symbol ? never : T} value
 * @returns
 */
export default value => {
  const ui8 = [];
  encode(ui8, value, new Map);
  return new Uint8Array(ui8);
};
