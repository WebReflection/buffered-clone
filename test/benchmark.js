const date = new Date;
const buffer = new ArrayBuffer(128);
const error = new SyntaxError('reason');
const map = new Map;
const regexp = /[a-z0-9:.-]+/gmi;
const set = new Set;
const typed = new Int32Array(buffer);
const dataview = new DataView(buffer);

const array = [date, buffer, error, map, regexp, set, typed, dataview];
const object = { date, buffer, error, map, regexp, set, typed, dataview };

const base = {
  array,
  boolean: true,
  null: null,
  number: 123.456789,
  object,
  string: String(date),

  bigint: 123456789n,
  buffer,
  date,
  error,
  map,
  regexp,
  set,
  typed,
  dataview,
};

array.push(base);
object.recursive = base;

for (let ui8a = new Uint8Array(buffer), i = 0; i < ui8a.length; i++) {
  ui8a[i] = i;
  const random = Math.random() * i;
  set.add(random);
  map.set(i, random);
}

function same(value, i) {
  return value === this[i];
}

const is = (source, replica, clone) => {
  switch (source) {
    case array: {
      let { length } = source;
      if (length-- !== replica.length)
        return false;
      for (let i = 0; i < length; i++) {
        if (!is(source[i], replica[i]))
          return false;
      }
      return replica[length] === clone;
    }
    case object: {
      const se = [...Object.entries(source)];
      const re = [...Object.entries(replica)];
      if (se.length !== re.length)
        return false;
      for (let i = 0; i < se.length; i++) {
        const [sk, sv] = se[i];
        const [rk, rv] = re[i];
        if (sk !== rk)
          return false;
        if (sk === 'recursive') {
          if (rv !== clone)
            return false;
        }
        else if (!is(sv, rv))
          return false;
      }
      return true;
    }
    case buffer: {
      const view = new Int32Array(replica);
      if (typed.length !== view.length)
        return false;
      return typed.every(same, view);
    }
    case date: return +source === +replica;
    case error: return source.name === replica.name && source.message === replica.message;
    case map: {
      if (source.size !== replica.size)
        return false;
      for (const [k, v] of source) {
        if (replica.get(k) !== v)
          return false;
      }
      return true;
    }
    case regexp: return source.source === replica.source && source.flags === replica.flags;
    case set: {
      if (source.size !== replica.size)
        return false;
      return [...source].every(same, [...replica]);
    }
    case typed: {
      if (source.constructor !== replica.constructor)
        return false;
      if (source.length !== replica.length)
        return false;
      return source.every(same, replica);
    }
    case dataview: {
      if (source.constructor !== replica.constructor)
        return false;
      const i32a = new Int32Array(replica.buffer);
      if (typed.length !== i32a.length)
        return false;
      return typed.every(same, i32a);
    }
    default: return source === replica;
  }
};

const verify = replica => {
  for (const key of ['array', 'boolean', 'null', 'number', 'object', 'string']) {
    if (!is(base[key], replica[key], replica))
      throw new TypeError(`Invalid ${key}`);
  }
};

verify(structuredClone(base));
