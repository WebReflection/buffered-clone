import { decode } from '../../../src/index.js';

const { BYTES_PER_ELEMENT: I32 } = Int32Array;

postMessage('ready');

let uid = 0;

addEventListener('message', () => {
  const id = uid++;
  let sab = new SharedArrayBuffer(I32 * 2);
  let i32a = new Int32Array(sab);
  postMessage(['length', sab, id]);
  Atomics.wait(i32a, 0);
  let length = i32a[1];
  sab = new SharedArrayBuffer(length + (I32 - (length % I32)));
  i32a = new Int32Array(sab);
  postMessage(['encode', sab, id]);
  Atomics.wait(i32a, 0);
  const value = new Uint8Array(sab);
  postMessage(['verify', decode(value)]);
});
