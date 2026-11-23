import assert from 'node:assert/strict';
import { lookLine, lookSeen } from '../looknote.mjs';

const NAMES = { classic: 'Roamie', adrian: 'Adrian', rita: 'Rita X', sarah: 'Sarah' };
const nameOf = (l) => NAMES[l] ?? 'Roamie';
// Regression: switched from Rita X to Adrian mid-chat, it still said it was Rita X (the history was hers).
const line = lookLine(lookSeen(undefined, 'rita'), 'adrian', nameOf, 'Ken');
assert.match(line, /^- You are Adrian\. Ken switched your look/);
assert.match(line, /from Rita X were another character/);
assert.match(line, /never call yourself Rita X\.\n$/);
assert.equal(lookLine(undefined, 'adrian', nameOf), '', 'no line in a conversation only one look has had');
assert.equal(lookLine(['adrian'], 'adrian', nameOf), '', 'switching back and forth to the same look');
assert.match(lookLine(['rita', 'sarah', 'adrian'], 'adrian', nameOf), /from Rita X and Sarah were other characters/);
assert.deepEqual(lookSeen(['rita'], 'rita'), ['rita']);
assert.deepEqual(lookSeen('junk', 'sarah'), ['sarah']);
console.log('looknote ok');
