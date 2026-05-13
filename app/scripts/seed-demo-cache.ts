// Orchestrates all per-surface seed modules. Runs once before the live demo;
// expected runtime ~3-5 min depending on DeepSeek latency.
//
//   pnpm tsx scripts/seed-demo-cache.ts
//
// Idempotent: re-running overwrites by (kind, intent_text) primary key.

import { seedVoice } from './seed/voice';
import { seedPersona } from './seed/persona';
import { seedDebate } from './seed/debate';
import { seedKanshanChat } from './seed/kanshan-chat';
import { countCache } from '../lib/cache/store';

interface SeedReport {
  kind: string;
  count: number;
  ms: number;
}

async function timed(name: string, fn: () => Promise<number>): Promise<SeedReport> {
  const t0 = Date.now();
  console.log(`▶ ${name} …`);
  const count = await fn();
  const ms = Date.now() - t0;
  console.log(`✓ ${name} — ${count} entries in ${(ms / 1000).toFixed(1)}s`);
  return { kind: name, count, ms };
}

async function main(): Promise<void> {
  console.log('Seeding demo cache (run with real DeepSeek + Supabase env vars)…');
  const reports: SeedReport[] = [];
  reports.push(await timed('kanshan-chat', seedKanshanChat));
  reports.push(await timed('voice', seedVoice));
  reports.push(await timed('persona', seedPersona));
  reports.push(await timed('debate', seedDebate));
  const total = await countCache();
  const totalSeeded = reports.reduce((a, r) => a + r.count, 0);
  console.log('');
  console.log('Seed summary:');
  for (const r of reports) console.log(`  ${r.kind.padEnd(10)} ${String(r.count).padStart(3)}`);
  console.log(`  ----------`);
  console.log(`  TOTAL      ${String(totalSeeded).padStart(3)} (cache table now: ${total})`);
}

main().catch((err) => {
  console.error('seed-demo-cache failed:', err);
  process.exit(1);
});
