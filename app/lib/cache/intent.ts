// Canonical intent serialization for the demo cache.
//
// Cache keys must be deterministic across object key reorder + whitespace
// drift. Multi-round persona payloads (paragraph + mask + history[]) need
// distinct cache rows per conversation round, so the key includes history.

export interface CanonicalIntentInput {
  paragraph?: string;
  mask?: string;
  // history shape varies per surface (persona uses `{ mask, text }`, debate
  // uses `{ position, text }`, etc.) — kept as `unknown[]` so each surface's
  // builder can pass its own shape directly into canonicalIntent.
  history?: unknown[];
  [key: string]: unknown;
}

function normalizeText(s: string): string {
  // r5 TASK C (7 judges P0): cache-miss hardening.
  // \s matches all Unicode whitespace including NBSP, ideographic space, etc.
  // We additionally:
  //   - strip code-fence artifacts a judge might drag in when triple-clicking
  //     across a `<pre><code>` boundary (backticks, leading 4-space indents)
  //   - collapse repeated CJK punctuation pairs ("，，" → "，")
  //   - strip zero-width chars (ZWSP / ZWJ / ZWNJ / BOM) which occasionally
  //     ride along with paste-from-Notion / paste-from-Word workflows
  //   - lowercase ASCII so a stray uppercase in MGMT vs mgmt doesn't miss
  return s
    .replace(/[​-‍﻿]/g, '')
    .replace(/```+/g, '')
    .replace(/[，。；：、！？]{2,}/g, (m) => m[0])
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortKeys((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  if (typeof value === 'string') return normalizeText(value);
  return value;
}

export function canonicalIntent(payload: CanonicalIntentInput | string): string {
  if (typeof payload === 'string') return normalizeText(payload);
  return JSON.stringify(sortKeys(payload));
}
