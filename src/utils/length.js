//@ts-check

/**
 * @param {Uint8Array} ui8
 * @param {import("../decode.js").Position} at
 * @returns
 */
export const fromLength = (ui8, at) => {
  let value = 0;
  for (let i = 0, length = ui8[at.i++]; i < length; i++)
    value += ui8[at.i++] << (i * 8);
  return value;
};

const buffer = new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);
const ui32a = new Uint32Array(buffer);
const ui8a = new Uint8Array(buffer);

/**
 * @param {number[]} ui8
 * @param {number} type
 * @param {number} length
 * @returns
 */
export const toLength = (ui8, type, length) => {
  let result = 0;
  if (length < 1) ui8.push(type, result);
  else if (length < (1 << 8)) ui8.push(type, (result = 1), length);
  else {
    ui32a[0] = length;
    if (ui8a[3]) ui8.push(type, (result = 4), ...ui8a);
    else if (ui8a[2]) ui8.push(type, (result = 3), ui8a[0], ui8a[1], ui8a[2]);
    else ui8.push(type, (result = 2), ui8a[0], ui8a[1]);
  }
  return result;
};
