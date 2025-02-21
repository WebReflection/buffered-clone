import * as flatted from 'https://esm.run/flatted';
import * as ungap from 'https://esm.run/@ungap/structured-clone/json';
import { BSON } from 'https://esm.run/bson';

import { data, verify } from '../data.js';
import { encode, decode } from '../../src/index.js';

const carts = await (await fetch('./carts.json')).json();

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

const checkRecursion = data => {
  let ok = 1;
  if (data.dataview.buffer !== data.buffer) {
    ok = 0;
    console.warn('wrong buffer on dataview');
  }
  if (data.typed.buffer !== data.buffer) {
    ok = 0;
    console.warn('wrong buffer on typed array');
  }
  if (data.object.recursive !== data) {
    ok = -1;
    console.error('recursion not working');
  }
  return ok;
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
      name: 'BSON',
      url: 'bson/serialization.js',
      hot: 5,
      decode: data => BSON.deserialize(data),
      send: () => [[BSON.serialize(carts)]],
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
      recursion: 'all',
      decode(data) {
        return decode(data, { recursion: this.recursion });
      },
      send() {
        const options = { recursion: this.recursion };
        const ui8a = encode(carts, options);
        return [[ui8a, options], [ui8a.buffer]];
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
      hot: 3,
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
      hot: 3,
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
    // both flatted and BSON are out of the equation
    // as either these don't support recursion or these
    // simply ignore complex JS types
    {
      name: '@ungap structured-clone/json',
      url: 'ungap/serialization.js',
      hot: 3,
      ok: 1,
      warn: true,
      decode: data => ungap.parse(data),
      send: () => [[ungap.stringify(data)]],
      verify(result) {
        if (this.warn) {
          this.warn = false;
          this.ok = checkRecursion(result);
        }
        if (ungap.stringify(result) !== ungap.stringify(data))
          throw new Error('invalid data');
        return this.ok;
      },
    },
    {
      name: 'Buffered Clone',
      url: 'buffered/serialization.js',
      hot: 3,
      ok: 1,
      warn: true,
      decode: data => decode(data),
      send() {
        const ui8a = encode(data);
        return [[ui8a], [ui8a.buffer]];
      },
      verify(result) {
        if (this.warn) {
          this.warn = false;
          this.ok = checkRecursion(result);
        }
        const clone = encode(result);
        const source = encode(data);
        if (clone.length !== source.length || !clone.every((v, i) => v === source[i]))
          throw new Error('invalid data');
        return this.ok;
      }
    },
  ],
  ['Decode Complex Data']: [
    {
      name: '@ungap structured-clone/json',
      url: 'ungap/decode.js',
      hot: 3,
      ok: 1,
      warn: true,
      decode: data => ungap.parse(data),
      send: () => [[ungap.stringify(data)]],
      verify(result) {
        if (this.warn) {
          this.warn = false;
          this.ok = checkRecursion(result);
        }
        if (ungap.stringify(result) !== ungap.stringify(data))
          throw new Error('invalid data');
        return this.ok;
      }
    },
    {
      name: 'Buffered Clone',
      url: 'buffered/decode.js',
      hot: 3,
      ok: 1,
      warn: true,
      decode: data => decode(data),
      send: () => [[buffer()]],
      verify(result) {
        if (this.warn) {
          this.warn = false;
          this.ok = checkRecursion(result);
        }
        const clone = encode(result);
        const source = buffer();
        if (clone.length !== source.length || !clone.every((v, i) => v === source[i]))
          throw new Error('invalid data');
        return this.ok;
      }
    },
  ],
};
