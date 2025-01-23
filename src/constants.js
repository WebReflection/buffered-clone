//@ts-check

/**
 * @param {string} c
 * @returns
 */
const $ = c => c.charCodeAt(0);

export const NULL       = 0;

export const BUFFER     = /** @type {66} */(  $('B')  );
export const BIGINT     = /** @type {73} */(  $('I')  );
export const NUMBER    = /** @type {110} */(  $('n')  );
export const ARRAY      = /** @type {65} */(  $('A')  );
export const RECURSIVE = /** @type {114} */(  $('r')  );
export const SYMBOL    = /** @type {121} */(  $('y')  );

export const DATE       = /** @type {68} */(  $('D')  );
export const OBJECT     = /** @type {79} */(  $('O')  );
export const UNDEFINED  = /** @type {48} */(  $('0')  );
export const MAP        = /** @type {77} */(  $('M')  );
export const SET        = /** @type {83} */(  $('S')  );
export const TYPED      = /** @type {84} */(  $('T')  );
export const ERROR     = /** @type {101} */(  $('e')  );
export const REGEXP     = /** @type {82} */(  $('R')  );
export const STRING    = /** @type {115} */(  $('s')  );

export const BOOLEAN    = /** @type {98} */(  $('b')  );
export const FUNCTION  = /** @type {102} */(  $('f')  );
