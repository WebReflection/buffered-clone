//@ts-check

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

/**
 * @param {import("../encode.js").RAM} RAM
 * @param {number} value
 */
export const pushValue = (RAM, value) => {
  let { a, $ } = RAM;
  //@ts-ignore
  if ($) a.buffer.resize(RAM._ + 1);
  a[RAM._++] = value;
};

/**
 * @param {import("../encode.js").RAM} RAM
 * @param {number[]|Uint8Array} values
 */
export const pushValues = (RAM, values) => {
  let { a, $, _ } = RAM, i = 0, length = values.length;
  //@ts-ignore
  if ($) a.buffer.resize(_ + length);
  while (i < length) a[_++] = values[i++];
  RAM._ = _;
};

/**
 * @param {import("../encode.js").RAM} RAM
 * @param {Uint8Array} view
 */
export const pushView = (RAM, view) => {
  let { a, $, _ } = RAM, length = view.length;
  //@ts-ignore
  if ($) a.buffer.resize(_ + length);
  /** @type {Uint8Array} */(a).set(view, _);
  RAM._ += length;
};

/**
 * @this {any[]}
 * @param {any} v
 * @param {string|symbol} k
 */
export function mapPair(v, k) {
  if (asValid(v) && asValid(k)) this.push(k, v);
}

/**
 * @this {any[]}
 * @param {any} v
 */
export function setValue(v) {
  if (asValid(v)) this.push(v);
}
