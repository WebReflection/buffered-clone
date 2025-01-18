//@ts-check

const { BYTES_PER_ELEMENT } = Uint32Array;
const buffer = new ArrayBuffer(BYTES_PER_ELEMENT);
const ui32a = new Uint32Array(buffer);
const ui8a = new Uint8Array(buffer);

/**
 * @param {Uint8Array} ui8
 * @param {import("../decode.js").Position} at
 * @returns
 */
export const fromLength = (ui8, at) => {
  ui32a[0] = 0;
  for (let i = 0, length = ui8[at.i++]; i < length; i++)
    ui8a[i] = ui8[at.i++];
  return ui32a[0];
};

/**
 * @param {number} type
 * @param {number} length
 * @returns
 */
export const toLength = (type, length) => {
  const result = [type, 0];
  if (length) {
    ui32a[0] = length;
    let i = BYTES_PER_ELEMENT;
    while (i && ui8a[i - 1] === 0) i--;
    result[1] = i;
    result.push(...ui8a.slice(0, i));
  }
  return result;
};
