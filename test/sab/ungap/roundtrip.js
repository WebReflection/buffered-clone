import { parse } from 'https://esm.run/@ungap/structured-clone/json';

const { BYTES_PER_ELEMENT: I32 } = Int32Array;
const maxByteLength = 2 ** 24;

const decoder = new TextDecoder;

postMessage('ready');

addEventListener('message', () => {
  let sab = new SharedArrayBuffer(I32, { maxByteLength });
  postMessage(['encode', sab]);
  const i32a = new Int32Array(sab);
  Atomics.wait(i32a, 0);
  const length = i32a[0];
  const value = new Uint8Array(sab).slice(I32, I32 + length);
  postMessage(['verify', parse(decoder.decode(value))]);
});
