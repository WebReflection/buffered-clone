//@ts-check

import { fromLength, toLength } from './length.js';

/**
 * Convert numbers and dates into strings.
 * @param {Uint8Array} ui8a
 * @param {import("../decode.js").Position} at
 * @returns
 */
export const fromASCII = (ui8a, at) => {
  const length = fromLength(ui8a, at);
  const value = ui8a.subarray(at.i, (at.i += length));
  let s = '';
  for (let i = 0; i < length; i++) {
    switch (value[i]) {
      case 48: s += '0'; break;
      case 49: s += '1'; break;
      case 50: s += '2'; break;
      case 51: s += '3'; break;
      case 52: s += '4'; break;
      case 53: s += '5'; break;
      case 54: s += '6'; break;
      case 55: s += '7'; break;
      case 56: s += '8'; break;
      case 57: s += '9'; break;
      case 45: s += '-'; break;
      case 46: s += '.'; break;
      case 58: s += ':'; break;
      case 84: s += 'T'; break;
      case 90: s += 'Z'; break;
      case 101: s += 'e'; break;
      case 69: s += 'E'; break;
      default: s += '+'; break;
    }
  }
  return s;
};

/**
 * Convert numbers and dates into numbers.
 * @param {number[]} ui8
 * @param {number} type
 * @param {string} value
 */
export const toASCII = (ui8, type, value) => {
  const { length } = value;
  toLength(ui8, type, length);
  for (let i = 0; i < length; i++) {
    switch (value[i]) {
      case '0': ui8.push(48); break;
      case '1': ui8.push(49); break;
      case '2': ui8.push(50); break;
      case '3': ui8.push(51); break;
      case '4': ui8.push(52); break;
      case '5': ui8.push(53); break;
      case '6': ui8.push(54); break;
      case '7': ui8.push(55); break;
      case '8': ui8.push(56); break;
      case '9': ui8.push(57); break;
      case '-': ui8.push(45); break;
      case '.': ui8.push(46); break;
      case ':': ui8.push(58); break;
      case 'T': ui8.push(84); break;
      default: ui8.push(90); break;
      // ⚠️ this is never the case in JS encoding
      // case 'Z': ui8.push(90); break;
      // case 'e': ui8.push(101); break;
      // case 'E': ui8.push(69); break;
      // default: ui8.push(43); break;
    }
  }
};
