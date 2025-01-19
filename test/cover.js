import { data, verify } from './data.js';
import { encode, decode } from '../src/index.js';

const convert = value => decode(encode(value));

const assert = (result, expected) => {
  if (!Object.is(result, expected))
    throw new Error(`Unexpected result`);
};

verify(convert(data));

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
