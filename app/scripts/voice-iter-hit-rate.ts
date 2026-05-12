// R3 fix (李大海 / emmett P1 2026-05-12): runs the pure-function rule-based
// voice scorer (`computeHardSubScores`) over a 20-sample fixture spanning
// three quality tiers (high / mid / low). Reports score distribution + the
// projected iter-1/2/3 accept distribution as a proxy for 看墨's actual
// 0.85-threshold convergence behavior.
//
// Cost-table interpretation: if iter-1 accept ≥ 50%, the ¥0.27/flow typical
// cost in demo-qa-prep stands. If iter-1 accept < 30%, worst-case ¥0.38/flow
// dominates and the typical estimate needs to be revised upward.
//
// Usage:
//     pnpm tsx scripts/voice-iter-hit-rate.ts
// or with output redirected:
//     pnpm tsx scripts/voice-iter-hit-rate.ts > Documents/voice-iter-stats.txt

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeHardSubScores } from '../lib/voice/scorer';
import type { VoiceFeatures } from '../lib/voice/features';

interface Fixture {
  _meta: { thresholds: { accept: number; softWarning: number } };
  userSamples: string[];
  userBaseline: VoiceFeatures & { samples: number };
  samples: Array<{ id: string; tier: 'high' | 'mid' | 'low'; draft: string }>;
}

const ACCEPT = 0.85;
const SOFT_WARNING = 0.70;

const W_HARD = 0.4;
const W_LLM = 0.4;
const W_EMB = 0.2;

function totalScore(sub: ReturnType<typeof computeHardSubScores>): number {
  // hardSignal-only proxy: weighted mean of the 5 sub-scores. The real scorer
  // combines hardSignal (40%) + LLM judge (40%) + embedding (20%); without
  // LLM access we project hardSignal as if it were the full score so the
  // distribution remains directional even if absolute thresholds differ.
  const hard = (sub.aiTaste + sub.wordAlignment + sub.sentenceVar + sub.scopeFidelity + sub.citationFidelity) / 5;
  // Assume LLM judge + embedding average at 0.70 (calibration estimate). This
  // matches the 看墨 critic's typical mid-range behavior on Chinese long-form.
  return W_HARD * hard + W_LLM * 0.70 + W_EMB * 0.70;
}

function pct(x: number): string {
  return (x * 100).toFixed(1) + '%';
}

function main(): void {
  const fixturePath = resolve(__dirname, '..', 'content', 'seed', 'voice-iter-samples.json');
  const raw = readFileSync(fixturePath, 'utf8');
  const fixture = JSON.parse(raw) as Fixture;

  console.log(`# 看墨 voice scorer hit-rate — ${fixture.samples.length} samples`);
  console.log(`# fixture: ${fixturePath}`);
  console.log(`# scorer: lib/voice/scorer.ts → computeHardSubScores (rule-based, no LLM)`);
  console.log(`# accept threshold: ${ACCEPT}  ·  soft warning: ${SOFT_WARNING}`);
  console.log('');

  const tiers: Record<'high' | 'mid' | 'low', number[]> = { high: [], mid: [], low: [] };
  const all: Array<{ id: string; tier: string; score: number; sub: ReturnType<typeof computeHardSubScores> }> = [];

  for (const s of fixture.samples) {
    const sub = computeHardSubScores(s.draft, fixture.userBaseline, fixture.userSamples);
    const score = totalScore(sub);
    tiers[s.tier].push(score);
    all.push({ id: s.id, tier: s.tier, score, sub });
  }

  for (const tier of ['high', 'mid', 'low'] as const) {
    const scores = tiers[tier];
    if (scores.length === 0) continue;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const above = scores.filter((s) => s >= ACCEPT).length;
    const between = scores.filter((s) => s >= SOFT_WARNING && s < ACCEPT).length;
    const below = scores.filter((s) => s < SOFT_WARNING).length;
    console.log(`## tier=${tier} (n=${scores.length})`);
    console.log(`  mean score: ${mean.toFixed(3)}`);
    console.log(`  ≥ ${ACCEPT}: ${above}/${scores.length} (${pct(above / scores.length)})`);
    console.log(`  [${SOFT_WARNING}, ${ACCEPT}): ${between}/${scores.length} (${pct(between / scores.length)})`);
    console.log(`  <  ${SOFT_WARNING}: ${below}/${scores.length} (${pct(below / scores.length)})`);
    console.log('');
  }

  // Iter-1/2/3 projection. Treat tier=high as "iter1 immediate accept",
  // tier=mid as "iter2 accept after one rewrite nudge" (assume +0.10 score
  // bump per iter), tier=low as "iter3 best-effort, may still fail accept".
  const n = fixture.samples.length;
  const iter1Accepted = all.filter((a) => a.score >= ACCEPT).length;
  const iter2Accepted = all.filter((a) => a.score + 0.10 >= ACCEPT && a.score < ACCEPT).length;
  const iter3Accepted = all.filter((a) => a.score + 0.20 >= ACCEPT && a.score + 0.10 < ACCEPT).length;
  const fellBack = n - iter1Accepted - iter2Accepted - iter3Accepted;

  console.log(`## iter accept projection (assuming +0.10 score per iter)`);
  console.log(`  iter 1 immediate accept: ${iter1Accepted}/${n} (${pct(iter1Accepted / n)})`);
  console.log(`  iter 2 accept (after 1 rewrite): ${iter2Accepted}/${n} (${pct(iter2Accepted / n)})`);
  console.log(`  iter 3 accept (after 2 rewrites): ${iter3Accepted}/${n} (${pct(iter3Accepted / n)})`);
  console.log(`  fell back to best-of-3 (notice toast): ${fellBack}/${n} (${pct(fellBack / n)})`);
  console.log('');

  // Cost projection: assume iter1 = 0.084¥ (Generic + iter1 voice), iter2 +
  // 0.108¥ per extra iter (rewriteForVoice cost). See demo-qa-prep §2.
  const COST_BASE = 0.084;
  const COST_REWRITE = 0.108;
  const meanCost = (
    iter1Accepted * COST_BASE +
    iter2Accepted * (COST_BASE + COST_REWRITE) +
    iter3Accepted * (COST_BASE + 2 * COST_REWRITE) +
    fellBack * (COST_BASE + 2 * COST_REWRITE)
  ) / n;
  console.log(`## projected mean cost per voice-rewrite`);
  console.log(`  ≈ ¥${meanCost.toFixed(3)} / rewrite (hardSignal-driven proxy)`);
  console.log('');

  // 5 worst-scoring samples for inspection.
  const worst = [...all].sort((a, b) => a.score - b.score).slice(0, 5);
  console.log('## lowest-scoring samples (for tuning)');
  for (const w of worst) {
    console.log(`  - ${w.id} (${w.tier})  score=${w.score.toFixed(3)}  ` +
      `[aiTaste=${w.sub.aiTaste.toFixed(2)} wA=${w.sub.wordAlignment.toFixed(2)} ` +
      `sV=${w.sub.sentenceVar.toFixed(2)} sF=${w.sub.scopeFidelity.toFixed(2)} ` +
      `cF=${w.sub.citationFidelity.toFixed(2)}]`);
  }
}

main();
