//@ts-check

const { BYTES_PER_ELEMENT } = Uint32Array;
const ui32b = new ArrayBuffer(BYTES_PER_ELEMENT);
const ui32a = new Uint32Array(ui32b);
const ui8a = new Uint8Array(ui32b);

/**
 * @param {number[]|Uint8Array} a
 * @param {number} type
 * @param {number} length
 * @param {boolean} resizable
 */
export const pushLength = (a, type, length, resizable) => {
  let i = a.length;
  if (length < 1) {
    //@ts-ignore
    if (resizable) a.buffer.resize(i + 2);
    a[i++] = type;
    a[i++] = 0;
  }
  else if (length < (1 << 8)) {
    //@ts-ignore
    if (resizable) a.buffer.resize(i + 3);
    a[i++] = type;
    a[i++] = 1;
    a[i++] = length;
  }
  else {
    ui32a[0] = length;
    let l = BYTES_PER_ELEMENT;
    while (l && !ui8a[l - 1]) l--;
    //@ts-ignore
    if (resizable) a.buffer.resize(i + l + 2);
    a[i++] = type;
    a[i++] = l;
    for (let j = 0; j < l; j++) a[i++] = ui8a[j];
  }
};
