//@ts-check

import { BYTES_PER_ELEMENT } from './constants.js';

/** @typedef {null | boolean | bigint | number | string | any[] | object} Serializable */

const buffer = new ArrayBuffer(BYTES_PER_ELEMENT);
export const ui32a = new Uint32Array(buffer);
export const ui8a = new Uint8Array(buffer);
