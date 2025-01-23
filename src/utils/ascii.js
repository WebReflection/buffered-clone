//@ts-check

import { pushLength } from './length.js';

/**
 * @param {import("../encode.js").RAM} RAM
 * @param {number} type
 * @param {string} str
 */
export const asASCII = (RAM, type, str) => {
  const { length } = str;
  pushLength(RAM, type, length);
  let { a, $, _ } = RAM;
  if ($) {
    //@ts-ignore
    a.buffer.resize(_ + length);
    // ⚠️ this cannot be done with a resizable buffer: WHY?!?
    // ⚠️ this likely cannot be done with a SharedArrayBuffer too!
    // encoder.encodeInto(str, a.subarray(_));
    // RAM._ += length;
  }

  for (let i = 0; i < length; i++)
    a[_++] = str.charCodeAt(i);

  // ⚠️ I'll keep this madness in here but ... 🤷
  // for (let i = 0; i < length; i++) {
  //   switch (str[i]) {
  //     case '0': a[_++] = 48; break;
  //     case '1': a[_++] = 49; break;
  //     case '2': a[_++] = 50; break;
  //     case '3': a[_++] = 51; break;
  //     case '4': a[_++] = 52; break;
  //     case '5': a[_++] = 53; break;
  //     case '6': a[_++] = 54; break;
  //     case '7': a[_++] = 55; break;
  //     case '8': a[_++] = 56; break;
  //     case '9': a[_++] = 57; break;
  //     case '-': a[_++] = 45; break;
  //     case '.': a[_++] = 46; break;
  //     case ':': a[_++] = 58; break;
  //     case 'T': a[_++] = 84; break;
  //     default: a[_++] = 90; break;
  //     // ⚠️ this is never the case in JS encoding
  //     // case 'Z': ui8a[i++] = 90; break;
  //     // case 'e': ui8a[i++] = 101; break;
  //     // case 'E': ui8a[i++] = 69; break;
  //     // default: ui8a[i++] = 43; break;
  //   }
  // }

  RAM._ = _;
};
