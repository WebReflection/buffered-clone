import { decode } from '../../../src/index.js';

const { BYTES_PER_ELEMENT: I32 } = Int32Array;
const maxByteLength = (2 ** 31) - 1;

postMessage('ready');

addEventListener('message', () => {
  let sab = new SharedArrayBuffer(I32, { maxByteLength });
  const i32a = new Int32Array(sab);
  postMessage(['encode', sab]);
  Atomics.wait(i32a, 0);
  const value = i32a[0] < 0 ? [] : i32a[0] < 2 ? [0] : new Uint8Array(sab);
  postMessage(['verify', decode(value)]);
});
