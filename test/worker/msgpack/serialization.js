import Benchmark from '../benchmark.js';

import * as msgpack from 'https://esm.run/@msgpack/msgpack';

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    const json = msgpack.decode(data);
    postMessage([ACTION, msgpack.encode(json)]);
  }
  else postMessage([Benchmark.INIT]);
});
