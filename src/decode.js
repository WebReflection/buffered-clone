//@ts-check

import {
  NULL,
  BOOLEAN,
  NUMBER,
  STRING,
  ARRAY,
  OBJECT,
} from './constants.js';

import {
  decoder,
  ui32a,
  ui8a,
} from './shared.js';

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
 * @returns {import("./shared.js").Serializable}
 */
const decode = (ui8, at) => {
  const current = ui8[at.i++];
  switch (current) {
    case NULL: return null;
    case BOOLEAN: return ui8[at.i++] === 1;
    case STRING:
    case NUMBER: {
      const length = fromLength(ui8, at);
      if (length) {
        const { i } = at;
        at.i += length;
        const value = decoder.decode(ui8.slice(i, at.i));
        return current === NUMBER ? asNumber(value) : value;
      }
      return '';
    }
    case ARRAY: {
      const value = [];
      let length = fromLength(ui8, at);
      while (length--) value.push(decode(ui8, at));
      return value;
    }
    case OBJECT: {
      const value = {};
      let length = fromLength(ui8, at);
      while (length--) value[decode(ui8, at)] = decode(ui8, at);
      return value;
    }
  }
};

/**
 * @param {Uint8Array} ui8
 * @returns
 */
export default ui8 => decode(ui8, /** @type {Position} */({ i: 0 }));
