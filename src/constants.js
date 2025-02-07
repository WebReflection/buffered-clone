//@ts-check

/**
 * @param {string} c
 * @returns
 */
const $ = c => c.charCodeAt(0);

export const NULL       = 0;

export const BUFFER     =  /** @type {66} */(  $('B')  );
export const BIGINT     =  /** @type {73} */(  $('I')  );
export const NUMBER     = /** @type {110} */(  $('n')  );
export const ARRAY      =  /** @type {65} */(  $('A')  );
export const RECURSIVE  = /** @type {114} */(  $('r')  );
export const SYMBOL     = /** @type {121} */(  $('y')  );

export const DATE       =  /** @type {68} */(  $('D')  );
export const OBJECT     =  /** @type {79} */(  $('O')  );
export const UNDEFINED  =  /** @type {48} */(  $('0')  );
export const MAP        =  /** @type {77} */(  $('M')  );
export const SET        =  /** @type {83} */(  $('S')  );
export const TYPED      =  /** @type {84} */(  $('T')  );
export const ERROR      = /** @type {101} */(  $('e')  );
export const REGEXP     =  /** @type {82} */(  $('R')  );
export const STRING     = /** @type {115} */(  $('s')  );

export const ASCII      =  /** @type {97} */(  $('a')  );
export const FALSE      =  /** @type {98} */(  $('b')  );
export const TRUE       =  /** @type {99} */(  $('c')  );
export const IMAGEDATA  = /** @type {100} */(  $('d')  );
export const FUNCTION   = /** @type {102} */(  $('f')  );
export const DATAVIEW   = /** @type {118} */(  $('v')  );

// numbers are all over 127 ASCII values

export const I8A        = 128;
export const I8         = 129;

// space for I8CA

export const U8A        = 132;
export const U8         = 133;

export const U8CA       = 134;
export const U8C        = 135;

export const I16A       = 136;
export const I16        = 137;

// space for Uint16ClampedArray

export const U16A       = 140;
export const U16        = 141;

// space for Float16Array

export const I32A       = 144;
export const I32        = 145;

// space for Uint32ClampedArray

export const U32A       = 148;
export const U32        = 149;

// space for consistency sake

export const F32A       = 152;
export const F32        = 153;

export const F64A       = 156;
export const F64        = 157;

export const I64A       = 160;
export const I64        = 161;

// space for consistency sake

export const U64A       = 164;
export const U64        = 165;

// space for consistency sake


// NOT SUPPORTED IN JS
// export const I128A   = 168;
// export const I128    = 169;

// export const U128A   = 172;
// export const U128    = 173;

// export const F128A   = 176;
// export const F128    = 177;

// export const I256A   = 180;
// export const I256    = 181;

// export const U256A   = 184;
// export const U256    = 185;

// export const F256A   = 188;
// export const F256    = 189;

// export const I512A   = 192;
// export const I512    = 193;

// export const U512A   = 194;
// export const U512    = 195;

// export const F512A   = 198;
// export const F512    = 199;

// ... others ...

export const MAX_U8     = 2 ** 8;
export const MAX_I8     = MAX_U8 / 2;

export const MAX_U16    = 2 ** 16;
export const MAX_I16    = MAX_U16 / 2;

export const MAX_U32    = 2 ** 32;
export const MAX_I32    = MAX_U32 / 2;

// ⚠️ this is problematic in JS
export const MAX_F32    = 3.4e38;
