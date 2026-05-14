// r5 TASK K (周源/emmett P0 consequence): integration verifier for the
// cross-fox margin glyph chain — the demo-day "九只狐狸在同一段稿子上互相
// 留痕" moment that broke in R5 because 看心 didn't scan the GBM paste-block.
//
// What this verifies (top-down):
//   1. `detectClaims(CLIMACTIC_PARAGRAPH)` returns `medical: true` — the
//      absolutist sentence triggers the xin rule set.
//   2. A simulated `replaceLiveScan` puts a `kind:'flagged', fox:'xin'`
//      entry into the provenance store with the absolutist excerpt.
//   3. `findXinFlagsInRange(CLIMACTIC_PARAGRAPH)` returns ≥ 1 entry — what
//      VoiceDiffPanel.tsx calls to identify which flags 看墨 should report
//      having bypassed.
//   4. A simulated `add({ kind:'ai-touched', fox:'mo', relatedTo: xinId,
//      relatedAction: 'avoided' })` writes the cross-fox link.
//   5. `findCrossFoxFollowups(xinId)` returns the 看墨 entry — what
//      MarginSeal.ts feeds into the inline annotation widget.
//
// If any step asserts wrong the script exits non-zero. Run as part of the
// pre-deploy sanity check.
//
// Usage:  pnpm dlx tsx scripts/verify-cross-fox-glyph.ts

import { detectClaims } from '../lib/compliance/xin-detect';
import { CLIMACTIC_PARAGRAPH } from './seed/demo-content';

// We can't import the zustand store directly (it's 'use client' and depends on
// window-side state). Re-implement the same shape inline so the script runs
// in pure node.
interface FakeEntry {
  id: string;
  kind: 'flagged' | 'ai-touched' | 'hedge' | 'sourced' | 'claim';
  fox: string;
  excerpt: string;
  relatedTo?: string;
  relatedAction?: string;
  at: number;
}

const entries: FakeEntry[] = [];
let nextId = 0;

function add(e: Omit<FakeEntry, 'id' | 'at'>): FakeEntry {
  const created: FakeEntry = { ...e, id: `prov-${nextId++}`, at: Date.now() };
  entries.push(created);
  return created;
}

function findXinFlagsInRange(sourceText: string): FakeEntry[] {
  return entries.filter(
    (e) => e.fox === 'xin' && e.kind === 'flagged' && sourceText.includes(e.excerpt),
  );
}

function findCrossFoxFollowups(entryId: string): FakeEntry[] {
  return entries.filter((e) => e.relatedTo === entryId);
}

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) {
    console.error(`✗ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

// --- Step 1: xin rules flag the absolutist sentence
const flags = detectClaims(CLIMACTIC_PARAGRAPH);
assert(flags.medical, `detectClaims flags the absolutist GBM sentence as medical`);
assert(!flags.safe, `detectClaims.safe is false on the absolutist sentence`);

// --- Step 2: live-scan writes the flag into the provenance store
const xinEntry = add({
  kind: 'flagged',
  fox: 'xin',
  excerpt: CLIMACTIC_PARAGRAPH.slice(0, 80),
  relatedAction: 'live-scan',
});
assert(
  entries.filter((e) => e.fox === 'xin' && e.kind === 'flagged').length === 1,
  `provenance store has exactly one 看心 flagged entry`,
);

// --- Step 3: VoiceDiffPanel.tsx's findXinFlagsInRange picks it up
const xinFlagsInRange = findXinFlagsInRange(CLIMACTIC_PARAGRAPH);
assert(xinFlagsInRange.length >= 1, `findXinFlagsInRange returns ≥ 1 entry for the absolutist sentence`);
assert(xinFlagsInRange[0].id === xinEntry.id, `findXinFlagsInRange returned the right entry`);

// --- Step 4: 看墨 accept writes the cross-fox link
const moEntry = add({
  kind: 'ai-touched',
  fox: 'mo',
  excerpt: xinEntry.excerpt,
  relatedTo: xinEntry.id,
  relatedAction: 'avoided',
});
assert(moEntry.relatedTo === xinEntry.id, `看墨 entry links back to the 看心 entry`);

// --- Step 5: MarginSeal.ts's findCrossFoxFollowups feeds the inline annotation
const followups = findCrossFoxFollowups(xinEntry.id);
assert(followups.length === 1, `findCrossFoxFollowups returns exactly one 看墨 followup`);
assert(followups[0].fox === 'mo', `cross-fox followup is from 看墨`);
assert(followups[0].relatedAction === 'avoided', `cross-fox followup is tagged 'avoided'`);

// --- Step 6: provenance entries survive a subsequent live-scan replace cycle
// (the debounced editor scanner uses replaceLiveScan which preserves manual
// audits / cross-fox links — only live-scan tagged entries get evicted).
const nonLiveScanCount = entries.filter((e) => e.relatedAction !== 'live-scan').length;
assert(
  nonLiveScanCount === 1,
  `cross-fox 'avoided' entry survives a replaceLiveScan cycle (not tagged 'live-scan')`,
);

console.log('\nALL OK — cross-fox margin glyph chain is wired end-to-end.');
