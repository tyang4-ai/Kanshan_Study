// 看墨 (mo) — voice rewriter + scorer
//
// 看墨 has two LLM call sites:
//   1. The voice rewriter (`app/lib/voice/rewriter.ts`) which uses two system
//      prompts shared at the provider layer — `GENERIC_SYSTEM_PROMPT` (the
//      baseline "write decent Chinese prose" anchor) and `VOICE_SYSTEM_PROMPT`
//      (the author-voice fingerprint anchor). Both live in `lib/llm/kimi.ts`
//      where the provider router shares them across kimi + deepseek paths.
//   2. The voice scorer's LLM judge (`app/lib/voice/scorer.ts`) which scores
//      style + termFidelity against author samples.
//
// We re-export the shared prompts here (rather than duplicate them) so this
// file is the single architectural lookup for "where is 看墨's prompt?" —
// what 颜鑫 R3 P1 was asking for. Source-of-truth stays at the provider layer
// where two providers can share it; the re-export only adds a stable name.

export { GENERIC_SYSTEM_PROMPT, VOICE_SYSTEM_PROMPT } from '@/lib/llm';

// Primary fox-level alias — `SYSTEM_PROMPT` is the voice-fingerprint prompt
// because that's the prompt that distinguishes 看墨 from a generic drafter.
// The GENERIC prompt is the no-fingerprint baseline used for the diff column.
export { VOICE_SYSTEM_PROMPT as SYSTEM_PROMPT } from '@/lib/llm';

// Scorer's LLM-judge system prompt. Used by `scoreLLMJudge` in
// `app/lib/voice/scorer.ts` to grade a draft against author samples + source
// segment on two axes: style (sounds-like-author 0..1) and termFidelity
// (preserved required terms verbatim 0..1).
export const SCORER_JUDGE_SYSTEM_PROMPT =
  '你是一位严格的中文文风+事实评判。给定作者样本、源段、待评稿，给出两个分数：(a) style — 待评稿读起来像同一作者的概率 0..1，看语气节奏与措辞；(b) termFidelity — 待评稿是否完整保留【必须保留的术语】中的每一项的写法（任意一项被改写或删除则降分）0..1。源段没提供时 termFidelity 默认 1。';
