// Persona-panel seed module. Walks the rehearsed conversation tree:
// 2 paragraphs × 4 fixed masks × 3 rounds + custom-mask track.

import { runRound1, runRoundN, runFollowup, type PersonaMessage } from '@/lib/agents/persona-panel';
import { FIXED_MASKS, type CustomMask } from '@/lib/personas';
import { writeCache } from '@/lib/cache/store';
import { personaRoundKey, personaFollowupKey, customMaskKey } from '@/lib/cache/keys';
import {
  DEMO_PARAGRAPH,
  CLIMACTIC_PARAGRAPH,
  FOLLOWUP_A,
  FOLLOWUP_B,
  CUSTOM_MASK_DESCRIPTION,
} from './demo-content';

const PARAGRAPHS = [DEMO_PARAGRAPH, CLIMACTIC_PARAGRAPH] as const;
const FIXED_MASK_IDS = FIXED_MASKS.map((m) => m.id);

export async function seedPersona(): Promise<number> {
  let count = 0;

  for (const paragraph of PARAGRAPHS) {
    // Round 1 — initial reactions, all 4 fixed masks
    const r1 = await runRound1(paragraph, FIXED_MASKS);
    await writeCache(
      'persona-panel',
      personaRoundKey({ paragraph, maskIds: FIXED_MASK_IDS, round: 1 }),
      r1,
    );
    count += 1;

    // Round 2 — replies to round 1
    const r2 = await runRoundN(paragraph, FIXED_MASKS, r1, 2);
    await writeCache(
      'persona-panel',
      personaRoundKey({
        paragraph,
        maskIds: FIXED_MASK_IDS,
        round: 2,
        history: r1.map((m) => ({ mask: m.mask, text: m.text })),
      }),
      r2,
    );
    count += 1;

    // Round 3 — replies to round 2
    const history12 = [...r1, ...r2];
    const r3 = await runRoundN(paragraph, FIXED_MASKS, history12, 3);
    await writeCache(
      'persona-panel',
      personaRoundKey({
        paragraph,
        maskIds: FIXED_MASK_IDS,
        round: 3,
        history: history12.map((m) => ({ mask: m.mask, text: m.text })),
      }),
      r3,
    );
    count += 1;

    // Two scripted followups, routed to the most likely mask
    for (const um of [FOLLOWUP_A, FOLLOWUP_B]) {
      const target = FIXED_MASKS[1]; // 业内行家 — most likely router landing
      const followup = await runFollowup(paragraph, history12, um, target);
      await writeCache(
        'persona-followup',
        personaFollowupKey({
          paragraph,
          history: history12.map((m) => ({ mask: m.mask, text: m.text })),
          userMessage: um,
          routedMask: target.label,
        }),
        followup,
      );
      count += 1;
    }
  }

  // Custom mask (看纹) — one paragraph, 3 rounds
  const custom: CustomMask = {
    id: 'demo-custom-1',
    label: CUSTOM_MASK_DESCRIPTION,
    description: CUSTOM_MASK_DESCRIPTION,
    fox: 'wen2',
  };
  const cR1 = await runRound1(DEMO_PARAGRAPH, [custom]);
  await writeCache(
    'custom-mask',
    customMaskKey({
      paragraph: DEMO_PARAGRAPH,
      maskDescription: CUSTOM_MASK_DESCRIPTION,
      round: 1,
    }),
    cR1,
  );
  count += 1;

  for (const um of [FOLLOWUP_A, FOLLOWUP_B]) {
    const followup = await runFollowup(DEMO_PARAGRAPH, cR1, um, custom);
    await writeCache(
      'custom-mask',
      customMaskKey({
        paragraph: DEMO_PARAGRAPH,
        maskDescription: CUSTOM_MASK_DESCRIPTION,
        round: 2,
        userMessage: um,
      }),
      [followup],
    );
    count += 1;
  }

  return count;
}

export type { PersonaMessage };
