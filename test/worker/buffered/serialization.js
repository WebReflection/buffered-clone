import { encode, decode } from '../../../src/index.js';
import Benchmark from '../benchmark.js';

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    const json = encode(decode(data));
    postMessage([ACTION, json], [json.buffer]);
  }
  else postMessage([Benchmark.INIT]);
});
