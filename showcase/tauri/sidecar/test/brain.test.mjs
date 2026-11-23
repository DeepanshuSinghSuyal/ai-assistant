// Side calls: which model folds and learns, the retry, the transcript they read, and what's kept of their reply.
import assert from 'node:assert/strict';
import { foldInput, foldPrompt, memoryInput, memoryPrompt, oneShot, parseBrain, sideThinking, summaryModelFor, transcript } from '../brain.mjs';

// The summary model is gg-core's cheaper pick, unless the current model is cheaper still.
assert.equal(summaryModelFor('anthropic', 'claude-opus-5-5'), 'claude-sonnet-5-5', 'Opus folds on Sonnet');
assert.equal(summaryModelFor('anthropic', 'claude-haiku-5-5'), 'claude-haiku-5-5', 'Haiku is already cheaper than Sonnet');

// Side calls think at the model's lowest level, never above the chat's. Regression: Gemini lists only "high",
// so folds and memory passes ran at high while the chat ran at low.
assert.equal(sideThinking('gemini', 'gemini-3.8-flash', 'low'), 'low', 'capped at the chat level');
assert.equal(sideThinking('anthropic', 'claude-sonnet-5-5', 'high'), 'low', 'the lowest level when the chat thinks harder');
assert.equal(sideThinking('anthropic', 'claude-sonnet-5-5', null), undefined, 'thinking off in the chat: off here too');
assert.equal(sideThinking('huggingface', 'deepseek-ai/DeepSeek-V4.1-Flash', 'low'), undefined, 'a model that cannot think gets none');

// Summary model first; if that fails, once more on the current model.
{
  const tried = [];
  const run = async (o) => { tried.push(o.model); if (o.model === 'claude-sonnet-5-5') throw new Error('not on this plan'); return '{"facts":[]}'; };
  const r = await oneShot({ provider: 'anthropic', model: 'claude-opus-5-5', system: 's', text: 't', run });
  assert.deepEqual(tried, ['claude-sonnet-5-5', 'claude-opus-5-5']);
  assert.equal(r.model, 'claude-opus-5-5');
  await assert.rejects(oneShot({ provider: 'anthropic', model: 'claude-haiku-5-5', system: 's', text: 't', run: async () => { throw new Error('down'); } }), /down/, 'no second try on the same model');
}

// The reply: JSON (fenced or not), facts redacted and checked, replaces only for ids that exist.
{
  const reply = '```json\n{"summary": "Ken asked to tidy the Downloads folder and it was done.", "facts": [' +
    '{"text": "Ken edits videos in Final Cut Pro"}, {"text": "Ken now lives in Lisbon", "replaces": "f111111"}, {"text": "Ken likes tea", "replaces": "f999999"},' +
    '{"text": "Ken\'s API key is sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789"}, {"text": "Ken\'s password is hunter2"}, {"text": "Card 4111 1111 1111 1111"}, {"text": "x"}, "Ken has a dog called Rex"]}\n```';
  const out = parseBrain(reply, { knownIds: ['f111111'], wantSummary: true });
  assert.match(out.summary, /Downloads/);
  assert.deepEqual(out.facts, [
    { text: 'Ken edits videos in Final Cut Pro' },
    { text: 'Ken now lives in Lisbon', replaces: 'f111111' },
    { text: 'Ken likes tea' }, // an id that doesn't exist replaces nothing
    { text: 'Ken has a dog called Rex' },
  ], 'secrets, card numbers and scraps are dropped');
  assert.deepEqual(parseBrain('Sure! {"facts": []}').facts, [], 'nothing new');
  assert.throws(() => parseBrain('no json here'), /no JSON/);
  assert.throws(() => parseBrain('{"facts": []}', { wantSummary: true }), /no summary/, 'a fold needs its summary');
  assert.ok(!/sk-ant/.test(parseBrain('{"summary": "They pasted sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789 by mistake and were told to rotate it."}', { wantSummary: true }).summary), 'the summary is redacted too');
}

