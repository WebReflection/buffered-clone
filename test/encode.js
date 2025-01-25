import { data } from './data.js';
import { encode } from '../src/index.js';
import carts from './worker/carts.json' with { type: 'json' };

let result;
for (let i = 0; i < 100; i++) result = encode(carts, { recursion: 'none' });
