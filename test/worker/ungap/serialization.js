import { parse, stringify } from 'https://esm.run/@ungap/structured-clone/json';

import Benchmark from '../benchmark.js';

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    const json = parse(data);
    postMessage([ACTION, stringify(json)]);
  }
  else postMessage([Benchmark.INIT]);
});
