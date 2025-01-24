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
encode(true)        // [98, 1]
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

kv(target);

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

#### ascii
<details open>
  <summary><small>details</small></summary>
  <div markdown=1>

> [!NOTE]
> This utility is optional, accordingly with your PL that might, or might not, benefit from it. In the case it does not benefit from it, consider `ascii` as just an **alias** for `utf8`.

Whenever a *value* is known to contain just chars with a code lower than `128` or even `256` as a *stretch*, the *utf-8* conversion might be expensive for no gain, as it's clear we are within the [ASCII](https://en.wikipedia.org/wiki/ASCII) boundaries, which is all safe in a *uint8* constrained space.

The list of *values* that fulfill this requirement are:

  * **number**, because these are represented as *JSON* compatible values `-?[0-9]+(\\.[0-9]+)?`
  * **bigint**, because these are just a `[0-9]+` range or integers
  * **date** values, because these won't escape the `^[0-9TZ:.-]+$` boundaries once converted to [ISO](https://en.wikipedia.org/wiki/ISO_8601) strings

Accordingly, this *utility* is here only to hint that implementations might be more relaxed around the *encoding* or *decoding* effort, hopefully aiming at better performance as result.

As it is for `utf8` utility, this one just produces results out of the box:

```js
// `ascii(target)` as string buffer (no type or length)
ascii('a')  // [97]
// `ascii(target)` as string buffer (no type or length)
ascii(1)    // [49] // as '1'.charCodeAt(0) / ord(str(1))
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
// True
[98, 1]

// False
[98, 0]
```

Where `98` is the ASCII code associated to the char `b`.

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
const toBufferedClone = Symbol.for('buffered-clone');
// any name would do
const toBuffer = Symbol.for('buffered-clone');
const asBuffer = Symbol.for('buffered-clone');
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

decode(encode(new Complex)); // {"simple":0.123}
```

Please note that, to preserve recursion correctly, such method will be invoked once per reference, and once only, during any *encoding*, even if that reference is present multiple times within the encoded data.

```js
const a = new Complex;
const b = new Complex;

const d = decode(encode([a, b, a]));
// [{"simple":0.42},{"simple":0.78},{"simple":0.42}]
//  └──────┬──────┘                 └──────┬──────┘
//         └──◂ these two are the same ◂───┘

d[0] === d[2]; // true
d[0] === d[1]; // false
```

> ![NOTE]
> Internally both the original *reference* and its returning counterpart are temporarily tracked to guarantee that either pointers will provide the same *recursion* within the buffer.

  </div>
</details>

## TO BE CONTINUED ...

