//@ts-check

/**
 * @param {string} c
 * @returns
 */
const $ = c => c.charCodeAt(0);

export const NULL       = 0;
export const BUFFER     = $('B');
export const BIGINT     = $('I');
export const NUMBER     = $('n');
export const ARRAY      = $('A');
export const RECURSIVE  = $('r');
export const SYMBOL     = $('y');

export const DATE       = $('D');
export const OBJECT     = $('O');
export const UNDEFINED  = $('0');
export const MAP        = $('M');
export const SET        = $('S');
export const TYPED      = $('T');
export const ERROR      = $('e');
export const REGEXP     = $('R');
export const STRING     = $('s');

export const BOOLEAN    = $('b');
export const FUNCTION   = $('f');
