//@ts-check

import {
  DataView,
  Uint16Array,
} from './globals.js';

export default {
  littleEndian: new DataView(new Uint16Array([256]).buffer).getUint16(0, true) === 256,
  circular: true,
  byteOffset: 0,
  byteLength: 0x1000000,
  useFloat32: false,
  useUTF16: false,
  mirrored: [],
};
