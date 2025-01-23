import { decode } from '../../../src/index.js';

const { BYTES_PER_ELEMENT: I32 } = Int32Array;
const maxByteLength = 2 ** 24;

postMessage('ready');

addEventListener('message', () => {
  let sab = new SharedArrayBuffer(I32, { maxByteLength });
  postMessage(['encode', sab]);
  Atomics.wait(new Int32Array(sab), 0);
  const value = new Uint8Array(sab);
  postMessage(['verify', decode(value)])
});
