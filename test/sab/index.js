import { stringify } from 'https://esm.run/@ungap/structured-clone/json';
import { encode } from '../../src/index.js';

// this cannot be used otherwise structured-clone fails
// import { data, verify } from '../data.js';

// this is a temporary fallback until the structured-clone library
// gets patched ... if ever, as I'm not sure what is going on there
const data = await (await fetch('../worker/carts.json')).json();
const verify = () => {};
data.recursive = data;
data.carts.unshift(data);
data.carts.push(data);

const test = async handler => {
  let queue = Promise.withResolvers();
  const worker = new Worker(handler.url, { type: 'module' });
  worker.addEventListener('message', queue.resolve, { once: true });

  await queue.promise;
  queue = Promise.withResolvers();
  handler.resolve = queue.resolve;
  worker.addEventListener('message', handler);

  console.time(handler.name);
  worker.postMessage('run');

  await queue.promise;
  worker.terminate();
};

const buffered = {
  resolve: null,
  name: 'buffered-clone',
  url: 'buffered/roundtrip.js',
  handleEvent({ data: [ACTION, sab] }) {
    if (ACTION === 'encode') {
      const encoded = encode(stringify(data));
      let { length } = encoded;
      length += length % 4;
      sab.grow(length);
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

for (let i = 0; i < 10; i++) await test(buffered);

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

for (let i = 0; i < 10; i++) await test(ungap);

// for (let i = 0; i < 10; i++)
//   await test('@ungap structured-clone/json', 'ungap/roundtrip.js');

document.body.textContent = '✅ Done - see devtools console for results';
