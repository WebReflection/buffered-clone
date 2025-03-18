//@ts-check

import defaultOptions from './options.js';
import views from './views.js';

import {
  MAX_ARGS,
  Array,
  ArrayBuffer,
  DataView,
  Date,
  Error,
  ImageData,
  Map,
  RegExp,
  Set,
  String,
  TypeError,
  Uint8Array,
} from './globals.js';


const { isArray } = Array;
const { isView } = ArrayBuffer;
const { isInteger, isFinite } = Number;
const { entries } = Object;

/** @param {any} value */
const typeError = value => {
  throw new TypeError(`Unable to clone ${String(value)}`);
};

const notAscii = /[\u0080-\uFFFF]/;
const te = new TextEncoder;

export const encoder = ({
  littleEndian = defaultOptions.littleEndian,
  circular = defaultOptions.circular,
  byteOffset = defaultOptions.byteOffset,
  byteLength = defaultOptions.byteLength,
  useFloat32 = defaultOptions.useFloat32,
  useUTF16 = defaultOptions.useUTF16,
  mirrored = defaultOptions.mirrored,
  buffer = new ArrayBuffer(byteLength),
} = defaultOptions) => {
  let
    i = byteOffset,
    bufferLength = buffer.byteLength,
    data = new DataView(buffer),
    view = new Uint8Array(buffer)
  ;

  const isMirrored = 0 < mirrored.length;
  const isArrayBuffer = buffer instanceof ArrayBuffer;

  /** @param {ArrayBufferLike} [$] */
  const reBuffer = $ => {
    //@ts-ignore
    buffer = $ || buffer.transferToFixedLength(bufferLength);
    data = new DataView(buffer);
    view = new Uint8Array(buffer);
  };

  /**
   * @param {any} value
   * @param {Map} cache
   */
  const addCircular = (value, cache) => {
    const index = i;
    typeSize(-4, i - byteOffset);
    cache.set(value, view.slice(index, i));
    i = index;
  };

  const resize = length => {
    if (bufferLength < length) {
      const next = length + byteLength;
      // round to the highest BYTES_PER_ELEMENT so far
      bufferLength = next + 8 - (next % 8);
      if (isArrayBuffer) {
        if (buffer.resizable)
          buffer.resize(bufferLength);
        else
          reBuffer();
      }
      else
        buffer.grow(bufferLength);
    }
  };

  /**
   * @template T
   * @param {T} value
   * @param {Map} cache
   * @param {(value:T, cache:Map) => void} encoder
   */
  const builtin = (value, cache, encoder) => {
    known(value, cache) || encoder(value, cache);
  };

  /** @param {number} length */
  const size = length => {
    if (length < 0x100) asU8(length);
    else if (length < 0x10000) asU16(length);
    else asU32(length);
  };

  /**
   * @param {number} type
   * @param {number} length
   */
  const typeSize = (type, length) => {
    const index = i++;
    size(length);
    data.setInt8(index, type);
  };

  const asNull = () => {
    resize(i + 1);
    data.setInt8(i++, -1);
  };

  const asFalse = () => {
    resize(i + 1);
    data.setInt8(i++, -2);
  };

  const asTrue = () => {
    resize(i + 1);
    data.setInt8(i++, -3);
  };

  /**
   * @param {string} value
   * @param {number} [length]
   */
  const asAscii = (value, length = value.length) => {
    typeSize(-5, length);
    resize(i + length);
    for (let j = 0; j < length; j++) view[i++] = value.charCodeAt(j);
  };

  /**
   * @param {string} value
   * @param {Map} cache
   */
  const asString = (value, cache) => {
    let length = value.length;
    if (length) {
      const index = i;
      if (circular) addCircular(value, cache);
      if (MAX_ARGS <= length || notAscii.test(value)) {
        if (useUTF16) {
          typeSize(-7, length);
          resize(i + (length * 2));
          for (let j = 0; j < length; j++) {
            data.setUint16(i, value.charCodeAt(j), littleEndian);
            i += 2;
          }
        }
        else {
          const ui8a = te.encode(value);
          length = ui8a.length;
          typeSize(-6, length);
          resize(i + length);
          view.set(ui8a, i);
          i += length;
        }
      }
      else asAscii(value, length);
      if (!circular) cache.set(value, view.slice(index, i));
    }
    else typeSize(-5, 0);
  };

  /** @param {ArrayBufferLike} value */
  const asBuffer = value => {
    const length = value.byteLength;
    typeSize(-10, length);
    resize(i + length);
    view.set(new Uint8Array(value), i);
    i += length;
  };

  /**
   * @param {any[]} value
   * @param {Map} cache
   */
  const asArray = (value, cache) => {
    const length = value.length;
    typeSize(-11, length);
    for (let j = 0; j < length; j++)
      encode(value[j], cache);
  };

  /**
   * @param {Date} value
   */
  const asDate = value => {
    resize(i + 1);
    data.setInt8(i++, -12);
    asF64(value.getTime());
  };

  /**
   * @param {object} value
   * @param {Map} cache
   */
  const asObject = (value, cache) => {
    const pairs = entries(value);
    const length = pairs.length;
    typeSize(-13, length);
    for (let j = 0; j < length; j++) {
      const pair = pairs[j];
      builtin(pair[0], cache, asString);
      encode(pair[1], cache);
    }
  };

  /**
   * @param {symbol} value
   * @param {Map} cache
   */
  const asSymbol = (value, cache) => {
    let description = value.description || '';
    if (description.startsWith('Symbol.'))
      description = description.slice(7);
    else if (!Symbol.keyFor(value)) typeError(value);
    const length = description.length;
    if (!length) typeError(value);
    resize(i + 1);
    data.setInt8(i++, -14);
    asString(description, cache);
  };

  /**
   * @param {ArrayBufferView} value
   * @param {Map} cache
   */
  const asView = (value, cache) => {
    for (let j = 0; j < views.length; j++) {
      if (value instanceof views[j]) {
        const buffer = value.buffer;
        resize(i + 2);
        data.setInt8(i++, -15);
        data.setUint8(i++, j);
        if (circular) builtin(buffer, cache, asBuffer);
        else asBuffer(buffer);
        return;
      }
    }
    typeError(value);
  };

  /**
   * @param {Map} value
   * @param {Map} cache
   */
  const asMap = (value, cache) => {
    const pairs = [...value.entries()];
    const length = pairs.length;
    typeSize(-16, length);
    for (let j = 0; j < length; j++) {
      const pair = pairs[j];
      encode(pair[0], cache);
      encode(pair[1], cache);
    }
  };

  /**
   * @param {Set} value
   * @param {Map} cache
   */
  const asSet = (value, cache) => {
    const values = [...value.values()];
    const length = values.length;
    typeSize(-17, length);
    for (let j = 0; j < length; j++)
      encode(values[j], cache);
  };

  /**
   * @param {RegExp} value
   * @param {Map} cache
   */
  const asRegExp = ({ source, flags }, cache) => {
    resize(i + 1);
    data.setInt8(i++, -18);
    asString(source, cache);
    asAscii(flags);
  };

  /**
   * @param {ImageData} value
   * @param {Map} cache
   */
  const asImageData = (value, cache) => {
    const buffer = value.data.buffer;
    resize(i + 1);
    data.setInt8(i++, -19);
    if (circular) builtin(buffer, cache, asBuffer);
    else asBuffer(buffer);
    size(value.width);
    size(value.height);
    asObject({ colorSpace: value.colorSpace }, cache);
  };

  /**
   * @param {Error} value
   * @param {Map} cache
   */
  const asError = ({ name, message }, cache) => {
    resize(i + 1);
    data.setInt8(i++, -20);
    asAscii(name);
    asString(message, cache);
  };

  /**
   * @param {object} value
   * @param {Map} cache
   */
  const asJSON = (value, cache) => {
    const json = value.toJSON();
    const same = json === value;
    if (!same && typeof json === 'object' && json)
      encode(json, cache);
    else {
      const index = i;
      if (same) asNull();
      else encode(json, cache);
      cache.set(value, view.slice(index, i));
    }
  };

  /** @param {number} value */
  const asI8 = value => {
    resize(i + 2);
    data.setInt8(i++, -80);
    data.setInt8(i++, value);
  };

  /** @param {number} value */
  const asU8 = value => {
    resize(i + 2);
    data.setInt8(i++, -81);
    data.setUint8(i++, value);
  };

  /** @param {number} value */
  const asI16 = value => {
    resize(i + 3);
    data.setInt8(i, -82);
    data.setInt16(i + 1, value, littleEndian);
    i += 3;
  };

  /** @param {number} value */
  const asU16 = value => {
    resize(i + 3);
    data.setInt8(i, -83);
    data.setUint16(i + 1, value, littleEndian);
    i += 3;
  };

  // /** @param {number} value */
  // const asF16 = value => {
  //   resize(i + 3);
  //   data.setInt8(i, -84);
  //   //@ts-ignore
  //   data.setFloat16(i + 1, value, littleEndian);
  //   i += 3;
  // };

  /** @param {number} value */
  const asI32 = value => {
    resize(i + 5);
    data.setInt8(i, -85);
    data.setInt32(i + 1, value, littleEndian);
    i += 5;
  };

  /** @param {number} value */
  const asU32 = value => {
    resize(i + 5);
    data.setInt8(i, -86);
    data.setUint32(i + 1, value, littleEndian);
    i += 5;
  };

  // /** @param {number} value */
  const asF32 = value => {
    resize(i + 5);
    data.setInt8(i, -87);
    data.setFloat32(i + 1, value, littleEndian);
    i += 5;
  };

  /** @param {bigint} value */
  const asI64 = value => {
    resize(i + 9);
    data.setInt8(i, -88);
    data.setBigInt64(i + 1, value, littleEndian);
    i += 9;
  };

  // -89
  /** @param {bigint} value */
  const asU64 = value => {
    resize(i + 9);
    data.setInt8(i, -89);
    data.setBigUint64(i + 1, value, littleEndian);
    i += 9;
  };

  // -90
  /** @param {number} value */
  const asF64 = value => {
    resize(i + 9);
    data.setInt8(i, -90);
    data.setFloat64(i + 1, value, littleEndian);
    i += 9;
  };

  const float = useFloat32 ? asF32 : asF64;

  /**
   * @param {any} value
   * @param {Map} cache
   * @returns
   */
  const known = (value, cache) => {
    const cached = cache.get(value);
    if (cached) {
      const length = cached.length;
      resize(i + length);
      view.set(cached, i);
      i += length;
      return true;
    }
    return false;
  };

  /**
   * @param {any} value
   * @param {Map} cache
   */
  const encode = (value, cache) => {
    switch (typeof value) {
      case 'boolean': {
        if (value) asTrue();
        else asFalse();
        break;
      }
      case 'number': {
        if (isInteger(value)) {
          if (value < 0) {
            if (value >= -0x80) asI8(value);
            else if (value >= -0x8000) asI16(value);
            else if (value >= -0x80000000) asI32(value);
            else asF64(value);
          }
          else if (value < 0x80) asI8(value);
          else if (value < 0x100) asU8(value);
          else if (value < 0x8000) asI16(value);
          else if (value < 0x10000) asU16(value);
          else if (value < 0x80000000) asI32(value);
          else if (value < 0x100000000) asU32(value);
          else asF64(value);
        }
        else if (isFinite(value)) float(value);
        else asNull();
        break;
      }
      case 'string': {
        builtin(value, cache, asString);
        break;
      }
      case 'bigint': {
        if (value < 0n) asI64(value);
        else asU64(value);
        break;
      }
      case 'symbol': {
        asSymbol(value, cache);
        break;
      }
      case 'object': {
        if (value !== null) {
          if ((circular || isMirrored) && known(value, cache)) break;
          if (circular) addCircular(value, cache);
          if ('toJSON' in value) asJSON(value, cache);
          else if (isArray(value)) asArray(value, cache);
          else if (isView(value)) asView(value, cache);
          else if (value instanceof ArrayBuffer) asBuffer(value);
          else if (value instanceof Date) asDate(value);
          else if (value instanceof Map) asMap(value, cache);
          else if (value instanceof Set) asSet(value, cache);
          else if (value instanceof RegExp) asRegExp(value, cache);
          else if (value instanceof ImageData) asImageData(/** @type {ImageData} */(value), cache);
          else if (value instanceof Error) asError(value, cache);
          else asObject(value, cache);
          break;
        }
      }
      default: {
        asNull();
        break;
      }
    }
  };

  /** @type {[any,Uint8Array][]} */
  const computed = mirrored.map((value, index) => {
    typeSize(-79, index);
    const sub = view.slice(0, i);
    i = byteOffset;
    return [value, sub];
  });

  /**
   * Encode compatible values into a buffer.
   * If `into` is `true` (default: `false`) it returns
   * the amount of written bytes (as `buffer.byteLength`),
   * otherwise it returns a view of the serialized data,
   * copying the part of the buffer that was involved.
   * @param {any} value
   * @param {boolean | ArrayBufferLike} [into=false]
   * @returns {Uint8Array | number}
   */
  return (value, into = false) => {
    if (typeof into !== 'boolean') {
      bufferLength = into.byteLength;
      reBuffer(into);
    }
    i = byteOffset;
    encode(value, new Map(computed));
    const result = into ? (i - byteOffset) : view.slice(byteOffset, i);
    if (isArrayBuffer && i > byteLength && !buffer.resizable) {
      bufferLength = byteLength;
      reBuffer();
    }
    return result;
  };
};

export class Encoder {
  constructor(options = defaultOptions) {
    this.encode = encoder(options);
  }
}
