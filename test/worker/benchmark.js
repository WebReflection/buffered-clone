export default class Benchmark {
  static INIT = 0;
  static RUN = 1;

  #ready = false;
  #send;
  #ondata;
  #name;
  #queue;
  #worker;

  constructor({ url, send, ondata = () => {} }) {
    this.#send = send;
    this.#ondata = ondata;
    this.#worker = new Worker(url, { type: 'module' });
    this.#worker.addEventListener('message', this);
    this.#queue = Promise.withResolvers();
    this.#worker.postMessage([Benchmark.INIT]);
  }

  get ready() { return this.#queue.promise }

  handleEvent({ data: [ACTION, ...rest] }) {
    if (ACTION === Benchmark.RUN) {
      this.#ondata(...rest);
      console.timeEnd(this.#name);
    }
    else this.#ready = true;
    this.#queue.resolve(...rest);
  }

  run(name) {
    if (!this.#ready) throw new Error('benchmark not ready');
    this.#name = name;
    this.#queue = Promise.withResolvers();
    console.time(this.#name);
    const [args, ...rest] = this.#send();
    this.#worker.postMessage([Benchmark.RUN, ...args], ...rest);
    return this.#queue.promise;
  }

  terminate() {
    this.#worker.terminate();
    this.#ready = false;
    this.#queue.reject('terminated before resolution');
  }
}
