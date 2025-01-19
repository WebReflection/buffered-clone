# buffered-clone

[![Coverage Status](https://coveralls.io/repos/github/WebReflection/buffered-clone/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/buffered-clone?branch=main) 

<sup>**Social Media Photo by [Ries Bosch](https://unsplash.com/@ries_bosch) on [Unsplash](https://unsplash.com/)**</sup>

A [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) like utility that converts all [supported types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types) into a binary format.

```js
import { encode, decode } from 'buffered-clone';

const buffer = new ArrayBuffer(4);

// returns a Uint8Array<ArrayBuffer>
const encoded = encode({
  literally: ['any', 'supported', 'type'],
  recursion: true,
  bigint: 1n,
  map: new Map([['of', 'course']]),
  set: new Set(['sure', 'thing']),
  regexp: /a[s-w]ell/gm,
  date: new Date,
  typedArray: new Int32Array(buffer),
  dataView: new DataView(buffer),
  buffer: buffer,
});

encoded instanceof Uint8Array; // true

// returns a clone of the original encoded buffer
const decoded = decode(encoded);

// easy peasy lemon squeezy
target.postMessage(encoded, [encoded.buffer]);
```

## Summary

  * **[Specifications](#specifications)**
    * [Types](#types)
    * [JSON Types](#json-types)
    * [StructuredClone Types](#structuredclone-types)
    * [About Recursion](#about-recursion)
    * [About Length(value)](#about-lengthvalue)
    * [About ASCIIString(value)](#about-asciistringvalue)
  * **[JSON types to Binary Conversion](#json-types-to-binary-conversion)**
  * **[StructuredClone types to Binary Conversion](#structuredclone-types-to-binary-conversion)**
  * **[API](#api)**
    * [BufferedClone.encode(any[, cache]):Uint8Array](#bufferedcloneencodeany-cacheuint8array)
    * [BufferedClone.decode(Uint8Array<ArrayBuffer>[, cache]):any](#bufferedclonedecodeuint8arrayarraybuffer-cacheany)
  * **[F.A.Q.](#faq)**

- - -

## Specifications

This section describes how values gets converted into their own binary format, as long as their *type* is recognized by this library.

> [!NOTE]
> If other *Programming Languages* would like to follow this specification, there is no need to support all types supported in here. As a matter of fact, *ARRAY*, *BOOLEAN*, *NULL*, *NUMBER*, *OBJECT* and *STRING*, among with the optional *RECURSIVE* logic, would be enough to fully support **JSON** specifications in both serializing and de-serializing data so that, as long as serialized *types* are universally understood across implementations, this project allows any *PL* to communicate with each other with ease and, most importantly, with raw decoding performance in mind.

### Types

Both *JSON* and *StructuredClone* are supported, where former types could potentially work across different environments.

##### JSON types

| name      | value | char  |
|:--------- | :---- | :---- |
| ARRAY     | `65`  | A     |
| BOOLEAN   | `98`  | b     |
| NULL      | `0`   |       |
| NUMBER    | `110` | n     |
| OBJECT    | `79`  | O     |
| STRING    | `115` | s     |

##### StructuredClone types

| name      | value | char  |
|:--------- | :---- | :---- |
| RECURSIVE | `114` | r     |
| BIGINT    | `73`  | I     |
| BUFFER    | `66`  | B     |
| DATE      | `68`  | D     |
| ERROR     | `101` | e     |
| MAP       | `77`  | M     |
| REGEXP    | `82`  | R     |
| SET       | `83`  | S     |
| TYPED     | `84`  | T     |


#### About Recursion

Whenever a computation of some value might be expensive or take, potentially, a huge length, a `RECURSIVE` type is used to point at that value within the buffer, so that both serialization and de-serialization of such *type* will be performed once and never again.

> [!NOTE]
> The only types that **never require recursions** are currently `BOOLEAN`, `NULL` or **empty** `STRING`s.

Everything else is flagged as *parsed* and it will return a `RECURSIVE` detail structured as such:

```js
[114, ...Length(currentBufferIndex)]
```

#### About `Length(value)`

Currently, each complex value can have up to a *Uint32* `length`, roughly *4GB of data*, but because the buffer is based on a *Uint8* view, such length needs to be distributed in an optimized way, so that a *length* is always represented by the amount of bytes to read and retrieve their values, granting 1 to max 5 bytes are needed to represent such length.

```js
Length(0);        // [0]              // 1 byte
Length(255);      // [1, 255]         // 2 bytes
Length(256);      // [2, 0, 1]        // 3 bytes
Length(1 << 16);  // [3, 0, 0, 1]     // 4 bytes
Length(1 << 24);  // [4, 0, 0, 0, 1]  // 5 bytes
```

This way the buffer is usually more compact and it will scale, potentially, to "*infinite*" length in the future without compromising performance and space of common length.

The simplified way such length can be converted, or visualized, is through a shared *buffer* between a `Uint32Array` and a `Uint32Array`.

```js
const { BYTES_PER_ELEMENT } = Uint32Array;  // 4
const buffer = new ArrayBuffer(BYTES_PER_ELEMENT);
const ui32a = new Uint32Array(buffer);
const ui8a = new Uint8Array(buffer);

ui32a[0] = 255;
[...ui8a];                // [255, 0, 0, 0]

ui32a[0] = 256;
[...ui8a];                // [0, 1, 0, 0]
```

To **compute the length** a loop from `BYTES_PER_ELEMENT` to `0` checks if the *uit8a* reference has any value in it. If that's not the case, there is no need to add extra bytes to the resulting buffer.

```js
// ℹ️ length computation *example* based on previous
// ui32a and ui8a references
// @see src/utils/length.js for actual implementation
const Length = length => {
  const result = [length];
  // ignore length zero as there's nothing to do
  if (length > 0) {
    // modify the underlying buffer
    ui32a[0] = length;
    let i = BYTES_PER_ELEMENT;
    // loop right to left
    while (i > 0 && ui8a[i - 1] === 0) i--;
    // set the amount of bytes to read next
    result[0] = i;
    // add the reduced amount of bytes to the array
    result.push(...ui8a.slice(0, i));
  }
  // return [length, ...valueX]
  return result;
};
```

**To retrieve back the length** is even more trivial:

```js
// ℹ️ retrieve the length while crawling the buffer
// @see src/utils/length.js for actual implementation
const fromLength = (ui8View, at) => {
  let value = 0;
  // loop from 0 to the [0-4] length stored at current position
  for (let i = 0, length = ui8[at.i++]; i < length; i++)
    // add the next value padded by 8
    value += ui8[at.i++] << (i * 8);
  return value;
};
```

#### About `ASCIIString(value)`

A *ASCIIString* is a *Uint8Array* that guarantees it has no char/encoding out of the `0-128` **ASCII** space in it, simplifying both encoding and decoding procedures as numbers are passed as *char* content.

Types that fall into this category are:

  * **NUMBER** because `[0-9-].` are all safe chars and this also means there is no implicit precision loss while encoding or decoding numbers. That loss might eventually be implicit at the receiver *PL* side of affairs but by specifications: *all possible numbers are safe* in here!
  * **BIGINT** because `[0-9].` are all safe chars
  * **DATE** because `date.toISOString()` produces an *ASCII* friendly representation of the date, where `[0-9T:.Z-]` are all safe chars

Every other *string* MUST use a proper "*sourceToUTF8*" encoder to allow strings to be serialized, and retrieved, independently form the target environment.

In *JS* case, that is `new TextEncoder().encode(string)` which produces already an *Uint8Array* view of that *string*, and `new TextDecoder().decode(slicedView)` will ensure the string is back as it originally was.

### JSON types to Binary Conversion

  * **ARRAY** has its `type`, `length` and *values* as such: `[65, ...Length(array), ...encodedValues]`. All values encoded must be a known *type* and, whenever that's not the case, a `NULL` type is stored instead, like it is for `JSON.stringify([1, Incompatible(), 2])` which results into `[1, null, 2]`
  * **BOOLEAN** has its `type` and either `1` or `0` as value: `[98, 1]` for *true* and `[98, 0]` for *false
  * **NULL** has only its `type`: `[0]`
  * **NUMBER** has its `type` and its stringified content as value: `[110, ...Length(ASCIIString(value)), ...ASCIIString(value)]`, preserving potentially huge numbers integrity
  * **OBJECT** has its `type`, *key* / *value* pairs length, and each *key* / *value* encoded after: `[79, ...Length(kvParis), ...kvParis]`
  * **STRING** has its `type`, `length` and *utf-8 chars* encoded as *values*: `[115, ...Length(utf8Chars), ...utf8Chars]`

### StructuredClone types to Binary Conversion

  * **RECURSIVE** has its `type` and `length` and it could be used with *JSON* types too: `[114, ...Length(bufferIndexPosition)]`
  * **BIGINT** has its `type` and value stored as *ASCIIString*: `[73, ....Length(ASCIIString(value)), ...ASCIIString(value)]`
  * **BUFFER** has its `type`, `length` and all its values after: `[66, ...Length(buffer.length), ...buffer]`
  * **DATE** has its `type` and value stored as *ASCIIString*: `[68, ....Length(ASCIIString(date.toISOString())), ...ASCIIString(date.toISOString())]`
  * **ERROR** has its `type`, its `name` and its `message`: `[101, ...encode(error.name), ...encode(error.message)]`
  * **MAP** has its `type`, *key* / *value* entries length, and each *entry* encoded after: `[77, ...Length(kvEntries), ...kvEntries]`. Please note that entries are not grouped as `[k, v]` arrays, just as `k` and then `v`. In *JS*, that would look like `[77, 1, 4, ...encode('a'), ...encode(1), ...encode('b'), ...encode(2)]` for a *Map* like `new Map([['a', 1], ['b', 2]])`. This way the array space needed to group keys and values is fully absent from the resulting buffer.
  * **REGEXP** has its `type` and both its `source` and `flags` stored: `[82, ...encode(re.source), ...encode(re.flags)]`
  * **SET** , similarly to a *Map*, has its `type`, its values length and each *value* encoded right after: `[83, ...Length(values), ...values]`.
  * **TYPED** has its `type`, its typed *Class name* and its buffer stored as it is: `[84, ...encode(ref[Symbol.toStringTag]), ...ref.buffer]`. Please note that **DataView** references are handled exactly the same way!

- - -

## API

Both `encode` and `decode` abilities are modules a part, grouped only by the *main* entry point but `buffered-clone/encode` and `buffered-clone/decode` wll provide the minimal amount of code needed to make this module work.

### BufferedClone.`encode(any):Uint8Array`

This utility is able to encode any *StructuredClone* compatible data so that `function`, `symbol`, or `undefined`, will be simply ignored while `NaN` or non *finite* numbers will be converted as `null` just like *JSON* does.

Differently from `structuredClone`, this module does not *throw* if data can't be serialized, more aligned with the feature, ease, and success `JSON` had to date across platforms.

```js
import encode from 'buffered-clone/encode';

encode(anything); // Uint8Array<ArrayBuffer>
```

### BufferedClone.`decode(Uint8Array<ArrayBuffer>):any`

This utility is able to decode anything that was previously encoded via this library.

It will return a fresh new value out of the underlying buffer:

```js
import decode from 'buffered-clone/decode';

decode(encodedStuff); // any
```

- - -

## F.A.Q.

  * **why not [BSON](https://en.wikipedia.org/wiki/BSON)?** - because "*BSON originated in 2009*" so it's old. I don't mean to state it's broken, outdated, not fast or anything, I just wanted a fresh start with *Web* constraints and features in mind and that is *StructuredClone*, because *BSON*, as example, is incapable of recursion while here I have **recursion as first citizen**. On the other hand, buffers in here are usually much smaller than buffers in *BSON* and mostly because of the recursion algorithm, but also because of the way all stuff is serialized, with `Length` being a major player in that space 😎
  * **wasn't [@ungap/structured-clone](https://github.com/ungap/structured-clone#readme) there yet?** - sort of ... the way I've shaped that project is a JS way only and based on *JSON* premises ... after [discussing a lot](https://github.com/DallasHoff/sqlocal/issues/39#issuecomment-2594628800) with other people involved in *serialization* though, it turned out the bottleneck to communicate across threads is the `postMessage` dance itself. Here I wanted to explore the ability to transfer buffers as they are, as opposite of using a smart library to drop recursion, to then `postMessage` it and then reveal such recursion on the other side (double recursion algorithm involved due `postMessage` *MITM* presence). Accordingly, this module goal is to explore, and hopefully solve, all performance related issues to cross threads communication, in a way that scales to any programming language, or wireless protocols, as long as all specs are clear 😇
  * **wasn't [flatted](https://github.com/WebReflection/flatted#readme) the way?** - again, both *flatted* and my *structuredClone* polyfill are there to solve a *JS* only use case. Here there is an opportunity to solve cross *PL* communication through a buffer, including *WASM*, so that every other previous attempt of mine to fix *JSON* constraints can be consider futile when it comes to other *PL*s or envs. True that *flatted* offers both a *Python* and *PHP* module to recreate in those *PL*s the original data, but in here there is no such limitation in terms of target *PL*s so that even `C` or `C++` or `Rust` could provide their own `bufferedClone.decode(view)` ability 🥳
