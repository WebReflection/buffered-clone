const date = new Date;
const buffer = new ArrayBuffer(128);
const error = new SyntaxError('reason');
const map = new Map;
const regexp = /[a-z0-9:.-]+/gmi;
const set = new Set;
const typed = new Int32Array(buffer);
const dataview = new DataView(buffer);

const array = [];
const object = {};

const data = {
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

array.push(data);
object.recursive = data;

for (let ui8a = new Uint8Array(buffer), i = 0; i < ui8a.length; i++) {
  ui8a[i] = i;
  const random = Math.random() * i;
  set.add(random);
  map.set(i, random);
}

function same(value, i) {
  return value === this[i];
}

const is = (source, replica, clone, known) => {
  if (known.has(replica)) return true;
  switch (source) {
    case array: {
      known.add(replica);
      let { length } = source;
      if (length-- !== replica.length)
        return false;
      for (let i = 0; i < length; i++) {
        if (!is(source[i], replica[i], clone, known))
          return false;
      }
      return replica[length] === clone;
    }
    case object: {
      known.add(replica);
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
        else if (!is(sv, rv, clone, known))
          return false;
      }
      return true;
    }
    case buffer: {
      known.add(replica);
      const view = new Int32Array(replica);
      if (typed.length !== view.length)
        return false;
      return typed.every(same, view);
    }
    case date: {
      known.add(replica);
      return +source === +replica;
    }
    case error: {
      known.add(replica);
      return source.name === replica.name && source.message === replica.message;
    }
    case map: {
      known.add(replica);
      if (source.size !== replica.size)
        return false;
      for (const [k, v] of source) {
        if (replica.get(k) !== v)
          return false;
      }
      return true;
    }
    case regexp: {
      known.add(replica);
      return source.source === replica.source && source.flags === replica.flags;
    }
    case set: {
      known.add(replica);
      if (source.size !== replica.size)
        return false;
      return [...source].every(same, [...replica]);
    }
    case typed: {
      known.add(replica);
      if (source.constructor !== replica.constructor)
        return false;
      if (source.length !== replica.length)
        return false;
      return source.every(same, replica);
    }
    case dataview: {
      known.add(replica);
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

const verify = clone => {
  const known = new Set;
  for (const key of [
    'array',
    'object'
  ]) {
    if (!is(data[key], clone[key], clone, known))
      throw new TypeError(`Invalid ${key}`);
  }
  for (const key of [
    'bigint',
    'boolean',
    'null',
    'number',
    'string',
  ]) {
    if (!is(data[key], clone[key], clone, known))
      throw new TypeError(`Invalid primitive ${key}`);
  }
};

export { data, verify };
