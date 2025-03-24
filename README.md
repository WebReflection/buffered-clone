# buffered-clone

[![Coverage Status](https://coveralls.io/repos/github/WebReflection/buffered-clone/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/buffered-clone?branch=main) 

<sup>**Social Media Photo by [marc belver colomer](https://unsplash.com/@marc_belver) on [Unsplash](https://unsplash.com/)**</sup>

A [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) like utility that converts all [supported JS types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#javascript_types), plus [ImageData](https://developer.mozilla.org/en-US/docs/Web/API/ImageData), into a binary format.

**Highlights**

  * recursive out of the box for almost anything that can be serialized
  * once *hot*, it's nearly as fast as native *structuredClone*
  * it allows filling pre-allocated buffers and *SharedArrayBuffer*
  * it allows growing *buffers* if resizable
  * supports `toJSON` (already) and *MessagePack* extensions like mechanism (coming soon)

- - -

## API

```js
import BufferedClone from 'buffered-clone';

const { encode, decode } = new BufferedClone({
  // it's feature detected at runtime, don't change it
  // unless you know what you are doing.
  littleEndian: true,
  // by default makes references and strings encoded once
  circular: true,
  // if a view has already reserved buffer size,
  // this can be used to offset the encoding
  byteOffset: 0,
  // either the initial buffer length, when not provided,
  // or the amount of RAM to ask per each resize on top
  // of the new required size (incremental grow): the smaller
  // this value is, the least RAM is used but the slowest
  // serialization happens while encoding (due multiple resizes)
  byteLength: 0x1000000,
  // forces usage of Float 32 numbers instead of
  // the JS default which is Float 64
  useFloat32: false,
  // encodes strings directly as UTF16 without
  // needing any UTF16 to UTF8 conversion.
  // it is usually faster than UTF8 encode + view.set(...)
  // and it can deal with SharedArrayBuffer or resizable
  // ArrayBuffer without throwing, ideal for encodeInto case
  useUTF16: false,
  // mirrors common known strings or values
  // across worlds: it must be a precise list
  mirrored: [],
  // it can be a growable SharedArrayBuffer
  // or a resizable ArrayBuffer
  // or just nothing, defaulting to:
  buffer: new ArrayBuffer(0x1000000)
});

// returns a Uint8Array of the serialized data
encode(anyCompatibleValue);


// encodes *into* the currently available buffer
encode(anyCompatibleValue, true);
// encodes *into* a different buffer (discards the previous)
encode(anyCompatibleValue, specificBuffer);

// returns any compatible value that was serialized
decode(ui8a);
```
