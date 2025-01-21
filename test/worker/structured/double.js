import Benchmark from '../benchmark.js';

let queue = Promise.withResolvers();

const worker = new Worker('./roundtrip.js', { type: 'module' });

worker.addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  queue.resolve([ACTION, ...rest]);
  queue = Promise.withResolvers();
});

addEventListener('message', async ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    worker.postMessage([ACTION, data]);
  }
  else worker.postMessage([Benchmark.INIT]);
  const result = await queue.promise;
  postMessage(result);
});
