// R2 judge fix (emmett P1 2026-05-12): runs the 看心 detection rules against
// the 100-example ground truth in `content/seed/xin-groundtruth.json` and
// reports precision / recall / F1 per category. Output is written to stdout
// in plain text so it can be quoted into demo-qa-prep.md.
//
// Usage:
//     pnpm tsx scripts/xin-precision-recall.ts
//
// or with output redirected:
//     pnpm tsx scripts/xin-precision-recall.ts > Documents/xin-stats.txt

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectClaims, statsFor, type XinFlags } from '../lib/compliance/xin-detect';

interface Fixture {
  id: string;
  text: string;
  expected: XinFlags;
}

function fmtPct(x: number): string {
  return (x * 100).toFixed(1) + '%';
}

function main(): void {
  const fixturePath = resolve(__dirname, '..', 'content', 'seed', 'xin-groundtruth.json');
  const raw = readFileSync(fixturePath, 'utf8');
  const fixtures = JSON.parse(raw) as Fixture[];

  const total = fixtures.length;
  console.log(`# 看心 precision/recall — ${total} ground-truth examples`);
  console.log(`# fixture: ${fixturePath}`);
  console.log('');

  const categories: Array<keyof XinFlags> = ['medical', 'financial', 'cherryPick', 'safe'];
  const failures: Array<{ id: string; text: string; expected: XinFlags; actual: XinFlags }> = [];

  for (const cat of categories) {
    const pairs = fixtures.map((f) => {
      const actual = detectClaims(f.text);
      const ok =
        actual.medical === f.expected.medical &&
        actual.financial === f.expected.financial &&
        actual.cherryPick === f.expected.cherryPick &&
        actual.safe === f.expected.safe;
      if (!ok && cat === 'medical') failures.push({ id: f.id, text: f.text, expected: f.expected, actual });
      return { expected: f.expected[cat], actual: actual[cat] };
    });
    const s = statsFor(pairs);
    console.log(`## ${cat}`);
    console.log(`  TP=${s.truePositive}  FP=${s.falsePositive}  TN=${s.trueNegative}  FN=${s.falseNegative}`);
    console.log(`  precision=${fmtPct(s.precision)}  recall=${fmtPct(s.recall)}  F1=${s.f1.toFixed(3)}`);
    console.log('');
  }

  // Overall accuracy (per-fixture exact-match of all 4 flags).
  let exactMatches = 0;
  for (const f of fixtures) {
    const actual = detectClaims(f.text);
    if (
      actual.medical === f.expected.medical &&
      actual.financial === f.expected.financial &&
      actual.cherryPick === f.expected.cherryPick &&
      actual.safe === f.expected.safe
    ) {
      exactMatches++;
    }
  }
  console.log(`## overall`);
  console.log(`  exact-match accuracy = ${exactMatches}/${total} (${fmtPct(exactMatches / total)})`);

  if (failures.length > 0) {
    console.log('');
    console.log('## first medical failures (for tuning):');
    for (const f of failures.slice(0, 5)) {
      console.log(`  - ${f.id}: ${f.text}`);
      console.log(`    expected: ${JSON.stringify(f.expected)}`);
      console.log(`    actual:   ${JSON.stringify(f.actual)}`);
    }
  }
}

main();
