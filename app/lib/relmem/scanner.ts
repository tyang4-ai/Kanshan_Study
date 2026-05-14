'use client';
// r5 TASK I (李笛 P2): relational memory scanner. Two paths share this module:
//   - `applyFixtureAnnotations(docText)` — fixture-driven. Matches docText
//      against substring keys from `relmem-fixtures.json` and writes any hits
//      into useRelMemStore. Demo/cache path; zero embedding cost.
//   - `runLiveScan(docText, baseline)` — embedding-driven. Embeds the last
//      completed sentence and runs cosine vs (a) the 5 顾婉昔 vault notes
//      and (b) the last 5 visit topicSnippets. similarity > 0.80 → annotation.
//      实时 BYO-key path only.
//
// Both write through `useRelMemStore.replaceFromSource(source, next)` so each
// scan-tick evicts the prior source's annotations.

import { useRelMemStore, type RelMemAnnotation } from '@/lib/store/relmem';
import relmemFixturesJson from '@/content/seed/relmem-fixtures.json';

interface FixtureEntry {
  kind: 'echo' | 'contradict';
  matchSubstring: string;
  refTitle: string;
  refExcerpt: string;
  similarity: number;
}

const FIXTURES = relmemFixturesJson as FixtureEntry[];

/** Fixture path — substring match against the doc text. Cheap, deterministic,
 *  always available. Demo cache mode uses only this path. */
export function applyFixtureAnnotations(docText: string): void {
  if (!docText || docText.length < 8) {
    useRelMemStore.getState().replaceFromSource('fixture', []);
    return;
  }
  const hits: Array<Omit<RelMemAnnotation, 'id' | 'at'>> = [];
  for (const f of FIXTURES) {
    if (docText.includes(f.matchSubstring)) {
      // Use the longest sentence containing the match substring as anchor.
      const idx = docText.indexOf(f.matchSubstring);
      const sentenceStart = Math.max(0, docText.lastIndexOf('。', idx) + 1);
      const sentenceEndCandidate = docText.indexOf('。', idx);
      const sentenceEnd = sentenceEndCandidate < 0 ? docText.length : sentenceEndCandidate + 1;
      const anchor = docText.slice(sentenceStart, sentenceEnd).trim();
      hits.push({
        kind: f.kind,
        anchor,
        refTitle: f.refTitle,
        refExcerpt: f.refExcerpt,
        similarity: f.similarity,
        source: 'fixture',
      });
    }
  }
  useRelMemStore.getState().replaceFromSource('fixture', hits);
}

/** Live path — embedding-driven. Only runs in 实时 mode (BYO-key). The route
 *  this calls (/api/relmem/scan) wraps BGE-M3 embed + cosine; on cache-only
 *  or 401 it returns [] and the fixture annotations stand. */
export async function runLiveScan(docText: string): Promise<void> {
  if (!docText || docText.length < 30) {
    useRelMemStore.getState().replaceFromSource('live', []);
    return;
  }
  // Use the last completed sentence as the probe.
  const sentenceTerminator = /[。！？]/g;
  let lastIdx = -1;
  for (let m; (m = sentenceTerminator.exec(docText)); ) lastIdx = m.index;
  if (lastIdx < 0) return;
  const sentenceStart = Math.max(0, docText.lastIndexOf('。', lastIdx - 1) + 1);
  const sentence = docText.slice(sentenceStart, lastIdx + 1).trim();
  if (sentence.length < 12) return;
  try {
    const res = await fetch('/api/relmem/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { annotations?: Array<Omit<RelMemAnnotation, 'id' | 'at'>> };
    if (data.annotations && data.annotations.length > 0) {
      useRelMemStore.getState().replaceFromSource('live', data.annotations);
    } else {
      useRelMemStore.getState().replaceFromSource('live', []);
    }
  } catch {
    /* offline / no auth — fixtures stand */
  }
}
