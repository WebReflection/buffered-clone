import Benchmark from '../benchmark.js';

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    postMessage([ACTION, data], [data.buffer]);
  }
  else postMessage([Benchmark.INIT]);
});
