// Canonical cache-key builders. The seed script + the runtime route handlers
// share these helpers so seeded entries match runtime lookups.

import { canonicalIntent } from './intent';

export interface VoiceFillKeyInput {
  userId: string;
  mode: 'fill' | 'polish';
  bullets: string;
  selection: string;
}

export function voiceFillKey(input: VoiceFillKeyInput): string {
  return canonicalIntent({
    userId: input.userId,
    mode: input.mode,
    bullets: input.bullets,
    selection: input.selection,
  });
}

export interface PersonaRoundKeyInput {
  paragraph: string;
  maskIds: string[];      // sorted by canonicalIntent
  round: 1 | 2 | 3;
  history?: Array<{ mask: string; text: string }>;
}

export function personaRoundKey(input: PersonaRoundKeyInput): string {
  return canonicalIntent({
    paragraph: input.paragraph,
    maskIds: [...input.maskIds].sort(),
    round: input.round,
    history: input.history ?? [],
  });
}

export interface PersonaFollowupKeyInput {
  paragraph: string;
  history: Array<{ mask: string; text: string }>;
  userMessage: string;
  // mask the orchestrator routed to (or a constant 'auto' if not yet routed)
  routedMask?: string;
}

export function personaFollowupKey(input: PersonaFollowupKeyInput): string {
  return canonicalIntent({
    paragraph: input.paragraph,
    history: input.history,
    userMessage: input.userMessage,
    routedMask: input.routedMask ?? 'auto',
  });
}

export interface DebateKeyInput {
  selection: string;
  turns: number;
}

export function debateKey(input: DebateKeyInput): string {
  return canonicalIntent({ selection: input.selection, turns: input.turns });
}

export interface CustomMaskKeyInput {
  paragraph: string;
  maskDescription: string;
  round: 1 | 2 | 3;
  userMessage?: string;
}

export function customMaskKey(input: CustomMaskKeyInput): string {
  return canonicalIntent({
    paragraph: input.paragraph,
    maskDescription: input.maskDescription,
    round: input.round,
    userMessage: input.userMessage ?? '',
  });
}
