import { data, verify } from './data.js';
import { encode, decode } from '../src/index.js';

// const data = [1, 2, 3];
// data.push(data);
// const verify = clone => clone.length === data.length && clone[3] === clone;

console.time('cold structuredClone');
var clone = structuredClone(data);
console.timeEnd('cold structuredClone');
verify(clone);

for (let i = 0; i < 5; i++)
  verify(structuredClone(data));

console.time('hot structuredClone');
var clone = structuredClone(data);
console.timeEnd('hot structuredClone');
verify(clone);

console.time('cold bufferedClone');
var clone = decode(encode(data));
console.timeEnd('cold bufferedClone');
verify(clone);

for (let i = 0; i < 5; i++)
  verify(decode(encode(data)));

console.time('hot bufferedClone');
var clone = decode(encode(data));
console.timeEnd('hot bufferedClone');
verify(clone);

console.time('encode bufferedClone');
var encoded = encode(data);
console.timeEnd('encode bufferedClone');
verify(decode(encoded));

console.time('decode bufferedClone');
var clone = decode(encoded);
console.timeEnd('decode bufferedClone');
verify(clone);
