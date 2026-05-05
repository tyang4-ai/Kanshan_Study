// Debate seed — 6 turns of looker文 vs looker纹 over the demo paragraph.

import { debateStream, type DebateTurn } from '@/lib/agents/debate';
import { writeCache } from '@/lib/cache/store';
import { debateKey } from '@/lib/cache/keys';
import { DEMO_PARAGRAPH, CLIMACTIC_PARAGRAPH } from './demo-content';

export async function seedDebate(): Promise<number> {
  let count = 0;
  for (const selection of [DEMO_PARAGRAPH, CLIMACTIC_PARAGRAPH]) {
    const turns: DebateTurn[] = [];
    for await (const t of debateStream(selection, 6)) {
      turns.push(t);
    }
    await writeCache('persona-debate', debateKey({ selection, turns: 6 }), turns);
    count += 1;
  }
  return count;
}
