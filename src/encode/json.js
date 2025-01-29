//@ts-check

/** @typedef {import("../json/encode.js").RAM} RAM */
/** @typedef {import("../encode.js").Recursion} Recursion */

/**
 * @param {RAM} RAM
 * @param {number} type
 * @param {string} str
 */
export const asASCII = (RAM, type, str) => {
  const { length } = str;
  pushLength(RAM, type, length);
  let { _, a } = RAM;
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

import { U8, F64 } from '../constants.js';
import { f64 } from '../number.js';

/**
 * @param {RAM|Recursion} RAM
 * @param {number} type
 * @param {number} length
 */
export const pushLength = (RAM, type, length) => {
  let { _, a } = RAM;
  if (-1 < length && length < 256) {
    a[_++] = type;
    a[_++] = U8;
    a[_++] = length;
  }
  else {
    const v = f64.encode(length);
    a[_++] = type;
    a[_++] = F64;
    for (let i = 0; i < v.length; i++) a[_++] = v[i];
  }
  RAM._ = _;
};

/**
 * @param {RAM} RAM
 * @param {number} value
 */
export const pushValue = (RAM, value) => {
  RAM.a[RAM._++] = value;
};

/**
 * @param {RAM} RAM
 * @param {number[]|Uint8Array} values
 */
export const pushValues = (RAM, values) => {
  let { _, a } = RAM, i = 0, length = values.length;
  while (i < length) a[_++] = values[i++];
  RAM._ = _;
};

/**
 * @param {RAM} RAM
 * @param {number[]|Uint8Array} view
 */
export const pushView = (RAM, view) => {
  let { _, a } = RAM, length = view.length;
  /** @type {Uint8Array} */(a).set(view, _);
  RAM._ += length;
};
