# Specifications

This document goal is to explain how *encoding* and *decoding* works and each explained implementation is rather *meta* to simply there to make sense out of the current algorithm.

There are two parts of the algorithm that are worth implementing and/or exploring: the **json** one and the **structured** one.

Each *encoding* and *decoding* part will likely use the same **utilities** to satisfy the algorithm.

## Encoding

This section is to describe how things result into a buffer, starting from the shared *utilities* used across this specification.

### Utilities

#### ...
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Not a *typo* or a mistake in this specs, the `...` spread operator simply means that all *int8* values contained in that *array* would be added, one after the other, to the resulting *array* of *uint8* values.

```js
a = [1, 2]
b = [3, 4]
c = [...a, ...b]
// c is now: [1, 2, 3, 4]
```

  </div>
</details>

#### length
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

The `length` is a dynamic *utf8* based representation of a length. The *dynamic* part is in the fact that such *length* can take 1 up to (currently 5) *N* bytes to be represented.

The `target` in *length* is any target that provides its own `length` (or `len(target)`) and it's implicit, per specs, to ignore the target and consider only its returned *length* so that:

```js
length(0)             // [0]                // 1 byte
length((1 << 8) - 1)  // [1, 255]           // 2 bytes
length(1 << 8)        // [2, 0, 1]          // 3 bytes
length(1 << 16)       // [3, 0, 0, 1]       // 4 bytes
length(1 << 24)       // [4, 0, 0, 0, 1]    // 5 bytes

// one day ...
length(1 << 32)       // [5, 0, 0, 0, 0, 1] // 6 bytes
length(1 << X)        // [5, ...uint8]      // X bytes
```

If the `target` is an *array*, its `array.length` (or `len(target)`in *Python*) will be the value demoed in previous code and that is valid for any other other `target` that is accepted by this utility, in its *meta* representation.

```js
// practically speaking
length([])      // result into [0]
length([1])     // result into [1,1]
length([1,2,3]) // result into [1,3]
// ... and so on ...
```

The reason the `length` has been shaped this way is:

  * use the minimum amount of bytes (with boundaries) to represent a length, as opposite of using a minimum of 4 bytes to represent any (limited) integer up to `2^32 - 1`
  * scale for any possible future where the *length* of the final *list* could be up to *64bit*, *128bit* or more

If you have better suggestions to represent a *length* within boundaries so that decoding can still be just linear, non-future-hostile and never ambiguous, please file an issue to discuss your idea: thank you!

  </div>
</details>

#### encode
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

When a serializable value is *encoded* it means that it returned an array of *uint8* compatible values.

Each serializable value in this space has its own array representation as standalone, working, buffered view of its value.

```js
encode(false)       // [98]
encode(true)        // [99]
encode(null)        // [0]
encode(1)           // [110, 1, 1, 49]
encode('a')         // [115, 1, 1, 97]
encode(['a', null]) // [65, 1, 2, 115, 1, 1, 97, 0]
```

Accordingly, whenever `...encode(target)` is referenced in this space, it means *spreading* those *uint8* values across the resulting array of *uint8* values.

  </div>
</details>

#### kv
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Any `kv(target)` should return a **flat** list of *key* / *value* pairs, where each *key* and *value* would be encoded following the proposed algorithm.

```js
const target = {"a", 1, "b": 2}

kv(target)

[
  // ["a", 1] pair
  ...encode('a'),
  ...encode(1),
  // ["b", 2] pair
  ...encode('b'),
  ...encode(2)
]
```

An empty object or dictionary will have a *length* equal to zero so that just `[0]` would be its `kv` representation.

The reason `kv` is not just an encoded *array* of *pairs* is that both *array* and *pairs* (as array) would take a consistent chunk of memory out of the resulting buffer to declare their *type* and *length* in the making: *YAGNI*.

If you have better suggestions to represent a *kv* within boundaries so that decoding can still be just linear, non-future-hostile and never ambiguous, please file an issue to discuss your idea: thank you!

  </div>
</details>

#### list
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Any `list(target)` mentioned in this specs refers to an *array* of each *value* without the *array* initial overhead (that being its *type* and *length*).

This utility is meant to help *array* creations without repeating, or re-calculating, its *type* or *length*:

```js
// `encode(target)` includes array type & length
encode([1]) // [65, 1, 1, 110, 1, 1, 49]
list([1])   //           [110, 1, 1, 49]
            //            ^^^^^^^^^^^^^
```

