import { decode } from '../../../src/index.js';

const { BYTES_PER_ELEMENT: I32 } = Int32Array;
const { BYTES_PER_ELEMENT: UI8 } = Uint8Array;

postMessage('ready');

addEventListener('message', () => {
  let sab = new SharedArrayBuffer(2 * I32);
  const i32a = new Int32Array(sab);
  postMessage(['length', sab]);
  Atomics.wait(i32a);
  const length = i32a[1];
  if (!length) return console.warn('no length');
  let BYTES = length * UI8;
  while (BYTES % 4) BYTES++;
  sab = new SharedArrayBuffer(BYTES);
  new Int32Array(sab);
  postMessage(['buffer', sab]);
  Atomics.wait(new Int32Array(sab), 0);
  postMessage(['verify', decode(new Uint8Array(sab))])
});
