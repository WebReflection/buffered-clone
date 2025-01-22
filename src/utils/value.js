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
 * @param {number[]|Uint8Array} a
 * @param {number} value
 * @param {boolean} resizable
 */
export const pushValue = (a, value, resizable) => {
  const l = a.length;
  //@ts-ignore
  if (resizable) a.buffer.resize(l + 1);
  a[l] = value;
};

/**
 * @param {number[]|Uint8Array} a
 * @param {number[]|Uint8Array} values
 * @param {boolean} resizable
 */
export const pushValues = (a, values, resizable) => {
  let j = 0, i = a.length, l = values.length;
  //@ts-ignore
  if (resizable) a.buffer.resize(i + l);
  while (j < l) a[i++] = values[j++];
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
