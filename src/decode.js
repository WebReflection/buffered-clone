//@ts-check

import {
  NULL,
  BOOLEAN,
  NUMBER,
  STRING,
  ARRAY,
  OBJECT,
  RECURSIVE,
} from './constants.js';

import { ui32a, ui8a } from './shared.js';

const decoder = new TextDecoder;

/**
 * @typedef {Object} Position
 * @property {number} i
 */

/**
 * @param {string} str
 * @returns
 */
const asNumber = str => {
  const num = parseFloat(str);
  return String(num) === str ? num : BigInt(num);
};

/**
 * @param {Uint8Array} ui8
 * @param {Position} at
 * @returns
 */
const fromLength = (ui8, at) => {
  ui32a[0] = 0;
  for (let i = 0, length = ui8[at.i++]; i < length; i++)
    ui8a[i] = ui8[at.i++];
  return ui32a[0];
};

/**
 * @param {Uint8Array} ui8
 * @param {Position} at
 * @param {Map} map
 * @returns {import("./shared.js").Serializable}
 */
const decode = (ui8, at, map) => {
  const { i } = at;
  const current = ui8[at.i++];
  switch (current) {
    case NULL: return null;
    case BOOLEAN: return ui8[at.i++] === 1;
    case STRING:
    case NUMBER: {
      const length = fromLength(ui8, at);
      if (length) {
        const start = at.i;
        const end = (at.i += length);
        const value = decoder.decode(ui8.slice(start, end));
        const result = current === NUMBER ? asNumber(value) : value;
        map.set(i, result);
        return result;
      }
      return '';
    }
    case ARRAY: {
      const value = [];
      map.set(i, value);
      let length = fromLength(ui8, at);
      while (length--) value.push(decode(ui8, at, map));
      return value;
    }
    case OBJECT: {
      const value = {};
      map.set(i, value);
      let length = fromLength(ui8, at);
      while (length--) value[decode(ui8, at, map)] = decode(ui8, at, map);
      return value;
    }
    case RECURSIVE: {
      return map.get(fromLength(ui8, at));
    }
  }
};

/**
 * @param {Uint8Array} ui8
 * @returns
 */
export default ui8 => decode(ui8, /** @type {Position} */({ i: 0 }), new Map);
