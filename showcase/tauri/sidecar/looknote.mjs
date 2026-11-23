// Switching looks mid-conversation: the new prompt names the new look, but the history is full of replies signed as
// the old one, and models carry on as whoever they were. The session remembers which looks spoke in it, and while
// any other look has, every live state says who's talking now.

/** `looks` with `look` added once (a session's looks that have spoken in it). */
export const lookSeen = (looks, look) => [...new Set([...(Array.isArray(looks) ? looks : []), look])];

/** The live-state line for look `now`, or '' when no other look has spoken in this conversation. */
export function lookLine(looks, now, nameOf, user = 'the user') {
  const before = [...new Set((Array.isArray(looks) ? looks : []).filter((l) => l !== now).map(nameOf))].filter((n) => n !== nameOf(now));
  if (!before.length) return '';
  const me = nameOf(now), them = before.length > 1 ? `${before.slice(0, -1).join(', ')} and ${before.at(-1)}` : before[0];
  return `- You are ${me}. ${user} switched your look since earlier in this conversation: the replies there from ${them} were ${before.length > 1 ? 'other characters' : 'another character'}. Speak only as ${me}, with ${me}'s personality, and never call yourself ${them}.\n`;
}
