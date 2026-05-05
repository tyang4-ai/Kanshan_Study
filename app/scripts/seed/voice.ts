// Voice-fill seed module. Captures the entire iter+final stream as one cache
// entry; runtime replays via replayStream with 800ms gaps.

import { voiceFillStream } from '@/lib/voice/rewriter';
import type { VoiceFillEvent } from '@/lib/voice/rewriter';
import { loadBaseline } from '@/lib/voice/baseline';
import { writeCache } from '@/lib/cache/store';
import { voiceFillKey } from '@/lib/cache/keys';
import { DEMO_USER_ID, VOICE_BULLETS, DEMO_PARAGRAPH } from './demo-content';

export async function seedVoice(): Promise<number> {
  let count = 0;
  // (1) Voice fill — bullets → 200-350 字 段落
  {
    const bullets = VOICE_BULLETS;
    const selection = '';
    const events = await collectVoiceFill(DEMO_USER_ID, bullets, 'fill', selection);
    await writeCache(
      'voice-fill',
      voiceFillKey({ userId: DEMO_USER_ID, mode: 'fill', bullets, selection }),
      events,
    );
    count += 1;
  }
  // (2) Voice diff — polish 现有段落
  {
    const bullets = '';
    const selection = DEMO_PARAGRAPH;
    const events = await collectVoiceFill(DEMO_USER_ID, bullets, 'polish', selection);
    await writeCache(
      'voice-fill',
      voiceFillKey({ userId: DEMO_USER_ID, mode: 'polish', bullets, selection }),
      events,
    );
    count += 1;
  }
  return count;
}

async function collectVoiceFill(
  userId: string,
  bullets: string,
  mode: 'fill' | 'polish',
  selection: string,
): Promise<VoiceFillEvent[]> {
  const baseline = loadBaseline(userId);
  const events: VoiceFillEvent[] = [];
  for await (const ev of voiceFillStream(userId, bullets, mode, selection, baseline)) {
    events.push(ev);
  }
  return events;
}
