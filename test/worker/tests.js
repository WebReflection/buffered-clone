import * as flatted from 'https://esm.run/flatted';
import * as ungap from 'https://esm.run/@ungap/structured-clone/json';

import { data, verify } from '../data.js';
import { encode, decode } from '../../src/index.js';

const carts = await (await fetch('https://dummyjson.com/carts')).json();

let makeRecursive = true, cloned = null;
const recursive = () => {
  if (makeRecursive) {
    makeRecursive = false;
    cloned = structuredClone(carts);
    cloned.recursive = cloned;
    cloned.carts.unshift(cloned);
    cloned.carts.push(cloned);

  }
  return cloned;
};

let makeEncoded = true, encoded = null;
const buffer = () => {
  if (makeEncoded) {
    makeEncoded = false;
    encoded = encode(data);
  }
  return encoded;
};

const send = () => [[data]];
const sendEncoded = () => {
  const ui8a = encode(data);
  return [[ui8a], [ui8a.buffer]];
};

export default {
  ['Roundtrip']: [
    {
      name: 'Structured Clone',
      url: 'structured/roundtrip.js',
      hot: 1,
      send,
      verify,
    },
    {
      name: 'Structured Clone: double',
      url: 'structured/double.js',
      hot: 1,
      send,
      verify,
    },
    {
      name: 'Structured Clone: triple',
      url: 'structured/triple.js',
      hot: 1,
      send,
      verify,
    },
    {
      name: 'Buffered Clone',
      url: 'buffered/roundtrip.js',
      hot: 5,
      decode: data => decode(data),
      send: sendEncoded,
      verify,
    },
    {
      name: 'Buffered Clone: double',
      url: 'buffered/double.js',
      hot: 5,
      decode: data => decode(data),
      send: sendEncoded,
      verify,
    },
    {
      name: 'Buffered Clone: triple',
      url: 'buffered/triple.js',
      hot: 5,
      decode: data => decode(data),
      send: sendEncoded,
      verify,
    }
  ],
  ['Simple Serialization']: [
    {
      name: 'JSON',
      url: 'json/serialization.js',
      hot: 1,
      decode: data => JSON.parse(data),
      send: () => [[JSON.stringify(carts)]],
      verify(data) {
        if (JSON.stringify(data) !== JSON.stringify(carts))
          throw new Error('invalid data');
      }
    },
    {
      name: 'Flatted',
      url: 'flatted/serialization.js',
      hot: 5,
      decode: data => flatted.parse(data),
      send: () => [[flatted.stringify(carts)]],
      verify(data) {
        if (flatted.stringify(data) !== flatted.stringify(carts))
          throw new Error('invalid data');
      },
    },
    {
      name: '@ungap structured-clone/json',
      url: 'ungap/serialization.js',
      hot: 5,
      decode: data => ungap.parse(data),
      send: () => [[ungap.stringify(carts)]],
      verify(data) {
        if (ungap.stringify(data) !== ungap.stringify(carts))
          throw new Error('invalid data');
      },
    },
    {
      name: 'Buffered Clone',
      url: 'buffered/serialization.js',
      hot: 5,
      decode: data => decode(data),
      send: () => {
        const ui8a = encode(carts);
        return [[ui8a], [ui8a.buffer]];
      },
      verify(data) {
        const clone = encode(data);
        const source = encode(carts);
        if (clone.length !== source.length || !clone.every((v, i) => v === source[i]))
          throw new Error('invalid data');
      },
    },
  ],
  ['Recursive Serialization']: [
    {
      name: 'Flatted',
      url: 'flatted/serialization.js',
      hot: 3,
      decode: data => flatted.parse(data),
      send: () => [[flatted.stringify(recursive())]],
      verify(result) {
        if (flatted.stringify(result) !== flatted.stringify(recursive()))
          throw new Error('invalid data');
      },
    },
    {
      name: '@ungap structured-clone/json',
      url: 'ungap/serialization.js',
      hot: 1,
      decode: data => ungap.parse(data),
      send: () => [[ungap.stringify(recursive())]],
      verify(result) {
        if (ungap.stringify(result) !== ungap.stringify(recursive()))
          throw new Error('invalid data');
      },
    },
    {
      name: 'Buffered Clone',
      url: 'buffered/serialization.js',
      hot: 1,
      decode: data => decode(data),
      send() {
        const ui8a = encode(recursive());
        return [[ui8a], [ui8a.buffer]];
      },
      verify(result) {
        const clone = encode(result);
        const source = encode(recursive());
        if (clone.length !== source.length || !clone.every((v, i) => v === source[i]))
          throw new Error('invalid data');
      }
    },
  ],

  ['Complex Serialization']: [
    // // Fails due BigInt
    // {
    //   name: 'Flatted',
    //   url: 'flatted/serialization.js',
    //   hot: 3,
    //   decode: data => flatted.parse(data),
    //   send: () => [[flatted.stringify(data)]],
    //   verify(result) {
    //     if (flatted.stringify(result) !== flatted.stringify(data))
    //       throw new Error('invalid data');
    //   },
    // },
    // // Fails due *reasons* ⚠️ (TODO: investigation?)
    // {
    //   name: '@ungap structured-clone/json',
    //   url: 'ungap/serialization.js',
    //   hot: 1,
    //   decode: data => ungap.parse(data),
    //   send: () => [[ungap.stringify(data)]],
    //   verify(result) {
    //     if (ungap.stringify(result) !== ungap.stringify(data))
    //       throw new Error('invalid data');
    //   },
    // },
    // it never fails 🥳
    {
      name: 'Buffered Clone',
      url: 'buffered/serialization.js',
      hot: 3,
      decode: data => decode(data),
      send() {
        const ui8a = encode(data);
        return [[ui8a], [ui8a.buffer]];
      },
      verify(result) {
        const clone = encode(result);
        const source = encode(data);
        if (clone.length !== source.length || !clone.every((v, i) => v === source[i]))
          throw new Error('invalid data');
      }
    },
  ],
  ['Decode Complex Data']: [
    {
      name: 'Buffered Clone',
      url: 'buffered/decode.js',
      hot: 3,
      decode: data => decode(data),
      send: () => [[buffer()]],
      verify(result) {
        const clone = encode(result);
        const source = buffer();
        if (clone.length !== source.length || !clone.every((v, i) => v === source[i]))
          throw new Error('invalid data');
      }
    },
  ],
};
