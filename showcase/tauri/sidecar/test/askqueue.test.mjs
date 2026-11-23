// Parallel tool calls each asking Allow: the questions show one at a time, so none is answered no by the next.
import assert from 'node:assert/strict';
import { oneYesNoAtATime } from '../tools.mjs';

// Like the overlay: one question showing; a new one closes the old one with no answer.
function overlay() {
  let showing = null;
  const shown = [];
  const ask = (opts) => new Promise((resolve) => {
    showing?.resolve(null);
    showing = { opts, resolve };
    shown.push(opts.placeholder);
  });
  return { ask, shown, answer: (text) => { const s = showing; showing = null; s.resolve(text); } };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

{
  const o = overlay();
  const ask = oneYesNoAtATime(o.ask);
  const a = ask({ placeholder: 'one', choices: ['Allow', "Don't allow"] });
  const b = ask({ placeholder: 'two', choices: ['Allow', "Don't allow"] });
  await tick();
  assert.deepEqual(o.shown, ['one'], 'the second waits while the first shows');
  o.answer('yes'); await tick();
  assert.deepEqual(o.shown, ['one', 'two']);
  o.answer('yes');
  assert.deepEqual(await Promise.all([a, b]), ['yes', 'yes'], 'both get their own yes');
}

{
  const o = overlay();
  const ask = oneYesNoAtATime(o.ask);
  const stop = new AbortController();
  const a = ask({ placeholder: 'one', choices: ['Allow'] });
  const b = ask({ placeholder: 'two', choices: ['Allow'] }, stop.signal);
  const c = ask({ placeholder: 'three', choices: ['Allow'] });
  stop.abort();
  assert.equal(await b, null, 'cancelled while waiting: no');
  await tick();
  assert.deepEqual(o.shown, ['one'], 'the one after it still waits for the one showing');
  o.answer('yes'); await tick();
  assert.deepEqual(o.shown, ['one', 'three'], 'a cancelled question never shows');
  o.answer('yes');
  assert.equal(await a, 'yes'); assert.equal(await c, 'yes');
}

{
  const typed = [];
  const ask = oneYesNoAtATime(async (opts) => { typed.push(opts.placeholder); return 'k'; });
  ask({ placeholder: 'blocker', choices: ['Allow'] }).catch(() => {});
  assert.equal(await ask({ placeholder: 'Paste your key' }), 'k', 'typed answers are not queued');
}
console.log('askqueue: ok');
