//@ts-check

import { BYTES_PER_ELEMENT } from './constants.js';

/**
 * @template T
 * @typedef {T extends undefined ? never : T extends Function ? never : T extends symbol ? never : T} Serializable
 */

const buffer = new ArrayBuffer(BYTES_PER_ELEMENT);
export const ui32a = new Uint32Array(buffer);
export const ui8a = new Uint8Array(buffer);
