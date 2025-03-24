import { decoder } from '../../../../node_modules/jspack/src/decoder.js';

import Benchmark from '../benchmark.js';

const decode = decoder();

export let decoded = null;

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    decoded = decode(data);
    postMessage([ACTION, data], [data.buffer]);
  }
  else postMessage([Benchmark.INIT]);
});
