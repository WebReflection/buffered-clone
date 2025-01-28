# buffered-clone

[![Coverage Status](https://coveralls.io/repos/github/WebReflection/buffered-clone/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/buffered-clone?branch=main) 

<sup>**Social Media Photo by [marc belver colomer](https://unsplash.com/@marc_belver) on [Unsplash](https://unsplash.com/)**</sup>

A [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) like utility that converts all [supported JS types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#javascript_types) into a binary format.

**Highlights**

  * recursive out of the box for almost anything that can be serialized
  * once *hot*, it's nearly as fast as native *structuredClone*
  * it allows filling pre-allocated buffers and *SharedArrayBuffer*
  * it allows growing *buffers* if resizable
  * it understands and convert all *Rust* number types (with the `128` variant exception)

**[Specifications](./SPECIFICATIONS.md)**: all you need to know about this simple, efficient, and portable protocol.

- - -

## API

Both `encode` and `decode` abilities are modules a part, grouped only by the *main* entry point but `buffered-clone/encode` and `buffered-clone/decode` wll provide the minimal amount of code needed to make this module work.

### BufferedClone.`encode(value:any, options?:Options):Uint8Array`

This utility is able to encode any *StructuredClone* compatible data so that `function`, `symbol`, or `undefined`, will be simply ignored while `NaN` or non *finite* numbers will be converted as `null` just like *JSON* does.

Differently from `structuredClone`, this module does not *throw* if data can't be serialized, more aligned with the feature, ease, and success `JSON` had to date across platforms.

```js
import encode from 'buffered-clone/encode';

encode(anything); // Uint8Array<ArrayBuffer>

// ignore recursion on primitives
encode(anything, { recursion: 'some' });
// throw on recursion (JSON strictness)
encode(anything, { recursion: 'none' });
```

#### Options

```ts
type Options = {
    /**
     * With `all` being the default, everything but `null`, `boolean` and empty `string` will be tracked recursively. With `some`, all primitives get ignored. With `none`, no recursion is ever tracked, leading to *maximum callstack* if present in the encoded data.
     */
    recursion: "all" | "some" | "none";
    /**
     * If `true` it will use a growing `ArrayBuffer` instead of an array.
     */
    resizable: boolean | null;
    /**
     * If passed, it will be filled with all encoded *uint8* values.
     */
    buffer: ArrayBuffer | null;
    /**
     * If passed, no more than those bytes will ever be allocated. The maximum value is `(2 ** 32) - 1` but here its default is `2 ** 26` (8MB of data, usually plenty for normal operations). See https://tc39.es/ecma262/multipage/structured-data.html#sec-resizable-arraybuffer-guidelines to know more.
     */
    maxByteLength: number;
};
```

### BufferedClone.`decode(ui8a:Uint8Array<ArrayBuffer>, options?:Options):any`

This utility is able to decode anything that was previously encoded via this library.

It will return a fresh new value out of the underlying buffer:

```js
import decode from 'buffered-clone/decode';

decode(encodedStuff); // any

// throws if recursion is found on primitives
decode(encodedStuff, { recursion: 'some' });

// throws on any recursion found while decoding
decode(encodedStuff, { recursion: 'none' });
```

#### Options

```ts
type Options = {
    /**
     * With `all`, the default, everything recursive will be tracked. With `some`, all primitives get ignored or fail if found as recursive. With `none`, no recursion is ever tracked and an error is thrown when any recursive data is found.
     */
    recursion: "all" | "some" | "none";
};
```

- - -

## F.A.Q.

  * **why not [BSON](https://en.wikipedia.org/wiki/BSON)?** - because "*BSON originated in 2009*" so it's old. I don't mean to state it's broken, outdated, not fast or anything, I just wanted a fresh start with *Web* constraints and features in mind and that is *StructuredClone*, because *BSON*, as example, is incapable of recursion while here I have **recursion as first citizen**. On the other hand, buffers in here are usually much smaller than buffers in *BSON* and mostly because of the recursion algorithm, but also because of the way all stuff is serialized, with `Length` being a major player in that space 😎
  * **wasn't [@ungap/structured-clone](https://github.com/ungap/structured-clone#readme) there yet?** - sort of ... the way I've shaped that project is a JS way only and based on *JSON* premises ... after [discussing a lot](https://github.com/DallasHoff/sqlocal/issues/39#issuecomment-2594628800) with other people involved in *serialization* though, it turned out the bottleneck to communicate across threads is the `postMessage` dance itself. Here I wanted to explore the ability to transfer buffers as they are, as opposite of using a smart library to drop recursion, to then `postMessage` it and then reveal such recursion on the other side (double recursion algorithm involved due `postMessage` *MITM* presence). Accordingly, this module goal is to explore, and hopefully solve, all performance related issues to cross threads communication, in a way that scales to any programming language, or wireless protocols, as long as all specs are clear 😇
  * **wasn't [flatted](https://github.com/WebReflection/flatted#readme) the way?** - again, both *flatted* and my *structuredClone* polyfill are there to solve a *JS* only use case. Here there is an opportunity to solve cross *PL* communication through a buffer, including *WASM*, so that every other previous attempt of mine to fix *JSON* constraints can be consider futile when it comes to other *PL*s or envs. True that *flatted* offers both a *Python* and *PHP* module to recreate in those *PL*s the original data, but in here there is no such limitation in terms of target *PL*s so that even `C` or `C++` or `Rust` could provide their own `bufferedClone.decode(view)` ability 🥳
  * **could a buffer be streamed?** - **Yes** because every detail needed to do so is already available while the buffer is being parsed:
    * the `length` of *arrays*, *objects*, *maps*, *sets* or any other type with variadic length is the first information after the *type*, meaning that **differently from JSON** one does not need to reach the end of anything, it can just keep sending on demand whatever it is that is meant to be sent
    * the `RECURSIVE` type is linear in memory so that it's not possible to encounter a *recursive* type that has not been already parsed. Keeping a reference of that *index* and resulting object is also cheaper than keeping the whole buffer in memory to re-recurse and/or create a new value each time but it's also a one-off operation done while streaming and the memory can be freed at the end
    * this is actually my next step for this module: provide a `buffered-clone/stream` variant that uses exact same logic but it triggers in order all values as these arrive, meaning it can play well with `CompressionStream` or `DecompressionStream` too ... just wait for it!
  * **could I use a `toJSON` like method?** - currently **Yes**, but it's `Symbol.for("buffered-clone")` instead as a method any reference or class could implement.
  * **what about [Web API types](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#webapi_types)?** - these will be supported too, where possible, once all *JS* types have been proven to work efficiently and effectively.
