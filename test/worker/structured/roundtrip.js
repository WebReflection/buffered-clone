import Benchmark from '../benchmark.js';

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    postMessage([ACTION, data]);
  }
  else postMessage([Benchmark.INIT]);
});
