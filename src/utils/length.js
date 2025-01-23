//@ts-check

const { BYTES_PER_ELEMENT } = Uint32Array;
const ui32b = new ArrayBuffer(BYTES_PER_ELEMENT);
const ui32a = new Uint32Array(ui32b);
const ui8a = new Uint8Array(ui32b);

/**
 * @param {import("../encode.js").RAM|import("../encode.js").Recursion} RAM
 * @param {number} type
 * @param {number} length
 */
export const pushLength = (RAM, type, length) => {
  let { a, $, _ } = RAM;
  if (length < 1) {
    //@ts-ignore
    if ($) a.buffer.resize(_ + 2);
    a[_++] = type;
    a[_++] = 0;
  }
  else if (length < (1 << 8)) {
    //@ts-ignore
    if ($) a.buffer.resize(_ + 3);
    a[_++] = type;
    a[_++] = 1;
    a[_++] = length;
  }
  else {
    ui32a[0] = length;
    let len = BYTES_PER_ELEMENT;
    while (len && !ui8a[len - 1]) len--;
    //@ts-ignore
    if ($) a.buffer.resize(_ + len + 2);
    a[_++] = type;
    a[_++] = len;
    for (let i = 0; i < len; i++) a[_++] = ui8a[i];
  }
  RAM._ = _;
};
