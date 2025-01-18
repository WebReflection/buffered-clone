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
 * @param {number} type
 * @param {number} length
 * @returns
 */
export const toLength = (type, length) => {
  if (length < 1) return [type, 0];
  if (length < (1 << 8)) return [type, 1, length];
  ui32a[0] = length;
  if (ui8a[3]) return [type, 4, ...ui8a];
  if (ui8a[2]) return [type, 3, ui8a[0], ui8a[1], ui8a[2]];
  return [type, 2, ui8a[0], ui8a[1]];
};
