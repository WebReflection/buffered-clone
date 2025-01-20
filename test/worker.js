export let known;

addEventListener('message', ({ data: [name, value, toBeDecoded] }) => {
  known = value;
  const args = [[name, value, toBeDecoded]];
  if (toBeDecoded) args.push([value.buffer]);
    postMessage(...args);
});
