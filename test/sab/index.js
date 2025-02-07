import { stringify } from 'https://esm.run/@ungap/structured-clone/json';
import { encode } from '../../src/index.js';

import { data, verify } from '../data.js';
// const data = await (await fetch('../worker/carts.json')).json();
// const verify = () => true;

const RUNS = 10;
const Workers = new WeakMap;

const create = handler => {
  const queue = Promise.withResolvers();
  const worker = new Worker(handler.url, { type: 'module' });
  const entry = [worker, queue];
  worker.addEventListener('message', queue.resolve, { once: true });
  Workers.set(handler, entry);
  return entry;
};

const sleep = ms => new Promise($ => setTimeout($, ms));

const terminate = async handler => {
  const [worker] = Workers.get(handler);
  Workers.delete(handler);
  worker.terminate();
  console.log('');
  await sleep(500);
};

const test = async handler => {
  let [worker, queue] = Workers.get(handler) || create(handler);

  await queue.promise;
  queue = Promise.withResolvers();
  handler.resolve = queue.resolve;
  worker.addEventListener('message', handler);

  console.time(handler.name);
  worker.postMessage('run');

  await queue.promise;
  worker.removeEventListener('message', handler);
  // worker.terminate();
};

const coincident = {
  resolve: null,
  name: 'coincident',
  url: 'coincident/roundtrip.js',
  track: new Map,
  encoder: new TextEncoder,
  handleEvent({ data: [ACTION, sab, id] }) {
    if (ACTION === 'length') {
      const encoded = this.encoder.encode(stringify(data));
      this.track.set(id, encoded);
      const i32a = new Int32Array(sab);
      i32a[0] = 1;
      i32a[1] = encoded.length;
      Atomics.notify(i32a, 0);
    }
    else if (ACTION === 'encode') {
      const encoded = this.track.get(id);
      this.track.delete(id);
      new Uint8Array(sab).set(encoded);
      Atomics.notify(new Int32Array(sab), 0);
    }
    else if (ACTION === 'verify') {
      console.timeEnd(this.name);
      verify(sab);
      this.resolve();
    }
  }
};

for (let i = 0; i < RUNS; i++) await test(coincident);
await terminate(coincident);

const ungap = {
  resolve: null,
  name: 'structured-clone/json',
  url: 'ungap/roundtrip.js',
  encoder: new TextEncoder,
  handleEvent({ data: [ACTION, sab] }) {
    if (ACTION === 'encode') {
      const encoded = this.encoder.encode(stringify(data));
      const { length } = encoded;
      let i = length + 4;
      while (i % 4) i++;
      sab.grow(i);
      new Uint8Array(sab).set(encoded, 4);
      const i32a = new Int32Array(sab);
      i32a[0] = length;
      Atomics.notify(i32a, 0);
    }
    else if (ACTION === 'verify') {
      console.timeEnd(this.name);
      verify(sab);
      this.resolve();
    }
  }
};

for (let i = 0; i < RUNS; i++) await test(ungap);
await terminate(ungap);

const bufferedTwice = {
  resolve: null,
  name: 'buffered-clone-double',
  url: 'buffered/double-roundtrip.js',
  track: new Map,
  handleEvent({ data: [ACTION, sab, id] }) {
    if (ACTION === 'length') {
      const encoded = encode(data);
      this.track.set(id, encoded);
      const i32a = new Int32Array(sab);
      i32a[0] = 1;
      i32a[1] = encoded.length;
      Atomics.notify(i32a, 0);
    }
    else if (ACTION === 'encode') {
      const encoded = this.track.get(id);
      this.track.delete(id);
      new Uint8Array(sab).set(encoded);
      Atomics.notify(new Int32Array(sab), 0);
    }
    else if (ACTION === 'verify') {
      console.timeEnd(this.name);
      verify(sab);
      this.resolve();
    }
  }
};

for (let i = 0; i < RUNS; i++) await test(bufferedTwice);
await terminate(bufferedTwice);

const buffered = {
  resolve: null,
  name: 'buffered-clone',
  url: 'buffered/roundtrip.js',
  handleEvent({ data: [ACTION, sab] }) {
    if (ACTION === 'encode') {
      const encoded = encode(data);
      const i32a = new Int32Array(sab);
      let { length } = encoded;
      if (length < 1) i32a[0] = -1;
      else if (length < 2) i32a[0] = 1;
      else {
        while (length % 4) length++;
        sab.grow(length);
        new Uint8Array(sab).set(encoded);
      }
      Atomics.notify(i32a, 0);
    }
    else if (ACTION === 'verify') {
      console.timeEnd(this.name);
      verify(sab);
      this.resolve();
    }
  }
};

for (let i = 0; i < RUNS; i++) await test(buffered);
await terminate(buffered);

document.body.textContent = '✅ Done - see devtools console for results';
