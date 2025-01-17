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
} from './constants.js';

import { ui32a, ui8a } from './shared.js';

const { isArray } = Array;
const { toStringTag } = Symbol;
const { entries, getPrototypeOf } = Object;

const TypedArray = getPrototypeOf(ui8a.constructor);

const encoder = new TextEncoder;

/**
 * @param {number} length
 * @returns
 */
const asLength = length => {
  if (length) {
    ui32a[0] = length;
    let i = BYTES_PER_ELEMENT;
    while (i-- && !ui8a[i]);
    i++;
    return [i, ...ui8a.slice(0, i)];
  }
  return [0];
};

/**
 * @param {number[]} ui8
 * @param {NUMBER | STRING} type
 * @param {string} str
 */
const asString = (ui8, type, str) => {
  const value = encoder.encode(str);
  ui8.push(type, ...asLength(value.length), ...value);
};

/**
 * @param {any} value
 * @returns {[boolean, string]}
 */
const canSerialize = value => {
  const type = typeof value;
  switch (type) {
    case 'symbol':
    case 'function':
    case 'undefined':
      return [false, ''];
  }
  return [true, type === 'object' ? (value ? type : 'null') : type];
};

/**
 * @param {any} value
 * @returns {[any, boolean]}
 */
const asJSON = value => {
  let OK = true;
  if (typeof value.toJSON === 'function') {
    value = value.toJSON();
    [OK] = canSerialize(value);
  }
  return [value, OK];
};

/**
 * @param {any} value
 * @returns {[any, boolean]}
 */
const checkSerialized = value => {
  let [OK, type] = canSerialize(value);
  if (OK && type === 'object')
    [value, OK] = asJSON(value);
  return [OK ? value : null, OK];
};

/**
 * @param {import("./shared.js").Serializable} value
 * @param {number[]} ui8
 * @param {Map} map
 */
const encode = (value, ui8, map) => {
  if (map.has(value)) {
    ui8.push(...map.get(value));
    return;
  }
  switch (typeof value) {
    case 'object': {
      if (value) {
        if (isArray(value)) {
          map.set(value, [RECURSIVE, ...asLength(ui8.length)]);
          const { length } = value;
          ui8.push(ARRAY, ...asLength(length));
          for (let i = 0; i < length; i++)
            encode(checkSerialized(value[i])[0], ui8, map);
        }
        else {
          let [json, OK] = asJSON(value);
          if (OK) {
            if (json === value || (typeof json === 'object' && json)) {
              map.set(value, [RECURSIVE, ...asLength(ui8.length)]);
              switch (true) {
                case json instanceof TypedArray: {
                  ui8.push(TYPED);
                  encode(json[toStringTag], ui8, map);
                  json = json.buffer;
                }
                case json instanceof ArrayBuffer: {
                  const ui8a = new Uint8Array(json);
                  ui8.push(BUFFER, ...asLength(ui8a.length), ...ui8a);
                  break;
                }
                default: {
                  let length = 0;
                  const pairs = [];
                  for (let [k, v] of entries(json)) {
                    [v, OK] = checkSerialized(v);
                    if (OK) {
                      encode(k, pairs, map);
                      encode(v, pairs, map);
                      length++;
                    }
                  }
                  ui8.push(OBJECT, ...asLength(length), ...pairs);
                  break;
                }
              }
            }
            else encode(json, ui8, map);
          }
        }
      }
      else ui8.push(NULL);
      break;
    }
    case 'string': {
      if (value.length) {
        map.set(value, [RECURSIVE, ...asLength(ui8.length)]);
        asString(ui8, STRING, value);
      }
      else ui8.push(STRING, 0);
      break;
    }
    case 'number':
    case 'bigint': {
      map.set(value, [RECURSIVE, ...asLength(ui8.length)]);
      asString(ui8, NUMBER, String(value));
      break;
    }
    case 'boolean': {
      ui8.push(BOOLEAN, value ? 1 : 0);
      break;
    }
  }
};

/**
 * @param {import("./shared.js").Serializable} value
 * @returns
 */
export default value => {
  const ui8 = [];
  encode(value, ui8, new Map);
  return new Uint8Array(ui8);
};
