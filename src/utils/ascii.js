//@ts-check

import { pushLength } from './length.js';

/**
 * @param {number[]|Uint8Array} a
 * @param {number} type
 * @param {string} str
 * @param {boolean} resizable
 */
export const asASCII = (a, type, str, resizable) => {
  const { length } = str;
  pushLength(a, type, length, resizable);
  let i = a.length;
  //@ts-ignore
  if (resizable) a.buffer.resize(i + length);
  for (let j = 0; j < length; j++) {
    switch (str[j]) {
      case '0': a[i++] = 48; break;
      case '1': a[i++] = 49; break;
      case '2': a[i++] = 50; break;
      case '3': a[i++] = 51; break;
      case '4': a[i++] = 52; break;
      case '5': a[i++] = 53; break;
      case '6': a[i++] = 54; break;
      case '7': a[i++] = 55; break;
      case '8': a[i++] = 56; break;
      case '9': a[i++] = 57; break;
      case '-': a[i++] = 45; break;
      case '.': a[i++] = 46; break;
      case ':': a[i++] = 58; break;
      case 'T': a[i++] = 84; break;
      default: a[i++] = 90; break;
      // ⚠️ this is never the case in JS encoding
      // case 'Z': ui8a[i++] = 90; break;
      // case 'e': ui8a[i++] = 101; break;
      // case 'E': ui8a[i++] = 69; break;
      // default: ui8a[i++] = 43; break;
    }
  }
};
