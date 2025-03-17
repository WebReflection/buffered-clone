//@ts-check

class Nope {}

const MAX_ARGS = 0xFFFF;

const {
  Array,
  ArrayBuffer,
  DataView,
  Date,
  Error,
  Map,
  Number,
  Object,
  RegExp,
  Set,
  String,
  TypeError,
  ImageData = Nope,

  Uint8Array,
  Uint8ClampedArray,
  Uint16Array,
  Uint32Array,
  //@ts-ignore
  Float16Array = Nope,
  Float32Array,
  Float64Array,
  Int8Array,
  Int16Array,
  Int32Array,
  BigUint64Array,
  BigInt64Array,
} = globalThis;

export {
  MAX_ARGS,
  Array,
  ArrayBuffer,
  DataView,
  Date,
  Error,
  Map,
  Number,
  Object,
  RegExp,
  Set,
  String,
  TypeError,
  ImageData,

  Uint8Array,
  Uint8ClampedArray,
  Uint16Array,
  Uint32Array,
  Float16Array,
  Float32Array,
  Float64Array,
  Int8Array,
  Int16Array,
  Int32Array,
  BigUint64Array,
  BigInt64Array,
};
