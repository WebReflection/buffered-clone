//@ts-check

import defaultOptions from './options.js';
import { decoder } from './decoder.js';
import { encoder } from './encoder.js';

export default class JSPack {
  constructor(options = defaultOptions) {
    this.decode = decoder(options);
    this.encode = encoder(options);
  }
}
