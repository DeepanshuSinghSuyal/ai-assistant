// What the model is shown of each tool's parameters, kept short: every request carries all of them. The length and
// count limits on every field came to about a quarter of it; the check still enforces them, and a call that breaks
// one comes back to the model with what was wrong. Field types and choices stay: without draw's typed fields DeepSeek
// guessed shapes ({x, y, z} for [x, y, z]) and lost drawings.
import { z } from 'zod';

const NOISE = new Set(['$schema', 'minLength', 'maxLength', 'additionalProperties']); // item counts stay: models overran them (9 labels for 8)
const quiet = (v) => (Array.isArray(v) ? v.map(quiet) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).filter(([k]) => !NOISE.has(k)).map(([k, x]) => [k, quiet(x)])) : v);

/** The JSON schema the model sees for a zod schema: the same fields, types and choices, without the limits. */
export const leanSchema = (schema) => quiet(z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }));

// Some models send null for a field they leave out. The agents strip those and check again, except for a tool with its
// own model-facing schema, so the check here does it first (no Roamies field takes null).
export function stripNulls(v) {
  if (Array.isArray(v)) return v.map(stripNulls);
  if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null).map(([k, x]) => [k, stripNulls(x)]));
  return v;
}

/** Gives each tool its short model-facing schema, and a check that drops nulls first. Changes the tools in place. */
export function leanTools(tools) {
  for (const t of tools) {
    if (t.rawInputSchema || !t.parameters) continue;
    const full = t.parameters;
    t.rawInputSchema = t.modelSchema ? t.modelSchema(leanSchema(full)) : leanSchema(full); // a tool may trim its own further
    t.parameters = z.preprocess(stripNulls, full);
  }
  return tools;
}