// What the side calls read: words and tool names, results cut short, notes stripped.
{
  const msgs = [
    { role: 'user', content: '[note] hidden\n\nKen said: I make videos' },
    { role: 'assistant', content: [{ type: 'text', text: 'Nice.' }, { type: 'tool_call', id: 'a', name: 'read_file', args: { path: '/x' } }] },
    { role: 'tool', content: [{ type: 'tool_result', toolCallId: 'a', content: 'r'.repeat(1000) }] },
    { role: 'user', content: [{ type: 'text', text: 'what is this' }, { type: 'image', mediaType: 'image/png', data: 'AAAA' }] },
  ];
  const t = transcript(msgs, 'Ken', (x) => x.replace(/^\[note\][\s\S]*?said: /, ''));
  assert.match(t, /^Ken: I make videos\nAssistant: Nice\. \[used read_file \{"path":"\/x"\}\]\n\[tool result\] r{300}…\nKen: what is this \[image\]$/);
  assert.ok(!t.includes('AAAA'), 'no image data');
  const facts = [{ id: 'f1', text: 'Ken makes videos' }];
  assert.match(foldInput({ facts, summary: 'Earlier.', turns: t, name: 'Ken' }), /- f1: Ken makes videos[\s\S]*Earlier summary:\nEarlier\.[\s\S]*Turns to fold/);
  assert.match(memoryInput({ facts: [], turns: t }), /\(none yet\)/);
  for (const p of [foldPrompt('Ken'), memoryPrompt('Ken')]) assert.match(p, /JSON[\s\S]*Never secrets[\s\S]*replaces/, 'both prompts carry the fact rules');
}
console.log('brain tests: passed');

// The skill pass: when it may run, what stops it, and what's kept of its reply.
{
  const { parseSkill, shouldLearn, skillInput, skillPrompt, soundsWrong } = await import('../brain.mjs');
  assert.ok(shouldLearn({ okTools: 5 }), 'five tools that worked');
  assert.ok(!shouldLearn({ okTools: 4 }), 'too short to be a how-to');
  assert.ok(!shouldLearn({ okTools: 9, errors: 1 }), 'a tool failed');
  assert.ok(!shouldLearn({ okTools: 9, aborted: true }), 'stopped');
  assert.ok(!shouldLearn({ okTools: 9, system: true }), 'a reminder or news turn');
  assert.ok(!shouldLearn({ okTools: 9, saved: true }), 'saved by hand already');
  assert.ok(!shouldLearn({ okTools: 9, on: false }), 'switched off');
  for (const t of ['no, that\'s wrong', 'Nope', 'that is not what I asked', 'it didn\'t work', 'undo that', 'you got the wrong file, wrong one']) assert.ok(soundsWrong(t), t);
  for (const t of ['thanks!', 'now do the same for March', 'nothing else', 'not bad at all, cheers']) assert.ok(!soundsWrong(t), t);
  assert.equal(parseSkill('{"skill": null}'), null);
  assert.deepEqual(parseSkill('```json\n{"skill": {"name": "Export Figma frames", "description": "When they want Figma frames as PNGs.", "steps": "1. Select the frames.\\n2. Export at 2x."}}\n```'),
    { name: 'Export Figma frames', description: 'When they want Figma frames as PNGs.', steps: '1. Select the frames.\n2. Export at 2x.' });
  assert.equal(parseSkill('{"skill": {"name": "Pay", "description": "When paying the bill online.", "steps": "1. Enter card 4111 1111 1111 1111 and pay."}}'), null, 'no card numbers');
  assert.equal(parseSkill('{"skill": {"name": "x", "description": "y", "steps": "z"}}'), null, 'scraps');
  assert.throws(() => parseSkill('nothing'), /no JSON/);
  assert.match(skillPrompt('Ken'), /Never passwords[^]*skip asking Ken[^]*When in doubt, null/);
  assert.match(skillInput({ index: '- tidy: When tidying', used: [{ slug: 'tidy', steps: '1. Sort.' }], turns: 'Ken: tidy' }), /- tidy: When tidying[^]*followed in this request[^]*tidy:\n1\. Sort\.[^]*Ken: tidy/);
  console.log('skill pass tests: passed');
}

