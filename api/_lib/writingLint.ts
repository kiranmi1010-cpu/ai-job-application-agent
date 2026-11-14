// Deterministic checks on AI-written text. The model is told the rules; this
// catches the times it ignores them, so the editor pass can fix them by name.

import { findSlop } from './slopList';

const BANNED: Array<[RegExp, string]> = [
  [/\bi am (?:truly |very |deeply )?passionate about\b/i, '"I am passionate about"'],
  [/\bi believe i (?:would|will) be a (?:great|perfect|strong|good) fit\b/i, '"I believe I would be a great fit"'],
  [/\bhit the ground running\b/i, '"hit the ground running"'],
  [/\bdrive results\b/i, '"drive results"'],
  [/\bfast[- ]paced\b/i, '"fast-paced"'],
  [/\bi am (?:thrilled|excited|eager) to\b/i, '"I am excited/thrilled to"'],
  [/\bi am writing to express my (?:keen |strong )?interest\b/i, '"I am writing to express my interest"'],
  [/\bresults[- ]driven\b/i, '"results-driven"'],
  [/\bdetail[- ]oriented\b/i, '"detail-oriented"'],
  [/\bteam player\b/i, '"team player"'],
  [/\bproven track record\b/i, '"proven track record"'],
  [/\bi think i could\b|\bi hope to\b/i, 'apologetic phrasing'],
];

export interface LintReport {
  issues: string[];
  wordCount: number;
}

export function lintWriting(text: string, maxWords = 320): LintReport {
  const issues: string[] = [];
  const body = String(text || '');
  if (/—|\s--\s/.test(body)) issues.push('uses em-dashes; replace with commas or full stops');
  for (const [pattern, label] of BANNED) if (pattern.test(body)) issues.push(`uses ${label}`);
  const slop = findSlop(body);
  if (slop.length) issues.push(`AI-sounding words: ${slop.join(', ')}; say it in plain words`);

  const wordCount = (body.match(/\b[\w'’-]+\b/g) || []).length;
  if (wordCount > maxWords) issues.push(`too long: ${wordCount} words, keep it under ${maxWords}`);

  const sentences = body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const iStarts = sentences.filter((s) => /^I\b/.test(s)).length;
  if (sentences.length >= 6 && iStarts / sentences.length > 0.45)
    issues.push(`${iStarts} of ${sentences.length} sentences start with "I"; vary the openings`);

  return { issues, wordCount };
}

/** Last-resort fixes that are always safe to apply in code. */
export function autoFix(text: string): string {
  return String(text || '')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s--\s/g, ', ')
    .replace(/,\s*,/g, ',');
}
