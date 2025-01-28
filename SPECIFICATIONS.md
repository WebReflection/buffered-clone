# Specifications

## WIP

Basic specifications for this protocol.

### Basics: encode or decode with optional recursion

> ℹ️ **Note**
> The main goal of this protocol is **simplicity**, as in *simple to implement* and *simple to read and reason about* while either *encoding* or *decoding* data.

Both `encode` and `decode` functionalities are symmetric and always produce a *buffer* that can be linearly encoded or decoded from `0` to its length through a view based on *u8* numbers or through a *Uint8Array* view in *JS*.

The decoding should keep track of its current index while moving forward and it would never overflow the buffer boundaries.

The *recursion* *type* is basically just a pointer to the buffer/view *index* where that data can be found again, simplifying multiple encoding or decoding of simple to complex data.

*Recursion* ability is desirable with deeply nested data but not really practical around the following scenarios:

  * database returned rows, where each same *key* could be recursive to avoid encoding/decoding these every time but there's little saving in both performance and computation time, as rows keys are usually not so big in size
  * streaming, because if a stream is huge, having recursion around any `index` at the end of it would mean that the *decoder* has to track all previously decoded data and that's not really memory friendly

It's up to implementations to fine-tune recursion (strings, only objects or array, numbers too) but from the *decoding* point of view, if *recursion* is enabled having it or not doesn't really change the algorithm or penalize performance.

- - -

### Numbers

| name      | value | JS type |
|:--------- | :---- | :------ |
| i8        | `129` | number  |
| i16       | `137` | number  |
| i32       | `145` | number  |
|                             |
| u8        | `133` | number  |
| u16       | `141` | number  |
| u32       | `149` | number  |
|                             |
| f32       | `153` | number  |
| f64       | `157` | number  |
|                             |
| i64       | `161` | bigint  |
| u64       | `165` | bigint  |

#### Numbers Encoding

In *JS* numbers' type are a convention as it understands only `bigint` and *Float64* `number` precision.

However, both types would use *8 bytes* to represent even small data and it's neither compact nor convenient so that, while it's possible to always use *F64* as type for *JS* numbers and *I64* for bigints without breaking *decoding*, it's recommended to keep the buffer smaller, understanding the right type and letting *decode* cast to `i32` or others while processing.

```js

number_type     = i8 | i16 | i32 | i64 | u8 | u16 | u32 | u64 | f32 | f64
// size in bytes:  1 |   2 |   4 |   8 |  1 |   2 |   4 |   8 |   4 |   8

[
  number_type,
  ...bytes_as_u8_codes_equivalent
]
```

