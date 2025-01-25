//@ts-check

const { BYTES_PER_ELEMENT } = Uint32Array;
const ui32b = new ArrayBuffer(BYTES_PER_ELEMENT);
const ui32a = new Uint32Array(ui32b);
const ui8a = new Uint8Array(ui32b);

/** @typedef {import("../encode.js").RAM} RAM */
/** @typedef {import("../encode.js").Recursion} Recursion */

/**
 * @param {RAM} RAM
 * @param {number} type
 * @param {string} str
 */
export const asASCII = (RAM, type, str) => {
  const { length } = str;
  pushLength(RAM, type, length);
  let { _, a, $ } = RAM;
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
  RAM._ = _;
};

/**
 * @param {any} value
 * @returns
 */
export const asValid = value => {
  const type = typeof value;
  switch (type) {
    case 'symbol':
    case 'function':
    case 'undefined': return '';
    default: return type;
  }
};

// // is this worth it at all? doesn't seem to be the bottleneck
// /**
//  * @param {RAM|Recursion} RAM
//  * @param {number} type
//  * @param {number} length
//  */
// export const pushLength1 = (RAM, type, length) => {
//   let { _, a, $ } = RAM;
//   if (length < 1) {
//     //@ts-ignore
//     if ($) a.buffer.resize(_ + 2);
//     a[_++] = type;
//     a[_++] = 0;
//   }
//   else if (length < (1 << 8)) {
//     //@ts-ignore
//     if ($) a.buffer.resize(_ + 3);
//     a[_++] = type;
//     a[_++] = 1;
//     a[_++] = length;
//   }
//   else {
//     ui32a[0] = length;
//     let len = BYTES_PER_ELEMENT;
//     while (len && !ui8a[len - 1]) len--;
//     //@ts-ignore
//     if ($) a.buffer.resize(_ + len + 2);
//     a[_++] = type;
//     a[_++] = len;
//     for (let i = 0; i < len; i++) a[_++] = ui8a[i];
//   }
//   RAM._ = _;
// };

import { unsigned } from '../number.js';

/**
 * @param {RAM|Recursion} RAM
 * @param {number} type
 * @param {number} length
 */
export const pushLength = (RAM, type, length) => {
  const [t, v] = unsigned(length);
  let { _, a, $ } = RAM, len = v.length;
  //@ts-ignore
  if ($) a.buffer.resize(_ + len + 2);
  a[_++] = type;
  a[_++] = t;
  for (let i = 0; i < len; i++) a[_++] = v[i];
  RAM._ = _;
};

/**
 * @param {RAM} RAM
 * @param {number} value
 */
export const pushValue = (RAM, value) => {
  let { _, a, $ } = RAM;
  //@ts-ignore
  if ($) a.buffer.resize(_ + 1);
  a[RAM._++] = value;
};

/**
 * @param {RAM} RAM
 * @param {number[]|Uint8Array} values
 */
export const pushValues = (RAM, values) => {
  let { _, a, $ } = RAM, i = 0, length = values.length;
  //@ts-ignore
  if ($) a.buffer.resize(_ + length);
  while (i < length) a[_++] = values[i++];
  RAM._ = _;
};

/**
 * @param {RAM} RAM
 * @param {number[]|Uint8Array} view
 */
export const pushView = (RAM, view) => {
  let { _, a, $ } = RAM, length = view.length;
  //@ts-ignore
  if ($) a.buffer.resize(_ + length);
  /** @type {Uint8Array} */(a).set(view, _);
  RAM._ += length;
};