In short, this utility helps creating a **flat** list of *values* out of an *array* that knows its *length* already.

  </div>
</details>

#### utf8
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Any `utf8(target)` in this space means that such *target* has been *utf-8* encoded as a string and its returning *uint8* chars are returned as an *array* of *utf-8* chars, omitting *type* or *length* within its values, example:

```js
/* utf8 returns just uint8 chars */
// `utf8(target)` as string buffer (no type or length)
utf8('a')     //            [97]
// `utf8(target)` as string buffer (no type or length)
utf8('🥳')    //            [240, 159, 165, 179]

/* while encode returns type, length, and chars */
// encoded as `string` type with `length` 1
encode('a')   // [115, 1, 1, 97]
              //             ^^
// encoded as `string` type with `length` 4
encode('🥳')  // [115, 1, 4, 240, 159, 165, 179]
              //             ^^^^^^^^^^^^^^^^^^
```

  </div>
</details>

#### ascii - optional
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

> [!NOTE]
> This utility is **optional**, accordingly with your PL that might, or might not, benefit from it. In the case it does not benefit from it, consider `ascii` as just an **alias** for `utf8`.

Whenever a *value* is known to contain just chars with a code lower than `128` or even `256` as a *stretch*, the *utf-8* conversion might be expensive for no gain, as it's clear we are within the [ASCII](https://en.wikipedia.org/wiki/ASCII) boundaries, which is all safe in a *uint8* constrained space.

The list of *values* that fulfill this requirement are:

  * **number**, because these are represented as *JSON* compatible values `-?[0-9]+(\\.[0-9]+)?`
  * **bigint**, because these are just a `[0-9]+` range or integers
  * **date** values, because these won't escape the `^[0-9TZ:.-]+$` boundaries once converted to [ISO](https://en.wikipedia.org/wiki/ISO_8601) strings
  * **regexp flags** as these are `gim` or similar
  * **error or typed names** as these are usually in *plain English*

Accordingly, this *utility* is here only to hint that implementations might be more relaxed around the *encoding* or *decoding* effort, hopefully aiming at better performance as result.

As it is for `utf8` utility, this one also produces results as *codes* out of the box, without carrying any *type* or *length*:

```js
// `ascii(target)` as string buffer (no type or length)
ascii('a')  // [97]
// `ascii(target)` as string buffer (no type or length)
ascii(1)    // [49] // as '1'.charCodeAt(0) / ord(str(1))
```

This implementation can be based on [String.prototype.charCodeAt(index)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt) which covers all *ASCII* meant use cases.

```js
// implementation example
const ascii = str => {
  let codes = [];
  for (let i = 0; i < str.length; i++)
    codes.push(str.charCodeAt(i))
  return codes;
};
```

> [!NOTE]
> Beside *date* types, all *number* or *bigint* types get converted as string because *JSON* standard has no limitations around the representation of a *number*, so that big integers among big floating numbers are all valid, so that doing it this way will cover not just *JS* capabilities around its primitive `number` kind, but potentially all other *PLs* that don't suffer same *JS* limitations around these.

