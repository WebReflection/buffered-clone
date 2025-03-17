import Benchmark from '../benchmark.js';

import JSPack from '../../../../node_modules/jspack/src/index.js';

const { encode, decode } = new JSPack({ circular: false });

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    // const [data] = rest;
    // const json = decode(data);
    // postMessage([ACTION, encode(json)]);
    const [data] = rest;
    const json = encode(decode(data));
    postMessage([ACTION, json], [json.buffer]);
  }
  else postMessage([Benchmark.INIT]);
});
