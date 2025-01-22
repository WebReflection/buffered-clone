// import { EJSON } from 'https://esm.run/bson';
import Benchmark from '../benchmark.js';

let BSON;

addEventListener('message', ({ data: [ACTION, ...rest] }) => {
  if (ACTION === Benchmark.RUN) {
    const [data] = rest;
    const json = BSON.deserialize(data);
    postMessage([ACTION, BSON.serialize(json)]);
  }
  else {
    import('https://esm.run/bson').then(module => {
      ({ BSON } = module);
      postMessage([Benchmark.INIT]);
    });
  }
});
