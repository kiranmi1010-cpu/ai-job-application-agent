// Words and phrases AI models over-use, compared with human writing.
// Hand-picked from the essay slop lists of sam-paech/slop-forensics
// (MIT, Copyright (c) 2025 Sam Paech; part of the Antislop work, ICLR 2026),
// keeping only style tells and leaving out topic words a marketing or strategy
// candidate genuinely needs (strategy, insights, stakeholders, metrics...).

export const SLOP_WORDS = [
  'crucial', 'crucially', 'pivotal', 'foster', 'fosters', 'fostering', 'fostered', 'profound', 'profoundly',
  'paramount', 'multifaceted', 'delve', 'delves', 'delving', 'underscore', 'underscores', 'underscored',
  'underscoring', 'navigate', 'navigating', 'navigated', 'robust', 'nuanced', 'enduring', 'inherent', 'inherently',
  'intricate', 'intricacies', 'meticulous', 'meticulously', 'tapestry', 'cornerstone', 'bedrock', 'relentless',
  'interplay', 'paradigm', 'transformative', 'indispensable', 'pervasive', 'undeniable', 'undeniably',
  'exemplifies', 'exemplify', 'encompasses', 'encompassing', 'burgeoning', 'seamless', 'seamlessly', 'unwavering',
  'intertwined', 'inextricably', 'holistic', 'synergy', 'synergies', 'synergistic', 'leverage', 'leveraging',
  'leverages', 'empowers', 'thrives', 'embodies', 'transcends', 'unparalleled', 'confluence', 'quintessential',
  'masterfully', 'illuminates', 'indelible', 'elevates', 'resonate', 'resonates', 'cultivate', 'cultivating',
  'bolstered', 'overarching', 'testament', 'realm', 'landscape', 'showcase', 'showcasing', 'furthermore',
  'moreover', 'additionally', 'amid', 'passionate', 'dynamic', 'spearheaded', 'spearheading',
];

export const SLOP_PHRASES: RegExp[] = [
  /\bplay(?:s|ed|ing)? an? (?:crucial|pivotal|vital|significant|critical|key|instrumental) role\b/i,
  /\bextends? far beyond\b/i,
  /\bmake informed decisions\b/i,
  /\bprovid(?:e|es|ing) valuable insights\b/i,
  /\bculture of continuous improvement\b/i,
  /\bnot (?:just|only|merely) (?:about )?[^,.;]{1,40}, but\b/i,
  /\bit(?:'|’)s not about [^,.;]{1,40}, it(?:'|’)s about\b/i,
  /\bin today(?:'|’)s\b/i,
  /\bever[- ]evolving\b/i,
];

/** The slop words and phrases found in a text, each once. */
export function findSlop(text: string): string[] {
  const words = new Set((String(text).toLowerCase().match(/[a-z]+/g) || []).filter((w) => SLOP_WORDS.includes(w)));
  const phrases = SLOP_PHRASES.map((p) => String(text).match(p)?.[0]).filter(Boolean) as string[];
  return [...words, ...phrases.map((p) => `"${p}"`)];
}