// Feedback: short praise or a correction rates the last answer; requests, declines and "stop" don't.
{
  const { feedbackOf, shouldLearn } = await import('../brain.mjs');
  for (const t of ['good job', 'Perfect!', 'that worked, thanks', 'exactly', 'Nice one 👍', 'great work roamies', "that's it!", 'wow, perfect', 'well done, cheers']) assert.equal(feedbackOf(t), 'good', t);
  for (const t of ["no, that's wrong", "that's wrong, use Chrome", 'it didn\'t work', 'wrong file', 'not what I asked for', 'undo that, wrong one']) assert.equal(feedbackOf(t), 'wrong', t);
  for (const t of ['great, now do March', 'perfect, can you also email it to Sam?', 'thanks!', 'no thanks', "nope, that's all", 'stop', 'undo that', 'what is good to eat', 'open Safari', '', 'good job '.repeat(10)]) assert.equal(feedbackOf(t), null, t);
  assert.ok(!shouldLearn({ okTools: 2 }), 'two tools: too short without praise');
  assert.ok(shouldLearn({ okTools: 2, praised: true }), 'praised: two tools are enough');
  assert.ok(!shouldLearn({ okTools: 1, praised: true }), 'one tool is still a one-off');
  assert.ok(!shouldLearn({ okTools: 9, praised: true, on: false }), 'switched off stays off');
  // Which request a rating goes to: the one that just used tools; none after their chat-only request (regression: a
  // "that's wrong" there rated an older request and kept a lesson from it); a reminder in between changes nothing.
  const { rateTarget } = await import('../brain.mjs');
  const a = { id: 'a' }, b = { id: 'b' };
  assert.equal(rateTarget(a, { req: b, rated: true, theirs: true }), b);
  assert.equal(rateTarget(a, { rated: false, theirs: true }), null);
  assert.equal(rateTarget(a, { rated: false, theirs: false }), a);
  console.log('feedback tests: passed');
}

// The lesson pass: a fact, a fixed skill, nothing, and secrets rejected.
{
  const { lessonInput, lessonPrompt, parseLesson } = await import('../brain.mjs');
  assert.deepEqual(parseLesson('{"fact": {"text": "Ken uses Firefox, not Chrome", "replaces": "f1"}, "skill": null}', { knownIds: ['f1'] }), { fact: { text: 'Ken uses Firefox, not Chrome', replaces: 'f1' } });
  assert.deepEqual(parseLesson('```json\n{"fact": null, "skill": {"name": "Export Figma frames", "description": "When they want Figma frames as PNGs.", "steps": "1. Select the frames.\\n2. Export at 2x, not 1x."}}\n```').skill.name, 'Export Figma frames');
  assert.deepEqual(parseLesson('{"fact": null, "skill": null}'), {}, 'nothing to keep');
  assert.deepEqual(parseLesson('{"fact": {"text": "Ken\'s password is hunter2"}, "skill": {"name": "Pay", "description": "When paying the bill online.", "steps": "1. Enter card 4111 1111 1111 1111 and pay."}}'), {}, 'no secrets, no card numbers');
  assert.deepEqual(parseLesson('{"fact": "Ken likes tea", "skill": {"name": "x"}}'), { fact: { text: 'Ken likes tea' } }, 'a plain string fact; a scrap skill dropped');
  assert.throws(() => parseLesson('no'), /no JSON/);
  assert.match(lessonPrompt('Ken'), /never secrets[^]*Never passwords[^]*when in doubt/i);
  const input = lessonInput({ facts: [{ id: 'f1', text: 'Ken uses Chrome' }], index: '- tidy: When tidying', used: [{ slug: 'tidy', steps: '1. Sort.' }], turns: 'Ken: tidy', correction: "that's wrong, use Firefox" });
  assert.match(input, /- f1: Ken uses Chrome[^]*- tidy: When tidying[^]*tidy:\n1\. Sort\.[^]*Ken: tidy[^]*use Firefox/);
  assert.match(lessonInput({ turns: 'Ken: tidy' }), /without saying why/);
  console.log('lesson pass tests: passed');
}
