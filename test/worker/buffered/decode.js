import { encode, decode } from '../../../src/index.js';
import Benchmark from '../benchmark.js';

export let decoded = null;

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    decoded = decode(data);
    postMessage([ACTION, data], [data.buffer]);
  }
  else postMessage([Benchmark.INIT]);
});
