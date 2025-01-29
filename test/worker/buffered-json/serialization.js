import { encode, decode } from '../../../src/json/index.js';
import Benchmark from '../benchmark.js';

addEventListener('message', ({ data: [ACTION, data] }) => {
  if (ACTION === Benchmark.RUN) {
    const json = encode(decode(data));
    postMessage([ACTION, json], [json.buffer]);
  }
  else postMessage([Benchmark.INIT]);
});
