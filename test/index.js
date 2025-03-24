import { ArrayBuffer } from '../src/globals.js';
import BufferedClone from '../src/index.js';
import { data } from './data.js';

import './cover.js';

// const buffer = new ArrayBuffer(0xFFFF);

// const {}

// let jsp = new JSPack({
//   mirrored: ["test"],
//   buffer,
//   byteOffset: 4,
//   useUTF16: true,
//   circular: false,
//   // minimumByteLength: 1,
// });

// console.log(jsp.encode(null, true));

// console.log(jsp.decode(jsp.encode("!".repeat(10))));

// console.log(jsp.decode(jsp.encode(["💩", "💩"])));

// console.log(jsp.decode(jsp.encode(new Uint16Array([1, 2]))));

// console.log(jsp.decode(jsp.encode("a")), jsp.decode(jsp.encode("🥳")));

// console.log(jsp.decode(jsp.encode([{"test": "value"}, "test"])));
// console.log(jsp.decode(jsp.encode(new Map([['a', 1]]))));
// console.log(jsp.decode(jsp.encode(new Set(['a', 1]))));
// console.log(jsp.decode(jsp.encode(/re/g)));
// console.log(jsp.decode(jsp.encode(new TypeError("test"))));

// console.log(jsp.decode(jsp.encode(data)));
