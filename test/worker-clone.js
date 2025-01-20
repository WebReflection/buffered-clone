import { encode, decode } from '../src/index.js';

export let known;

addEventListener('message', ({ data: [name, value, recursion] }) => {
  known = recursion ? encode(decode(value, { recursion })) : structuredClone(value);
  postMessage([name, known, recursion], [known.buffer]);
});
