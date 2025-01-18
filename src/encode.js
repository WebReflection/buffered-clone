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
      if (value) {
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
      return [true, NULL];
    }
    case 'string': return [true, STRING];
    case 'number': return [true, NUMBER];
    case 'boolean': return [true, BOOLEAN];
    case 'bigint': return [true, BIGINT];
    default: return [asNull, NULL];
  }
};

/**
 * @param {number} type
 * @param {Uint8Array} value
 * @returns
 */
const asUint8Array = (type, value) => {
  const result = toLength(type, value.length);
  result.push(...value);
  return result;
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
 * @param {any} value
 * @param {number[]} ui8
 * @param {Cache} map
 */
const array = (value, ui8, map) => {
  const { length } = value;
  ui8.push(...toLength(ARRAY, length));
  for (let i = 0; i < length; i++)
    encode(value[i], ui8, map, true);
};

/**
 * @param {ArrayBuffer} value
 * @returns
 */
const buffer = value => asUint8Array(BUFFER, new Uint8Array(value));

/**
 * @param {number} type
 * @param {any[]} values
 * @param {number[]} ui8
 * @param {Cache} map
 */
const object = (type, values, ui8, map) => {
  const { length } = values;
  if (length) {
    ui8.push(...toLength(type, length));
    for (let i = 0; i < length; i++)
      encode(values[i], ui8, map, false);
  }
  else
    ui8.push(type, 0);
};

/**
 * @param {any} value
 * @param {number[]} ui8
 * @param {Cache} map
 */
const recursive = (value, ui8, map) => {
  map.set(value, toLength(RECURSIVE, ui8.length));
};

/**
 * @param {number} type
 * @param {any} key
 * @param {any} value
 * @param {number[]} ui8
 * @param {Cache} map
 */
const simple = (type, key, value, ui8, map) => {
  ui8.push(type);
  encode(key, ui8, map, false);
  encode(value, ui8, map, false);
};

const encoder = new TextEncoder;

/**
 * @param {any} value
 * @param {number[]} ui8
 * @param {Cache} map
 * @param {boolean} asNull
 */
const encode = (value, ui8, map, asNull) => {
  const known = map.get(value);
  if (known) {
    ui8.push(...known);
    return;
  }

  const [OK, type] = asSerialized(value, asNull);
  if (OK) {
    switch (type) {
      case ARRAY: {
        recursive(value, ui8, map);
        array(value, ui8, map);
        break;
      }
      case OBJECT: {
        recursive(value, ui8, map);
        const values = [];
        for (const [k, v] of entries(value)) {
          if (asValid(v)) values.push(k, v);
        }
        object(OBJECT, values, ui8, map);
        break;
      }
      case STRING: {
        if (value.length) {
          recursive(value, ui8, map);
          ui8.push(...asUint8Array(STRING, encoder.encode(value)));
        }
        else ui8.push(STRING, 0);
        break;
      }
      case NUMBER:
      case BIGINT: {
        recursive(value, ui8, map);
        ui8.push(...toASCII(type, String(value)));
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
        recursive(value, ui8, map);
        ui8.push(...buffer(value));
        break;
      }
      case DATE: {
        recursive(value, ui8, map);
        ui8.push(...toASCII(DATE, value.toISOString()));
        break;
      }
      case MAP: {
        recursive(value, ui8, map);
        const values = [];
        for (const [k, v] of value) {
          if (asValid(k) && asValid(v)) values.push(k, v);
        }
        object(MAP, values, ui8, map);
        break;
      }
      case SET: {
        recursive(value, ui8, map);
        const values = [];
        for (const v of value) {
          if (asValid(v)) values.push(v);
        }
        object(SET, values, ui8, map);
        break;
      }
      case ERROR: {
        const { name, message } = value;
        if (name in globalThis) {
          recursive(value, ui8, map);
          simple(ERROR, name, message, ui8, map);
        }
        break;
      }
      case REGEXP: {
        recursive(value, ui8, map);
        simple(REGEXP, value.source, value.flags, ui8, map);
        break;
      }
      case TYPED: {
        const Class = value[toStringTag];
        if (Class in globalThis) {
          recursive(value, ui8, map);
          simple(TYPED, Class, value.buffer, ui8, map);
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
  encode(value, ui8, new Map, false);
  return new Uint8Array(ui8);
};
