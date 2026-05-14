import { seedVoice } from './seed/voice';

async function main(): Promise<void> {
  console.log('Seeding voice fixtures only…');
  const n = await seedVoice();
  console.log(`Done. Wrote ${n} entries.`);
}

main().catch((e) => {
  console.error('seed-voice-only failed:', e);
  process.exit(1);
});