The *bytes* content is defined in [this MDN page](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#value_encoding_and_normalization) and reflects *ECMAScript* standard representation for numbers as buffers:

  * **unsigned** numbers store their content directly in binary
  * **signed** numbers store their content via [two's complement](https://en.wikipedia.org/wiki/Two's_complement)
  * **floating** numbers store their content via [IEEE 754](https://en.wikipedia.org/wiki/IEEE_754) standard

#### Numbers Decoding

Accordingly with the *type* found at the current index, all *bytes* defined by its corresponding *size* will be decoded.

For *8* bit numbers the overall cursor will move `2` times forward (type + 1 byte), for *16* bits `3` times forward (type + 2 bytes), for *32* bits `5` times forward (type + 4 bytes) and `9` times for *64* (type + 8 bytes).

```js
// example purpose: this only decodes a u8 number
function decode(source, cursor = { i: 0 }) {
  type = source[cursor.i++]
  // u8 type
  if (type == 133) {
    value = source[cursor.i++]
    return value
  }
}

// decoding number 1 as example
decode([ 133, 1 ])
```

- - -

### JSON like values

| name      | value | char  |
|:--------- | :---- | :---- |
| ARRAY     | `65`  | A     |
| FALSE     | `98`  | b     |
| TRUE      | `99`  | c     |
| NULL      | `0`   |       |
| STRING    | `115` | s     |
| OBJECT    | `79`  | O     |
| DATE      | `68`  | D     |

#### Array Encoding

Arrays are encoded via their *type*, their length as *number* and their *values* right after.

```js
// [] empty array
[
  65,
  133, 0
]

// [1, 2] array
[
  65,
  133, 2, // length as number 2
  133, 1, // value as number 1
  133, 2  // value as number 2
]
```

#### Array Decoding

Once retrieved the *length*, perform a *decoding* per each value moving the cursor linearly forward.

```js
// example purpose: this only decodes an array
// with a u8 length and only u8 values in it
function decode(source, cursor = { i: 0 }) {
  type = source[cursor.i++]
  if (type == 65) {
    value = []
    length = decode(source, cursor)
    for (let i = 0; i < length; i++)
      value.push(decode(source, cursor))
    return value
  }
  // u8 type as length
  if (type == 133) {
    value = source[cursor.i++]
    return value
  }
}

decode([ 65, 133, 2, 133, 1, 133, 2 ])
// [ 1, 2 ]
```

- - -

#### Boolean Encoding

Each *boolean* is a single byte, representing it's `false` or `true` value where `false` is `98` and `true` is `99`.

#### Boolean Decoding

When `98` or `99` are found as *type*, the former will return `true` and the latter will return `false`.

```js
// example purpose: this only decodes booleans
function decode(source, cursor = { i: 0 }) {
  // still move the cursor forward
  type = source[cursor.i++]
  if (type == 98)
    return false
  if (type == 99)
    return true
}

decode([ 98 ])  // false
decode([ 99 ])  // true

decode([ 65, 133, 2, 98, 99 ])
// [ false, true ]
```

- - -

#### Null Encoding

The *type* `null` (or `None`) is just `0`.

#### Null Decoding

When `0` is found as *type* that's `null` (or `None`).

```js
// example purpose: this only decodes null
function decode(source, cursor = { i: 0 }) {
  // still move the cursor forward
  type = source[cursor.i++]
  if (type == 0)
    return null
}

decode([ 0 ]) // null
```

- - -

#### String Encoding

Strings must be represented via *UTF-8* encoding. Strings are represented just like *arrays* except for their *type*.


```js
// "" empty string
[
  115,
  0
]

// "ab" string
[
  115,
  133, 2, // length as number 2
  97,     // utf-8 code for "a"
  98      // utf-8 code for "b"
]
```

#### String Decoding

Strings are decoded by passing *utf-8* codes and moving the *cursor* forward.

```js
// example purpose: this only decodes a string + u8 length
function decode(source, cursor = { i: 0 }) {
  type = source[cursor.i++]
  // string decoding
  if (type == 115) {
    length = decode(source, cursor)
    // current cursor position
    i = cursor.i
    // plus string length (moved forward)
    cursor.i += length
    // to slice utf8 codes from the source
    codes = source.slice(i, cursor.i)
    return utf8_decode(codes)
  }
  // length as u8 decoding
  if (type == 133) {
    // return the length as it is
    return source[cursor.i++]
  }
}

decode([ 115, 133, 2,  97, 98 ]) // "ab"
```

- - -

#### Object Encoding

Objects are encoded like arrays with a size that represent all *key* *value* pairs.

```js
// {} empty object literal
[
  79,
  133, 0
]

// {"a": 1} object literal
[
  79,
  133, 2,           // number of pairs as number 2
  115, 133, 1, 97,  // key as string "a"
  133, 1            // value as number 1
]
```

#### Object Decoding

Objects are decoded like arrays where each `i` and `i + 1` up to their `size` represent a *key* and a `*value* pair.

```js
// example purpose: this only decodes an object
// with a u8 key/value pairs length and a string as key
function decode(source, cursor = { i: 0 }) {
  type = source[cursor.i++]
  if (type == 79) {
    object = {}
    length = decode(source, cursor)
    for (let i = 0; i < length; i += 2) {
      key = decode(source, cursor)
      value decode(source, cursor)
      object[key] = value
    }
    return object
  }
  // u8 type as length or value
  if (type == 133) {
    value = source[cursor.i++]
    return value
  }
  // string decoding
  if (type == 115) {
    length = decode(source, cursor)
    i = cursor.i
    cursor.i += length
    codes = source.slice(i, cursor.i)
    return utf8_decode(codes)
  }
}

decode([ 79, 133, 2, 115, 133, 1, 97, 133, 1 ])
```

- - -

#### Date Encoding

Dates are encoded just like strings except for their *type*. A *date* as string should represent its [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) standard UTC variant: `YYYY-MM-DDTHH:MM:SSZ`


```js
[
  68,
  133, 24,            // length of the ISO string
  ...ISO_utf_8_codes  // list of utf-8 codes
]
```

#### Date Decoding

Dates are decoded like strings and it's up to the implementation to create an appropriate *date* reference after.

In *JS* that's just a `new Date(decodedISOString)` operation.

```js
// example purpose: this only decodes a date
function decode(source, cursor = { i: 0 }) {
  type = source[cursor.i++]
  // date decoding
  if (type == 68) {
    length = decode(source, cursor)
    i = cursor.i
    cursor.i += length
    codes = source.slice(i, cursor.i)
    iso = utf8_decode(codes)
    return new Date(iso)
  }
}
```

- - -

### Basic JS types

Both *recursion* and *buffer* as essential types to define *typed list of numbers* or provide *recursion*.

| name      | value | char  |
|:--------- | :---- | :---- |
| RECURSIVE | `114` | r     |
| BUFFER    | `66`  | B     |

- - -

#### Recursive Encoding

Whenever enabled or desired as feature, *recursion* requires tracking of, at least, non primitive values such as *arrays* or *object* (dictionaries).

> ℹ️ **Note**
> All unique types work as a standalone entity, hence any of these could be recursive. Strings as *key* can be used as *values* too and the same goes for *numbers* and everything else. It does not matter where these have been seen for the very first time, it matters that pointing at that very specific index will produce again the exact same identical value and that's where the simplicity of this protocol shine.

A *recursive* type is nothing more than its *type* plus a number that points at the current "*buffer index*" while *encoding*.

```js
// example purpose: encodes an object with recursion.
// encode_unsigned and encode_string just produce what
// encode would produce for those type as seen before.
function encode(value, result = [], known = new Map) {
  if (typeof value == "object") {
    // if already visited, return its recursive type
    if (known.has(value)) {
      result.push(...known.get(value))
    }
    else {
      // create a recursive type for next time this
      // same reference is found: must do before resolving pairs!
      const index = encode_unsigned(result.length)
      known.set(value, [ 114, ...index ])

      // keep parsing the object key/value pairs
      for (const [ key, value ] of Object.entries(value)) {
        // arbitrary ignore recursion on keys/strings
        encode(key, result)
        // never ignore values though ...
        encode(value, result, known)
      }
    }
  }
  // both keys and values
  else if (typeof value == "string") {
    result.push(...encode_string(value))
  }
  // the example case for number 1
  else if (typeof value == "number") {
    result.push(...encode_unsigned(result.length))
  }
}

object = {}
object["object"] = object

result = []
encode(object, result)

// result
[
  79,
  133, 2, // 2 pairs
  115, 133, 6, 111, 98, 106, 101, 99, 116,  // "object" key
  114, 133, 0 // recursive value that points at index 0
]
```

#### Recursive Decoding

The opposite dance is required to return already parsed references **before** their values get parsed too.

```js
// example purpose: decode_unsigned and decode_string
// just return their decoded type while moving the cursor forward
function decode(source, cursor = { i: 0 }, known = new Map) {
  current = cursor.i
  // get the type and move forward
  type = source[cursor.i++]
  if (type == 133) {
    return known.get(decode_unsigned(source, cursor))
  }
  if (type == 79) {
    object = {}
    // store the `object` at current cursor position
    known.set(current, object)
    // arbitrary ignore recursion on lengths/numbers
    length = decode(source, cursor)
    for (let i = 0; i < length; i += 2) {
      // arbitrary ignore recursion on keys
      key = decode(source, cursor)
      // never ignore values though ...
      value = decode(source, cursor, known)
      object[key] = value
    }
    return object
  }
  if (type == 115) {
      // arbitrary ignore recursion on strings
    return decode_string(source, cursor)
  }
}

decode([
  79,
  133, 2,
  115, 133, 6, 111, 98, 106, 101, 99, 116,
  114, 133, 0
])

// <ref *1> { object: [Circular *1] }
```

- - -

#### Buffer Encoding

A *buffer* has its *type*, its *length* / *size*, and its *codes* out of *u8* values (*Uint8Array view in JS*).

In short *buffers* are just like strings, except for their *type* which is `66`.

#### Buffer Decoding

Like it is for *encoding*, buffers are decoded just like strings and their return value would be, in *JS*, a fixed *ArrayBuffer* usable via any available *typed view*.

- - -

### List of numbers / Typed views

| name      | value | constructor  |
|:--------- | :---- | :----------- |
| i8[]      | `128` | Int8Array    |
| i16[]     | `136` | Int16Array   |
| i32[]     | `144` | Int32Array   |
|                                  |
| u8[]      | `132` | Uint8Array   |
| u16[]     | `140` | Uint16Array  |
| u32[]     | `148` | Uint32Array  |
|                                  |
| f32[]     | `152` | Float32Array |
| f64[]     | `156` | Float64Array |
|                                  |
| i64[]     | `160` | BigIntArray  |
| u64[]     | `164` | BigUintArray |

#### Typed views Encoding

Typed list of numbers are represented through their *type* and *buffer*, where both could be recursive (multiple views can share the same buffer).

```js
buffer = new ArrayBuffer(1)
u8 = new Uint8Array(buffer)
i8 = new Int8Array(buffer)

encode([u8, i8])

[
  65,
  133, 2,
  132,              // u8[] type
    66, 133, 1, 0,  // buffer type as [0] (@ 4)
  128,              // i8[] type
    114, 133, 4     // recursive buffer @ index 4
]
```

#### Typed views Decoding

Each *type* represents the kind of *view* to use and its *buffer* data would be found instantly after.

Multiple views can share the same *buffer* when *recursion* is enabled.

- - -

### Optional JS types

These types are not strictly necessary in other *PLs* but are nice to have in the *JS* space.

| name      | value | char  |
|:--------- | :---- | :---- |
| ERROR     | `101` | e     |
| MAP       | `77`  | M     |
| REGEXP    | `82`  | R     |
| SET       | `83`  | S     |
| DATAVIEW  | `118` | v     |

Hopefully all ways to encode and decode data is clear by now and there's nothing really special about these values:

  * an **Error** is encoded like `{"name": error.name, "message": error.message}` except its *type* is `101`. When *decoding*, if the *name* is not a globally available *Error* constructor, a `new Error(message)` is used instead as fallback
  * a **Map** is encoded like `{entry_key0: entry_value0, entry_keyX: entry_valueX}` except its *type* is `77`
  * a **RegExp** is encoded like `{"source": re.source, "flags": re.flags}` except its *type* is `82`
  * a **Set** is encoded like `[value0, valueX]` except its type is `83`
  * a **DataView** is encoded like any other *typed list* except its *type* is `118`

- - -
