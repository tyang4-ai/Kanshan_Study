// Voice-fill seed module. Captures the entire iter+final stream as one cache
// entry; runtime replays via replayStream with 800ms gaps.

import { voiceFillStream } from '@/lib/voice/rewriter';
import type { VoiceFillEvent } from '@/lib/voice/rewriter';
import { loadBaseline } from '@/lib/voice/baseline';
import { writeCache } from '@/lib/cache/store';
import { voiceFillKey } from '@/lib/cache/keys';
import { DEMO_USER_ID, VOICE_BULLETS, DEMO_PARAGRAPH, CLIMACTIC_PARAGRAPH } from './demo-content';

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
  // (2) Voice diff — polish 现有段落 (Stupp 第二段 — clean text, no 看心 flag)
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
  // (3) Voice diff — polish the 看心-flagged absolutist paragraph. Same
  //     code path as (2); the runtime side-effect (relatedAction='avoided'
  //     provenance entry) fires regardless because the selection text
  //     contains the flag's excerpt. This is the Step 7 demo target.
  {
    const bullets = '';
    const selection = CLIMACTIC_PARAGRAPH;
    const events = await collectVoiceFill(DEMO_USER_ID, bullets, 'polish', selection);
    await writeCache(
      'voice-fill',
      voiceFillKey({ userId: DEMO_USER_ID, mode: 'polish', bullets, selection }),
      events,
    );
    count += 1;
  }
  // (4) r5 TASK C (6 judges P0): seed *selection variants* of the
  // absolutist GBM sentence so a judge who triple-clicks and grabs a
  // partial selection still gets a cache hit. Each variant writes the
  // same response payload (events from step 3) keyed under its own
  // canonical-intent. The substring-lookup fallback in cache/store.ts
  // also covers these, but explicit seeds give zero-cost cosine hits.
  {
    const lastSeededEvents = await collectVoiceFill(DEMO_USER_ID, '', 'polish', CLIMACTIC_PARAGRAPH);
    const variants: string[] = [
      // First clause only
      '对 MGMT 甲基化阳性的患者，替莫唑胺一定能根治胶质母细胞瘤',
      // Second clause only ("5 年存活率 100%。")
      '替莫唑胺一定能根治胶质母细胞瘤，5 年存活率 100%。',
      // With leading whitespace (paste-from-pre artifact)
      '  对 MGMT 甲基化阳性的患者，替莫唑胺一定能根治胶质母细胞瘤，5 年存活率 100%。',
      // Common one-char variant 替莫"唤"胺 (李大海 saw this exact miss)
      '对 MGMT 甲基化阳性的患者，替莫唤胺一定能根治胶质母细胞瘤，5 年存活率 100%。',
    ];
    for (const selection of variants) {
      await writeCache(
        'voice-fill',
        voiceFillKey({ userId: DEMO_USER_ID, mode: 'polish', bullets: '', selection }),
        lastSeededEvents,
      );
      count += 1;
    }
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
