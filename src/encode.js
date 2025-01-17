//@ts-check

import {
  BYTES_PER_ELEMENT,
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
  UNDEFINED,
  SYMBOL,
  FUNCTION,
  ERROR,
  REGEXP,
  SET,
  MAP,
  DATE,
} from './constants.js';

import { ui32a, ui8a } from './shared.js';

/** @typedef {Map<any,number[]>} Cache */

const { isArray } = Array;
const { toStringTag } = Symbol;
const { entries, getPrototypeOf } = Object;

const TypedArray = getPrototypeOf(ui8a.constructor);

const TypeOf = {
  undefined: UNDEFINED,
  boolean: BOOLEAN,
  number: NUMBER,
  bigint: BIGINT,
  string: STRING,
  symbol: SYMBOL,
  function: FUNCTION,
  object: OBJECT,
};

/**
 * @param {number} type
 * @param {number} length
 * @returns
 */
const asLength = (type, length) => {
  const result = [type, 0];
  if (length) {
    ui32a[0] = length;
    let i = BYTES_PER_ELEMENT;
    while (i && ui8a[i - 1] === 0) i--;
    result[1] = i;
    result.push(...ui8a.slice(0, i));
  }
  return result;
};

/**
 * @param {number} type
 * @param {Uint8Array} value
 * @returns
 */
const asUint8Array = (type, value) => {
  const result = asLength(type, value.length);
  result.push(...value);
  return result;
};

/**
 * @param {number} type
 * @param {string} value
 * @returns
 */
const number = (type, value) => {
  const { length } = value;
  const result = asLength(type, length);
  for (let i = 0; i < length; i++)
    result.push(value.charCodeAt(i));
  return result;
};

/**
 * @param {any} value
 * @param {number[]} ui8
 * @param {Cache} map
 */
const array = (value, ui8, map) => {
  const { length } = value;
  ui8.push(...asLength(ARRAY, length));
  for (let i = 0; i < length; i++)
    encode(value[i], ui8, map, true);
};

/**
 * @param {any} value
 * @param {number[]} ui8
 * @param {Cache} map
 */
const object = (value, ui8, map) => {
  let length = 0;
  const pairs = [];
  for (let [k, v] of entries(value)) {
    const value = [];
    encode(v, value, map, false);
    if (value.length) {
      encode(k, pairs, map, false);
      pairs.push(...value);
      length++;
    }
  }
  if (length)
    ui8.push(...asLength(OBJECT, length), ...pairs);
  else
    ui8.push(OBJECT, 0);
};

/**
 * @param {any} value
 * @param {number[]} ui8
 * @param {Cache} map
 */
const recursive = (value, ui8, map) => {
  map.set(value, asLength(RECURSIVE, ui8.length));
};

/**
 * @param {any} value
 * @param {boolean} asNull
 * @returns
 */
const canSerialize = (value, asNull) => {
  const result = /** @type {[boolean,number]} */([true, TypeOf[typeof value]]);
  switch (result[1]) {
    case SYMBOL:
    case FUNCTION:
    case UNDEFINED:
      if (asNull) result[1] = NULL;
      else result[0] = false;
      break;
    case OBJECT:
      if (value) {
        if (value.constructor === Object) {}
        else if (isArray(value)) result[1] = ARRAY;
        else if (value instanceof ArrayBuffer) result[1] = BUFFER;
        else if (value instanceof Date) result[1] = DATE;
        else if (value instanceof Map) result[1] = MAP;
        else if (value instanceof Set) result[1] = SET;
        else if (value instanceof Error) result[1] = ERROR;
        else if (value instanceof RegExp) result[1] = REGEXP;
        else if (
          value instanceof TypedArray ||
          value instanceof DataView
        ) result[1] = TYPED;
      }
      else result[1] = NULL;
      break;
  }
  return result;
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

  const [OK, type] = canSerialize(value, asNull);
  if (OK) {
    switch (type) {
      case ARRAY: {
        recursive(value, ui8, map);
        array(value, ui8, map);
        break;
      }
      case OBJECT: {
        recursive(value, ui8, map);
        object(value, ui8, map);
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
        ui8.push(...number(type, String(value)));
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
        ui8.push(...asUint8Array(BUFFER, new Uint8Array(value)));
        break;
      }
      case DATE: {
        recursive(value, ui8, map);
        ui8.push(...number(DATE, value.toISOString()));
        break;
      }
      case MAP:
      case SET: {
        recursive(value, ui8, map);
        ui8.push(type);
        array([...value], ui8, map);
        break;
      }
      case ERROR: {
        const { name, message } = value;
        if (name in globalThis) {
          recursive(value, ui8, map);
          ui8.push(ERROR);
          encode(name, ui8, map, false);
          encode(message, ui8, map, false);
        }
        break;
      }
      case REGEXP: {
        recursive(value, ui8, map);
        ui8.push(REGEXP);
        encode(value.source, ui8, map, false);
        encode(value.flags, ui8, map, false);
        break;
      }
      case TYPED: {
        const Class = value[toStringTag];
        if (Class in globalThis) {
          recursive(value, ui8, map);
          ui8.push(TYPED);
          encode(Class, ui8, map, false);
          ui8.push(...asUint8Array(BUFFER, new Uint8Array(value.buffer)));
        }
        break;
      }
    }
  }
};

/**
 * @template T
 * @param {T extends undefined ? never : T extends Function ? never : T extends symbol ? never : T} value
 * @param {Cache} [map]
 * @returns
 */
export default (value, map = new Map) => {
  const ui8 = [];
  encode(value, ui8, map, false);
  return new Uint8Array(ui8);
};
