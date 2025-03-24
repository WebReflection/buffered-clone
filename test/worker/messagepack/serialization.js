import Benchmark from '../benchmark.js';

import { Encoder, Decoder } from 'https://esm.run/@webreflection/messagepack@0.0.3';

const { encode: wrEncode } = new Encoder({ initialBufferSize: 0xFFFF });
const { decode: wrDecode } = new Decoder();

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    const json = wrDecode(data);
    postMessage([ACTION, wrEncode(json)]);
  }
  else postMessage([Benchmark.INIT]);
});
