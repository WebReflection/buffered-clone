import { bold, light } from 'https://esm.run/console-strings';
import * as console from 'https://esm.run/console-strings/browser';

import Benchmark from './benchmark.js';
import tests from './tests.js';

const lighter = globalThis.chrome ? light : String;

const append = (type, textContent) => benchmark.appendChild(
  el(type, textContent)
);

const el = (type, textContent) => Object.assign(
  document.createElement(type), { textContent }
);

const sleep = ms => new Promise($ => setTimeout($, ms));

benchmark.replaceChildren();
for (const [test, runs] of Object.entries(tests)) {
  append('h3', test);
  console.log(bold(test.toUpperCase()));
  for (const run of runs) {
    const p = append('p');
    const small = el('small', ` @ ${run.url} `);
    p.append(el('strong', run.name), small, el('br'));
    console.log(`  ${bold(run.name)}`);
    let checks = 0;
    const bench = new Benchmark(run);
    const info = p.appendChild(el('span', '⏱️ testing'));
    const check = data => {
      checks++;
      run.verify(run.decode?.(data) ?? data);
    };
    await bench.ready;
    bench.run(`    • ${lighter('cold run')} `);
    await bench.ready.then(check);
    for (let i = 0; i < run.hot; i++) {
      bench.run(`    • ${lighter(`hot run ${i + 1}`)}`);
      await bench.ready.then(check);
    }
    bench.terminate();
    await sleep(100);
    const prefix = checks === (run.hot + 1) ? `✅ done` : `🚫 failed`;
    const suffix = `(1 cold + ${run.hot} hot runs)`;
    info.textContent = `${prefix} with ${checks} checks ${suffix}`;
  }
  append('hr');
  console.log('');
  await sleep(300);
}