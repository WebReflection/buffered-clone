//@ts-check

import defaultOptions from './options.js';
import views from './views.js';

import {
  MAX_ARGS,
  DataView,
  Date,
  Error,
  ImageData,
  Map,
  Object,
  RegExp,
  Set,
  String,
} from './globals.js';

const { create } = Object;
const { fromCharCode } = String;

const Null = () => null;
const False = () => false;
const True = () => true;
const Void = () => {};

/**
 * @param {number[] | ArrayBufferView} codes
 * @returns
 */
const asUTF16String = codes => fromCharCode.apply(null, codes);

const td = new TextDecoder;

export const decoder = ({
  littleEndian = defaultOptions.littleEndian,
  circular = defaultOptions.circular,
  mirrored = defaultOptions.mirrored,
} = defaultOptions) => {
  let i = 0;

  /**
   * object
   * @param {DataView} data
   * @param {Uint8Array} view
   * @param {object} cache
   * @returns
   */
  const builtin = (data, view, cache) => {
    //@ts-ignore
    return builtins[~data.getInt8(i++)](data, view, cache);
  }

  const builtins = [
    // null
    Null,

    // false
    False,

    // true
    True,

    /**
     * circular
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns{any}
     */
    (data, view, cache) => cache[builtin(data, view, cache)],

    /**
     * ascii
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const length = builtin(data, view, cache);
      let value = '';
      if (length) {
        value = asUTF16String(view.subarray(i, i + length));
        i += length;
        if (circular) cache[index - 1] = value;
      }
      return value;
    },

    /**
     * utf8 string
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const length = builtin(data, view, cache);
      const value = td.decode(view.slice(i, i + length));
      i += length;
      if (circular) cache[index - 1] = value;
      return value;
    },

    /**
     * utf16 string
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const length = builtin(data, view, cache);
      /** @type {number[]} */
      const codes = [];
      let value = '';
      for (let j = 0; j < length; j++) {
        if (0 < j && (j % MAX_ARGS) === 0)
          value += asUTF16String(codes.splice(0));
        codes.push(data.getUint16(i, littleEndian));
        i += 2;
      }
      value += asUTF16String(codes.splice(0));
      if (circular) cache[index - 1] = value;
      return value;
    },

    // leave room for other string variants, if ever
    Void(),
    Void(),

    /**
     * buffer
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const length = builtin(data, view, cache);
      const value = view.buffer.slice(i, i + length);
      if (circular) cache[index - 1] = value;
      i += length;
      return value;
    },

    /**
     * array
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const length = builtin(data, view, cache);
      const value = Array(length);
      if (circular) cache[index - 1] = value;
      for (let j = 0; j < length; j++)
        value[j] = decode(data, view, cache);
      return value;
    },

    /**
     * date
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const value = new Date(builtin(data, view, cache));
      if (circular) cache[index - 1] = value;
      return value;
    },

    /**
     * object
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const length = builtin(data, view, cache);
      const value = {};
      if (circular) cache[index - 1] = value;
      for (let j = 0; j < length; j++)
        value[builtin(data, view, cache)] = decode(data, view, cache);
      return value;
    },

    /**
     * symbol - known or public cymbols
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns{symbol}
     */
    (data, view, cache) => {
      const length = builtin(data, view, cache);
      const value = asUTF16String(view.subarray(i, i + length));
      i += length;
      return Symbol[value] || Symbol.for(value);
    },

    /**
     * view
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns {ArrayBufferView}
     */
    (data, view, cache) => {
      const index = i;
      const Class = views[data.getUint8(i++)];
      //@ts-ignore
      const value = new Class(builtin(data, view, cache));
      if (circular) cache[index - 1] = value;
      return value;
    },

    /**
     * map
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const length = builtin(data, view, cache);
      const value = new Map;
      if (circular) cache[index - 1] = value;
      for (let j = 0; j < length; j++)
        value.set(decode(data, view, cache), decode(data, view, cache));
      return value;
    },

    /**
     * set
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const length = builtin(data, view, cache);
      const value = new Set;
      if (circular) cache[index - 1] = value;
      for (let j = 0; j < length; j++)
        value.add(decode(data, view, cache));
      return value;
    },

    /**
     * regexp
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const value = new RegExp(
        builtin(data, view, cache),
        builtin(data, view, cache)
      );
      if (circular) cache[index - 1] = value;
      return value;
    },

    /**
     * imagedata
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => {
      const index = i;
      const ui8ca = new Uint8ClampedArray(builtin(data, view, cache));
      const width = builtin(data, view, cache);
      const height = builtin(data, view, cache);
      const options = builtin(data, view, cache);
      const value = new ImageData(ui8ca, width, height, options);
      if (circular) cache[index - 1] = value;
      return value;
    },

    /**
     * error
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns {Error}
     */
    (data, view, cache) => {
      const index = i;
      const Class = globalThis[builtin(data, view, cache)] || Error;
      //@ts-ignore
      const value = new Class(builtin(data, view, cache));
      if (circular) cache[index - 1] = value;
      return value;
    },
  ];

  // leave room for future builtins
  for (let j = builtins.length; j < 78; j++)
    builtins[j] = Void;

  builtins.push(
    /**
     * mirrored
     * @param {DataView} data
     * @param {Uint8Array} view
     * @param {object} cache
     * @returns
     */
    (data, view, cache) => mirrored[builtin(data, view, cache)],
  );

  // reserve final slots for numbers (starts at -80)
  builtins.push(
    /**
     * i8
     * @param {DataView} data
     * @returns
     */
    data => data.getInt8(i++),

    /**
     * u8
     * @param {DataView} data
     * @returns
     */
    data => data.getUint8(i++),

    /**
     * i16
     * @param {DataView} data
     * @returns
     */
    data => {
      const value = data.getInt16(i, littleEndian);
      i += 2;
      return value;
    },

    /**
     * u16
     * @param {DataView} data
     * @returns
     */
    data => {
      const value = data.getUint16(i, littleEndian);
      i += 2;
      return value;
    },

    /**
     * f16
     * @param {DataView} data
     * @returns
     */
    data => {
      //@ts-ignore
      const value = data.getFloat16(i, littleEndian);
      i += 2;
      return value;
    },

    /**
     * i32
     * @param {DataView} data
     * @returns
     */
    data => {
      const value = data.getInt32(i, littleEndian);
      i += 4;
      return value;
    },

    /**
     * u32
     * @param {DataView} data
     * @returns
     */
    data => {
      const value = data.getUint32(i, littleEndian);
      i += 4;
      return value;
    },

    /**
     * f32
     * @param {DataView} data
     * @returns
     */
    data => {
      const value = data.getFloat32(i, littleEndian);
      i += 4;
      return value;
    },

    /**
     * i64
     * @param {DataView} data
     * @returns
     */
    data => {
      const value = data.getBigInt64(i, littleEndian);
      i += 8;
      return value;
    },

    /**
     * u64
     * @param {DataView} data
     * @returns
     */
    data => {
      const value = data.getBigUint64(i, littleEndian);
      i += 8;
      return value;
    },

    /**
     * f64
     * @param {DataView} data
     * @returns
     */
    data => {
      const value = data.getFloat64(i, littleEndian);
      i += 8;
      return value;
    },
  );

  /**
   * @param {DataView} data
   * @param {Uint8Array} view
   * @param {object} cache
   * @returns {any}
   */
  const decode = (data, view, cache) => {
    const index = data.getInt8(i++);
    //@ts-ignore
    return index < 0 ? builtins[~index](data, view, cache) : null;
  };

  /**
   * @param {Uint8Array} view
   * @returns
   */
  return view => {
    i = 0;
    return decode(new DataView(view.buffer), view, create(null));
  };
};

export class Decoder {
  constructor(options = defaultOptions) {
    this.decode = decoder(options);
  }
}
