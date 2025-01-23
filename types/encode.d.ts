declare function _default<T>(value: T extends undefined ? never : T extends Function ? never : T extends symbol ? never : T, options?: Options | null): Uint8Array;
export default _default;
export type Cache = Map<any, number[]>;
export type recursion = 0 | 1 | 2;
export type RAM = {
    r: recursion;
    a: number[] | Uint8Array;
    m: Cache | null;
    $: boolean;
    _: number;
};
export type Recursion = {
    a: number[] | Uint8Array;
    $: false;
    _: number;
};
export type Options = {
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
     * If passed, no more than those bytes will ever be allocated. The maximum value is `(2 ** 32) - 1` but here its default is `2 ** 24`. See https://tc39.es/ecma262/multipage/structured-data.html#sec-resizable-arraybuffer-guidelines to know more.
     */
    maxByteLength: number;
};
