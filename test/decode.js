import { data } from './data.js';
import { encode, decode } from '../src/index.js';

const encoded = encode(data);

let result;
for (let i = 0; i < 100; i++) result = decode(encoded, { recursion: 'all' });
