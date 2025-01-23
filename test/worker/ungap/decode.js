import { parse } from 'https://esm.run/@ungap/structured-clone/json';
import Benchmark from '../benchmark.js';

export let decoded = null;

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    decoded = parse(data);
    postMessage([ACTION, data]);
  }
  else postMessage([Benchmark.INIT]);
});
