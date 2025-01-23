declare function _default(ui8a: Uint8Array<ArrayBuffer>, options: Options | null): any;
export default _default;
export type Cache = Map<number, any>;
export type Options = {
    /**
     * With `all`, the default, everything recursive will be tracked. With `some`, all primitives get ignored or fail if found as recursive. With `none`, no recursion is ever tracked and an error is thrown when any recursive data is found.
     */
    recursion: "all" | "some" | "none";
};
export type Position = {
    i: number;
};
