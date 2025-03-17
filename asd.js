const bf = new ArrayBuffer(128);
const typed = new Int32Array(bf);
const dataview = new DataView(bf);

const data = {
  bf,
  typed,  // here it fails
  dataview, // here it fails too
};

structuredClone(data);

