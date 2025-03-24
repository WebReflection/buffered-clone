import { data, verify } from './data_old.js';
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

for (let i = 0; i < 10; i++) {
  if (i > 8) console.time('complex data via array');
  const converted = convert(data);
  if (i > 8) console.timeEnd('complex data via array');
  verify(converted);

  if (i > 8) console.time('complex data via buffer');
  const encodedBuffer = encode(data, { resizable: true });
  const convertedViaBuffer = decode(encodedBuffer);
  if (i > 8) console.timeEnd('complex data via buffer');
  verify(convertedViaBuffer);

  if (i > 8) console.time('complex data via pre-allocated buffer');
  const buffer = new ArrayBuffer(encodedBuffer.length);
  const allocatedBuffer = decode(encode(data, { buffer }));
  if (i > 8) console.timeEnd('complex data via pre-allocated buffer');
  verify(allocatedBuffer);
}

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
  assert(message, 'Unexpected Recursion @ 3');
}

try {
  decode(all, { recursion: 'some' });
  throw new Error('recursion should fail');
}
catch ({ message }) {
  assert(message, 'Unexpected Recursion @ 10');
}

assert(decode(some, { recursion: 'some' }).join(','), [[],'a', 'a'].join(','));

encode(new Uint8Array(1 << 0).buffer);
encode(new Uint8Array(1 << 8).buffer);
encode(new Uint8Array(1 << 16).buffer);
encode(new Uint8Array(1 << 24).buffer);

// assert(decode(new Uint8Array([110, 1, 4, 43, 49, 101, 50])), 1e2);
// assert(decode(new Uint8Array([110, 1, 4, 43, 49, 69, 50])), 1E2);

encode(() => {});
encode(new DataView(new ArrayBuffer(0)), { resizable: true });

// test empty ascii string
decode(encode(['a', /no-flags/, 'b']));

decode(encode([1, 1n, 1], { recursion: 'some' }), { recursion: 'some' });

// test fallback for Error and TypedArray
const name = [...encode('Unknown')];
// decode(new Uint8Array([101, ...name, ...encode('message')]));
// decode(new Uint8Array([84, ...name, ...encode(new ArrayBuffer(0))]));

// toBufferedClone
const toBufferedClone = Symbol.for('buffered-clone');

let invokes = 0;
class Recursive {
  [toBufferedClone]() {
    invokes++;
    const object = { seppuku: this };
    object.recursive = object;
    return object;
  }
}

let ref = new Recursive;
let arr = decode(encode([ref, ref]));
assert(invokes, 1);
assert(arr.length, 2);
assert(arr[0], arr[1]);
assert(arr[0].recursive, arr[1]);
assert(arr[0].seppuku, arr[0]);

invokes = 0;
class NotRecursive {
  [toBufferedClone]() {
    invokes++;
    return { invokes };
  }
}

ref = new NotRecursive;
arr = decode(encode([ref, ref], { recursion: 'none' }));
assert(invokes, 2);
assert(arr.length, 2);
assert(arr[0].invokes, 1);
assert(arr[1].invokes, 2);

assert(null, decode(encode({ [toBufferedClone]() { return null } })));

invokes = 0;
class BadRecursion {
  [toBufferedClone]() {
    invokes++;
    return null;
  }
}

ref = new BadRecursion;
arr = decode(encode([ref, ref]));
assert(invokes, 1);
assert(arr.length, 2);
assert(arr.every(v => v === null), true);

invokes = 0;
class SelfRecursion {
  [toBufferedClone]() {
    invokes++;
    return this;
  }
}

ref = new SelfRecursion;
arr = decode(encode([ref, ref]));
assert(invokes, 1);
assert(arr.length, 2);
assert(arr.every(v => v === null), true);

invokes = 0;
class DifferentRecursion {
  [toBufferedClone]() {
    invokes++;
    return Math.random();
  }
}

ref = new DifferentRecursion;
arr = decode(encode([ref, ref, 'ok'], { recursion: 'some' }));
assert(invokes, 1);
assert(arr.length, 3);
assert(arr[0], arr[1]);
assert(arr[2], 'ok');

assert(decode(encode(-1)), -1);
assert(decode(encode(-128)), -128);
assert(decode(encode(-70000)), -70000);
assert(decode(encode(-3000000)), -3000000);
assert(decode(encode(-4294967296 / 2)), -4294967296 / 2);
assert(decode(encode(4294967296)), 4294967296);
assert(decode(encode(-1n)), -1n);
assert(decode(encode(1n)), 1n);

for (const Class of [
  Int8Array,
  Int16Array,
  Int32Array,
  Uint8Array,
  Uint16Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  BigInt64Array,
  BigUint64Array,
]) {
  assert(decode(encode(new Class(1))).constructor, Class);
}

assert(decode(encode(['a', 'a'], { resizable: true, recursion: 'none' })).join(','), 'a,a');

import * as number from '../src/number.js';
import { U16, U32, F32 } from '../src/constants.js';

assert(decode(new Uint8Array([U16, ...number.u16.encode(123)])), 123);
assert(decode(new Uint8Array([U32, ...number.u32.encode(123)])), 123);
assert(decode(new Uint8Array([F32, ...number.f32.encode(123)])), 123);

assert(number.u16.encode(123).length, 2);
assert(number.u32.encode(123).length, 4);
assert(number.f32.encode(123).length, 4);

class NotError extends Error {
  name = 'NotError';
}

assert(decode(encode(new NotError('because'))).message, 'because');

assert(decode([]), void 0);
assert(decode(encode('')), '');
assert(decode(encode(['a', '', '', 'b'])).join('-'), 'a---b');
assert(decode(encode(1.2345678901234567)), 1.2345678901234567);
