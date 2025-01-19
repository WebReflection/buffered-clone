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
  return fromCharCode(...ui8.slice(at.i, (at.i += length)));
};

/**
 * @param {number[]} ui8
 * @param {number} type
 * @param {string} value
 */
export const toASCII = (ui8, type, value) => {
  const { length } = value;
  toLength(ui8, type, length);
  for (let i = 0; i < length; i++)
    ui8.push(value.charCodeAt(i));
};
