import { encode, decode } from '../../../src/index.js';
import Benchmark from '../benchmark.js';

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data, options] = rest;
    const json = encode(decode(data, options), options);
    postMessage([ACTION, json], [json.buffer]);
  }
  else postMessage([Benchmark.INIT]);
});
