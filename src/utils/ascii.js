//@ts-check

import { fromLength, toLength } from './length.js';

const { fromCharCode } = String;
export { fromCharCode };

/**
 * @param {Uint8Array} ui8
 * @param {import("../decode.js").Position} at
 * @returns
 */
export const fromASCII = (ui8, at) => {
  const length = fromLength(ui8, at);
  const start = at.i;
  const end = (at.i += length);
  return fromCharCode(...ui8.slice(start, end));
};

/**
 * @param {number} type
 * @param {string} value
 * @returns
 */
export const toASCII = (type, value) => {
  const { length } = value;
  const result = toLength(type, length);
  for (let i = 0; i < length; i++)
    result.push(value.charCodeAt(i));
  return result;
};
