import Benchmark from '../benchmark.js';

let queue = Promise.withResolvers();

const worker = new Worker('./double.js', { type: 'module' });

worker.addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    queue.resolve([[ACTION, data], [data.buffer]]);
  }
  else queue.resolve([[Benchmark.INIT]]);
  queue = Promise.withResolvers();
});

addEventListener('message', async ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    worker.postMessage([ACTION, data], [data.buffer]);
  }
  else worker.postMessage([Benchmark.INIT]);
  const result = await queue.promise;
  postMessage(...result);
});
