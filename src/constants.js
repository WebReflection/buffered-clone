//@ts-check

export const { BYTES_PER_ELEMENT } = Uint32Array;

/**
 * @param {string} c
 * @returns
 */
const code = c => c.charCodeAt(0);

export const NULL       = 0;
export const BOOLEAN    = code('b');
export const NUMBER     = code('n');
export const STRING     = code('s');
export const ARRAY      = code('A');
export const OBJECT     = code('O');
export const BUFFER     = code('B');
export const TYPED      = code('T');
export const RECURSIVE  = code('r');
