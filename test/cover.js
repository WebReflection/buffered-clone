import { data, verify } from './data.js';
import { encode, decode } from '../src/index.js';

const convert = value => decode(encode(value));

const assert = (result, expected) => {
  if (!Object.is(result, expected)) {
    console.log({ result, expected });
    throw new Error(`Unexpected result`);
  }
};

console.time('structuredClone');
const structured = structuredClone(data);
console.timeEnd('structuredClone');
verify(structured);

console.time('complex data');
const converted = convert(data);
console.timeEnd('complex data');
verify(converted);

const length3 = 'a'.repeat(1 << 16);
assert(convert(length3), length3);

const length4 = 'a'.repeat(1 << 24);
assert(convert(length4), length4);

assert(convert(NaN), null);
// console.log(convert(NaN), convert([Infinity]), convert({a: -Infinity}));

assert(JSON.stringify(convert({})), '{}');
assert(convert(''), '');

class Random {
  constructor() {
    this.ok = true;
  }
}

assert(JSON.stringify(convert(new Random)), '{"ok":true}');

try {
  decode(new Uint8Array(['!'.charCodeAt(0), 0]));
  throw new Error('unknown types should not decode');
}
catch (OK) {}

assert(
  JSON.stringify(convert([1, () => {}, 2, Symbol(), 3, void 0, 4])),
  JSON.stringify([1, () => {}, 2, Symbol(), 3, void 0, 4])
);

assert(convert(true), true);
assert(convert(false), false);

// Options
const source = ['a', 'a'];
source.unshift(source);
let all = encode(source, { recursion: 'all' });
let some = encode(source, { recursion: 'some' });

try {
  encode(source, { recursion: 'none' });
  throw new Error('Unexpected encoding');
}
catch (OK) {}

assert(all.join(',') !== some.join(','), true);

try {
  decode(all, { recursion: 'none' });
  throw new Error('recursion should fail');
}
catch ({ message }) {
  assert(message, 'Unexpected recursive value @ 0');
}

try {
  decode(all, { recursion: 'some' });
  throw new Error('recursion should fail');
}
catch ({ message }) {
  assert(message, 'Unexpected recursive value @ 5');
}

assert(decode(some, { recursion: 'some' }).join(','), [[],'a', 'a'].join(','));

encode(new Uint8Array(1 << 0).buffer);
encode(new Uint8Array(1 << 8).buffer);
encode(new Uint8Array(1 << 16).buffer);
encode(new Uint8Array(1 << 24).buffer);

assert(decode(new Uint8Array([110, 1, 4, 43, 49, 101, 50])), 1e2);
assert(decode(new Uint8Array([110, 1, 4, 43, 49, 69, 50])), 1E2);

encode(() => {});