> [!NOTE]
> Latest *JSON* *API* offers a [rawJSON](https://github.com/ungap/raw-json#readme) feature to handle eventually values encoded in a way from another *PL* but not fully understood by *JS* *JSON* *API*. I am planning to bring such *API* in here too but it's not there yet, so that if you are using already this to communicate cross *PLs* keep in mind whenever they mean huge integers they should convert these as `bigint` for the time being because no automatic (hence ambiguous) conversion would be done in here.

If you have better suggestions to represent any *date*, *number* or *bigint* so that decoding can still be just linear, non-future-hostile and never ambiguous, please file an issue to discuss your idea: thank you!
  </div>
</details>

### JSON Types

Coming from the official [JSON specifications])(https://www.json.org/json-en.html), all types in there are supported.

#### object
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Objects are represented as such:

```js
[79, ...length(kv(object)), ...kv(object)]
```

Where `79` is the ASCII code associated to the char `O`.

  </div>
</details>

#### array
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Arrays (as either *lists* or *tuples* in *Python*) are represented as such:

```js
[65, ...length(array), ...list(array)]
```

Where `65` is the ASCII code associated to the char `A`.

  </div>
</details>

#### string
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Strings are represented as such:

```js
[115, ...length(utf8(string)), ...utf8(string)]
```

Where `115` is the ASCII code associated to the char `s`.

  </div>
</details>

#### number
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Numbers are represented as such:

```js
[110, ...length(ascii(number)), ...ascii(number)]
```

Where `110` is the ASCII code associated to the char `n`.

  </div>
</details>

#### boolean
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Booleans are represented as such:

```js
// False
[98]

// True
[99]
```

Where `98` is the ASCII code associated to the char `b` and `99` is just `98 + 1` for *true*.

  </div>
</details>

#### null
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Null values are represented as such:

```js
[0]
```

There is no letter associated to it: it's just `null` !

  </div>
</details>

### Structured Types

This specification goes beyond *JSON* types limitation, allowing both *recursion* and other types supported by the [structuredClone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#javascript_types) *JS*' types.


#### recursive
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

*JSON* does not allow recursive operations, and if any implementation warns you before reaching a "*max recursion*" message, it's also likely unnecessarily bloated in doing so ... example:

```js
const a = []
a.push(a)
JSON.stringify(a)

// Uncaught TypeError: Converting circular structure to JSON
//   --> starting at object with constructor 'Array'
//   --- index 0 closes the circle
//   at JSON.stringify (<anonymous>)
//   at <anonymous>:3:6
```

Now, don't get me wrong, I think that's a lovely error message and everything, but if circular recursion can be tracked behind the *JSON* algorithm, why shouldn't we take advantages around it instead?

As a fresh new concept, this specification allows (currently) three kinds of resolution which needs to be symmetric with the *decoding* expectations in case decoding used `"none"` to avoid bloating *RAM* in the process:

  * `recursion: "all"` where both complex types and primitives, with the exception for `boolean`, `null`, or empty `string` types, are tracked. This flag means that the resulting buffer will be very well compressed in size, as no *key* or *value* repetition could ever happen. This also bloats the *RAM* while *encoding*, because all strings, or numbers, are tracked all over the buffer, but as those strings or numbers references already exist in your runtime memory, maybe this works just fine!
  * `recursion: "some"` where all non *primitives* values, being that `bigint`, `boolean`, `number`, `null` or `string` type, won't be tracked by recursion. This intermediate recursion tracking might be good when it's not clear if data might have recursion in it, without tracking most common data represented by strings or number. However, both strings and numbers might take some time to be computed, and if repetition of those strings and number are expected to be frequent, this might *not* be the ideal solution.
  * `recursion: "none"` where no recursion is expected, ideal for *RAM* saving in both *encoding* and *decoding* strategies around the *encoding*:
    * no *track* of values while encoding
    * ideal for any *SQLite* or other *DBs* based results, where recursion is not a citizen at all across rows, although all repeated *keys* per each row will likely need *decoding* each time, so that a `"keys"` option might be added in the future, to only avoid repeated *strings*
    * ideal for *WASM* to *JS* exchanges, when *recursion* is not expected to be a thing, with the same caveat mentioned on the previous point around repeated *keys*

In short, when recursion is not needed both *encode* and *decode* operations should be aware of it, but when `some` or `all` is demanded, this specifications solve that in such way:

```js
const a = []
a.push(a)

encode(a) // [ 65, 1, 1, 114, 0 ]
```

That encoding specifies the *array* type, it's *length*, which is `1`, and its recursion type which is `114` plus the length of the returning index of the *uint8* *array* of values, where `a` was its first entry, hence `0`.

This logic works for any recursive type but:

  * both encoding and decoding should be aware *recursion* is in, by passing `recursion` value (`"all"`, `"some"` or `"none"` to both *encoding* and *decoding* operations: symmetric!)
  * if data is encoded recursively, decoding it needs to be aware of that, and if decoding does not accept the same level of recursion, everything will **fail** out of a thrown error

This is the reason *recursion* is a specification *opt-in*:

  * when enabled, the current default, the implementation must track every value that is being encoded, so that its index in the final array of bytes can find the value it refers to
  * when enabled, the current default, the decoding part must be aware some recursion might happen, and track at each index stage, the current value that is being decoded

For simplification and *RAM* sake, if no *recursion* is expected, `recursion: "none"` is all it's needed to satisfy these specifications, but when it's expected, both the *encoder* and the *decoder* must use extra steps while en/decoding:

  * any value that is not `boolean`, `null`, or an empty `string`, must be tracked as recursive if `"all"` is the resolution
  * any value that is not *primitive*, must be tracked as recursive if `"some"` is the resolution
  * no recursive value should be allowed if `"none"` is the resolution!

If this constraints are clear, recursive values are simply a `[114, ...length(currentUint8Array)]` type that can be passed along when any currently stored value has been already stored before.

  </div>
</details>

#### bigint
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

BigInt values are represented as such:

```js
[73, ...length(ascii(bigint)), ...ascii(bigint)]
```

Like it is for numbers, *bigint* is just a string of their value represented as *ASCII* chars.

  </div>
</details>

#### ArrayBuffer
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

ArrayBuffer references are represented through their *Uint8Array(buffer)* representation as such:

```js
[66, ...length(Uint8Array(buffer)), ...Uint8Array(buffer)]
```

Let's take a closer look:

```js
const buffer = new ArrayBuffer(2)
const view = new Uint8Array(buffer)
view[0] = 7
view[1] = 8
// buffer is [1, 2]

encode(buffer)  // [  66,  1, 3,      7, 8  ]
                //       ^length^   ^values^
```

In short, because the resulting buffer must be *uint8* compatible, *ArrayBuffer* representation is just the same as the typed *Uint8Array* view excepts its type is `66`.

  </div>
</details>

#### Date
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Date references are represented through their [ISO string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString) counterpart as such:

```js
[68, ...length(ascii(date.toISOString())), ...ascii(date.toISOString())]
```

> [!NOTE]
> Any *date* *ISO* representation is not considered as an explicit *string* representation, meaning that `iso = date.toISOString()` and `date` itself will be encoded as two completely different wrappers of that *ISO* string representation. Both `iso` and `date` could be eventually *recursive*, but this specifications does *not* disambiguate between `date` references and explicit `string` content, hopefully keeping implementations sane.

  </div>
</details>

#### Error
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Not truly common in data, yet worth providing, the Error references should have a `name` and a `message`, where the `name` is the *kind* of error that is being *encoded* (such as `"TypeError"`, or `"SyntaxError"` or `"RangeError"`) and the `message` should contain the `error.message` or `reason` about such error, because the stack, across *binary boundaries*, is not so interesting:

```js
[101, ...length(utf8(error.name)), ...utf8(error.name), ...length(utf8(error.message)), ...utf8(error.message)]
```

As *errors* are a delicate matter, I am open to make this specifications less strick so that any other *error* field that might be interesting could fit into the specs.

One of the ideas I've had is to make *error* more like a generic object so that a *length* of its *key/value* pairs could be provided and all sort of details could be backed in.

However, cross *PL* errors are hard to reason about or deal with, which is why I believe in the `message` there should be already all details around the currently encoded error, so that the receiver can simply understand what happened, as opposite of needing to open *devtools* or whatnot to dig an error that came from elsewhere.

> [!NOTE]
> There is no strict convention around the `name` and `message` fields, it's just in there as example but the encoding must provide some *kind* of error as `name`, as string, and some *kind* of extra information as `message`, still as string. Those fields are just convenient and known in the *JS* world, but as long as those two things can be provided, and it allows to provide different errors *kind* over other *PLs*, everything should be good!

  </div>
</details>

#### Map
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Map references are represented just like any *object* reference, except for their type:

```js
[77, ...length(kv(map)), ...kv(map)]
```

That's is, any *key* / *value* pair that can be serialized will be in that *kv(...)* list and everything else will jut be the same it is for *object*.

  </div>
</details>

#### RegExp
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

RegExp references are represented in a similar way *Error* references (up here) are represented with, except instead of a `name` and a `message`, there is a `source` and a `flags` field to consider: the `source` is the *RegExp* string representation of itself, while the `flags` is either an empty string, or one or more chars for `g`, for global, `m` for multiline and all other chars allowed by *JS* specifications.

```js
[82, ...length(utf8(re.source)), ...utf8(re.source), ...length(ascii(re.flags)), ...ascii(re.flags)]
```

All other properties make little sense when it comes to *encoding* or *decoding* *RegExp* in the wild so please challenge me to think other fields should be considered by filing an issue: thank you 🙏

  </div>
</details>

#### Set
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Set references are represented just like any *array* reference, except for their type:

```js
[83, ...length(array(set)), ...list(set)]
```

That's is, any *value* that can be serialized will be in that *array(...)* list and everything else will jut be the same it is for *array*.

  </div>
</details>

#### TypedArray
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

TypedArray references are similar to the *Error* *encoding* steps:

  * the `name` is the *kind* (or constructor name) expected to be *decoded* on the other hand, out of the [toStringTag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag) specification when it comes to *JS*, meaning *Int32Array* or *Uint8Array* would be returned as `name`
  * the `value` (or the "*message*" to keep the relation with *Error* close) is their *buffer* representation as *Uint8Array* view of that

```js
[84, ...length(ascii(typed[toStringTag])), ...ascii(typed[toStringTag]), ...length(Uint8Array(typed.buffer)), ...Uint8Array(typed.buffer)]
```

This way any *decode* operation can somehow retrieve the original *TypedArray* *Class* that was meant on the *encoding* side, and fulfill its data through the *buffer* that has been *encoded*.

  </div>
</details>

#### DataView
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

DataView references are handled exactly like any *TypedArray* but with a different `name` (or constructor name).

This means that *DataView* instances require no extra work as they both provide a `toStringTag` representation of their *kind* and a *buffer* to deal with.

  </div>
</details>

#### Hook: toBufferedClone
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Not really a type itself and not necessary to encode or exchange buffers around but at least the *JS* implementation offers the ability to create custom classes or references with a globally available *symbol*:

```js
const toBufferedClone = Symbol.for('buffered-clone')
// any name would do
const toBuffer = Symbol.for('buffered-clone')
const asBuffer = Symbol.for('buffered-clone')
// ... etc ...
```

This allows users to define a callback that will return whatever needs to be buffered once `encode(reference)` happens, just like `toJSON` or `toBSON` functions work, except this is a *symbol* which cannot get buffered and usually has less clashing and conflicts across projects.

```js
class Complex extends EvenMoreComplex {
  constructor() {
    this.complex = true;
    // this.x = y; and so on
  }
  [toBufferedClone]() {
    return { simple: Math.random() };
  }
}

decode(encode(new Complex)) // {"simple":0.123}
```

Please note that, to preserve recursion correctly, such method will be invoked once per reference, and once only, during any *encoding*, even if that reference is present multiple times within the encoded data.

```js
const a = new Complex;
const b = new Complex;

const d = decode(encode([a, b, a]))
// [{"simple":0.42},{"simple":0.78},{"simple":0.42}]
//  └──────┬──────┘                 └──────┬──────┘
//         └──◂ these two are the same ◂───┘

d[0] === d[2]; // true
d[0] === d[1]; // false
```

> ![NOTE]
> Internally both the original *reference* and its returning counterpart are temporarily tracked to guarantee that either pointers will provide the same *recursion* within the buffer.

> [!NOTE]
> If there was already a `toJSON` function in your class but you'd like to use this feature when your class is cloned as *buffer*, all you need to do is to `[toBufferedClone]() { return this.toJSON() }` to provide the same simplified value to *encode*.

  </div>
</details>

## Decoding

This section is to describe how things are retrieved from a buffer, starting from the shared *utilities* used across this specification.

### Utilities

#### length
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

The `length` is a dynamic *utf8* based representation of a length. The *dynamic* part is in the fact that such *length* can take 1 up to (currently 5) *N* bytes to be represented.

It is used to represent the `length` of *strings*, *arrays*, *key/value* *pairs*, *values* and so on.

The length is an array of *uint8* values that carries the amount of next bytes to read at its second *index*, so that those bytes can be summed up as whole length needed to keep going:

```js
// implementation example
const length = uint8 => {
  let result = 0;
  let index = 0;
  // retrieve the size while moving the index
  // forward for the next read
  let size = uint8[index++];
  for (let i = 0; i < size; i++) {
    // sum up the utf8 based bytes shifting
    // while moving the index forward
    result += uint8[index++] << (i * 8)
  }
  return result;
};
```

With above logic it is always possible to obtain the correct length for the next entry to *decode*:

```js
length([0])                 // 0
length([1, 255])            // 255
length([2, 0, 1])           // 256
length([3, 0, 0, 1])        // 1 << 16
length([4, 0, 0, 0, 1])     // 1 << 24

// one day ...
length([5, 0, 0, 0, 0, 1])  // 1 << 32
length([X, ...uint8])       // 1 << X
```

> ![NOTE]
> Every *encoded* buffer has a fixed length and the *decoding* will always move forward from index `0` to the *length* of such buffer. Accordingly, you should remember to keep track of your current *index* while decoding as that can only go forward. In *JS* that is currently a `{i:0}` literal that is incremented while decoding per each step, but in *C*, as example, that needs to be a `&i` that starts from `0` on each *decoding* and can be increased while decoding, keeping track if its current value out of the box.

  </div>
</details>

#### ascii - optional
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

> [!NOTE]
> This utility is **optional**, accordingly with your PL that might, or might not, benefit from it. In the case it does not benefit from it, consider `ascii` as just an **alias** for `utf8`.

When a certain *string* is known to contain only chars in the *ASCII* range, this helper should make retrieval of the string value easier or faster.

Currently, the *JS* implementation is based on [String.fromCharCode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode) which covers all meant use cases.

```js
ascii([97]) // 'a'
ascii([49]) // '1'
```

  </div>
</details>

#### utf8
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

This utility is here to describe how any generic *string* should be decoded and the implementation in *JS* is based on [TextDecoder.prototype.decode(buffer)](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder/decode).

```js
// implementation example
const utf8 = codes => {
  return new TextDecoder().decode(
    new Uint8Array(codes)
  )
};
```

This way any decoding operation would guarantee the original *string* would be returned.

```js
utf8([97])                  // 'a'
utf8([240, 159, 165, 179])  // '🥳'
```

  </div>
</details>

#### type
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

A *type* operation simply moves the *decoding* forward by skipping a single *byte* through the buffer that is being *decoded*.

  </div>
</details>

#### decode
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

When a serialized value is *decoded* it means that it returned any compatible value as result.

> [!NOTE]
> *decoding* assumes that every single operation performed over the *encoded* *UintArray* view and its *ArrayBuffer*, moves its index while processing each instruction.

By contract, *decode* needs to handle any `[type, ...codes]` possible combination, where each combination will be described in the next paragraphs, but here there's a *gist*:

```js
decode([98])                          // false
decode([99])                          // true
decode([0])                           // null
decode([110, 1, 1, 49])               // 1
decode([115, 1, 1, 97])               // 'a'
decode([65, 1, 2, 115, 1, 1, 97, 0])  // ['a', null]
```

  </div>
</details>

### JSON Types

Coming from the official [JSON specifications])(https://www.json.org/json-en.html), all types in there are supported.

#### object
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Accordingly with its *encoding*, an *object* (*dictionary* in *Python*, *hashes* in other *PLs*) has its type, the *length* of its list of *key/value* pairs, and such *key/value* pairs after:

```js
const encoded =  [
  79,             // type
  1,  2,          // length of key/value pairs
  115, 1, 1, 98,  // first key (string)
  99              // first value (boolean)
];

decode(encoded)
// {'b': true}
```

A *meta* implementation of this algorithm can be described as such:

```js
const object = {};

// same encoded array of `uint8` codes
type(encoded)  // 79 => object

let size = length(encoded) // 2
for (let i = 0; i < size; i += 2) {
  const key = decode(encoded)
  const value = decode(encoded)
  object[key] = value;
}
```

  </div>
</details>

#### array
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Accordingly with its *encoding*, an *array* (*list* or *tuple* in *Python*) has its type, the *length* of its list of *values*, and those *values* after:

```js
const encoded =  [
  65,             // type
  1,  2,          // length of values
  99,             // first value (boolean)
  98,             // second value (boolean)
]

decode(encoded)
// [true, false]
```

A *meta* implementation of this algorithm can be described as such:

```js
const array = [];

// same encoded array of `uint8` codes
type(encoded)  // 65 => array

let size = length(encoded) // 2
for (let i = 0; i < size; i++) {
  const value = decode(encoded)
  array.push(value)
}
```

  </div>
</details>

#### string
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Accordingly with its *encoding*, a *string* has its type, the *length* of its list of *utf8* codes, and those *codes* after:

```js
const encoded =  [
  115,                // type
  1,  4,              // length of all codes
  240, 159, 165, 179  // codes
];

decode(encoded)
// '🥳'
```

A *meta* implementation of this algorithm can be described as such:

```js
// same encoded array of `uint8` codes
type(encoded)  // 115 => string

// current decoding position
let index = 0;

// size of the string (as *utf8* codes)
let size = length(encoded) // 4

// list of codes to be transformed as string
let utf8chunks = encoded.slice(index, index + size)

// move the index forward
index += size;

// transform the list of codes
utf8(utf8chunks)
// '🥳'
```

  </div>
</details>

#### number
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Accordingly with its *encoding*, a *number* is the equivalent of a *string* except its *type* is `110`.

It is up to implementation details to decode that as `utf8` or `ascii` and then produce a valid number.

In current *JS* implementation, the latest is done via `parseFloat` which can handle both integers and floating numbers with ease.

  </div>
</details>

#### boolean
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Accordingly with its *encoding*, a *boolean* is a `2` *codes* *array* with both *type*, which is `98`, and the *true* or *false* value as second entry:

```js
decode([99])
// true

decode([98])
// false
```

A *meta* implementation of this algorithm can be described as such:

```js
type(encoded) // 98 => `false` or 99 => `true`
```

Any `boolean` value does not need extra work: if the *type* is either `98` or `99` nothing else needs to be done.

  </div>
</details>

#### null
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Accordingly with its *encoding*, a *null* value is just `[0]`:

```js
decode([0])
// null
```

A *meta* implementation of this algorithm can be described as such:

```js
type(encoded)  // 0 => null
// 0
```

The `null` values does not need extra work: if the *type* is `0`, nothing else needs to be done, it's *null*.

  </div>
</details>

### Structured Types

#### recursive
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

The *recursive* type in decoding has value `114` and it's just a pointer to the *index* of the currently *decoding* buffer so that implementations can decide to parse again that content or simply *cache* that index somehow and return the previously *decoded* value around such index: that's it!

```js
const object = {};
const encoded = encode([object, object])
[
  65,   // outer type: array
  1, 2, // array values length: 2
  79,   // object type at index: 0
  0,    // no key/value pairs for it
  114,  // next array value type: recursive at index 1
  1, 3  // length of the `index` where such value is known
]
```

A *meta* implementation of above example can be described as such:

```js
type(encoded)    // 65 => array

length(encoded)  // 2
let array = [];

// place the object at index 0
array.push(decode(encoded))

// behind the scene this is
// type(encoded)    // object
// length(kvPairs)  // 0

// point the decode at index 3: [79, 0]
// of the original buffer that is being decoded!
// the implementation can decide to decode again
// or decide that index is known, hence
// the reference will be the same
array.push(decode(encoded))
```

The *TL;DR* about recursion is that it's a *type* that points at a specific position of the original buffer that is being decoded, and from there one can decide to parse again the whole *type* or flag that *type* as already parsed, avoiding extra computation whenever that's desired or needed.

> [!NOTE]
> In current *JS* module, if `{ recursion: 'none' }` is passed as *decoding* options, t will throw an error out of the box whenever this *type* is encountered while decoding *but*, if your logic could benefit anyhow from recursion, the buffer will be smaller and faster to *decode* so it's up to you to support it or not.

  </div>
</details>

#### bigint
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

Accordingly with its *encoding*, a *bigint* is the equivalent of a *string* except its *type* is `73`.

It is up to implementation details to decode that as `utf8` or `ascii` and then produce a valid *bigint*.

In current *JS* implementation, the latest is done via [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt/BigInt).

  </div>
</details>

#### ArrayBuffer
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

This section is defined by current *JS* implementation but not strictly blocking other *PLs* to implement the same, so please bear with me while I update this document, thank you!

  </div>
</details>

#### Date
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

This section is defined by current *JS* implementation but not strictly blocking other *PLs* to implement the same, so please bear with me while I update this document, thank you!

  </div>
</details>

#### Error
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

This section is defined by current *JS* implementation but not strictly blocking other *PLs* to implement the same, so please bear with me while I update this document, thank you!

  </div>
</details>

#### Map
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

This section is defined by current *JS* implementation but not strictly blocking other *PLs* to implement the same, so please bear with me while I update this document, thank you!

  </div>
</details>

#### RegExp
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

This section is defined by current *JS* implementation but not strictly blocking other *PLs* to implement the same, so please bear with me while I update this document, thank you!

  </div>
</details>

#### Set
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

This section is defined by current *JS* implementation but not strictly blocking other *PLs* to implement the same, so please bear with me while I update this document, thank you!

  </div>
</details>

#### TypedArray
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

This section is defined by current *JS* implementation but not strictly blocking other *PLs* to implement the same, so please bear with me while I update this document, thank you!

  </div>
</details>

#### DataView
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

This section is defined by current *JS* implementation but not strictly blocking other *PLs* to implement the same, so please bear with me while I update this document, thank you!

  </div>
</details>
