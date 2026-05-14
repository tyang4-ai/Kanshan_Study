'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { DiffColumn } from './DiffColumn';
import { SignalsRow } from './SignalsRow';
import { InlineVoiceMark } from './InlineVoiceMark';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { GENERIC_SYSTEM_PROMPT, VOICE_SYSTEM_PROMPT } from '@/lib/llm/deepseek';
import type { VoiceSpan, IterStep, VoiceFillFinal } from '@/lib/voice/rewriter';
import type { ScoreResult, SubScores } from '@/lib/voice/scorer';
import { CitationLink } from '@/components/citation/CitationLink';
import { vaultCitation } from '@/lib/citation/types';
import { fetchWithErrorToast } from '@/lib/fetch-helpers';
import { useAiErrorStore } from '@/lib/store/ai-error';
import {
  useProvenanceStore,
  findXinFlagsInRange,
} from '@/lib/store/provenance';

interface VoiceSourceMeta {
  id: string;
  title: string;
  date: string;
}

interface VoiceDiffPanelProps {
  selection: string;
  bullets: string;
  mode: 'fill' | 'polish';
  onAccept?: (text: string, kind: 'generic' | 'voice') => void;
}

interface PanelState {
  generic: string;
  voice: string;
  voiceSpans: VoiceSpan[];
  voiceScore: ScoreResult | null;
  genericScore: SubScores | null;
  trace: IterStep[];
  voiceSources: VoiceSourceMeta[];
  done: boolean;
  error: string | null;
  fallbackActive: boolean;
}

const INITIAL_STATE: PanelState = {
  generic: '',
  voice: '',
  voiceSpans: [],
  voiceScore: null,
  genericScore: null,
  trace: [],
  voiceSources: [],
  done: false,
  error: null,
  fallbackActive: false,
};

const COMPLIANCE_TEXT = '输出已添加 GB 45438 标识 · AI 生成可追溯';

// Render the voice text with InlineVoiceMark wrapping each VoiceSpan range.
export function renderVoiceMarks(text: string, spans: VoiceSpan[]): ReactNode {
  if (!text) return null;
  if (!spans || spans.length === 0) return text;

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((span, i) => {
    if (span.start < cursor || span.end > text.length || span.start >= span.end) return;
    if (span.start > cursor) {
      parts.push(text.slice(cursor, span.start));
    }
    parts.push(
      <InlineVoiceMark
        key={`vm-${i}-${span.start}`}
        sourceTitle={span.sourceTitle}
        sourceDate={span.sourceDate}
        sourceArticleId={span.sourceArticleId}
      >
        {text.slice(span.start, span.end)}
      </InlineVoiceMark>
    );
    cursor = span.end;
  });
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return parts;
}

// Parse SSE stream into events: {event, data}.
async function* readSse(res: Response): AsyncGenerator<{ event: string; data: string }> {
  if (!res.body) throw new Error('no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = 'message';
      const dataLines: string[] = [];
      block.split('\n').forEach((line) => {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      });
      if (dataLines.length > 0) {
        yield { event, data: dataLines.join('\n') };
      }
    }
  }
}

function toneFromScore(value: number): 'good' | 'warn' | 'soft' | 'neutral' {
  if (value >= 0.6) return 'good';
  if (value < 0.3) return 'warn';
  if (value < 0.55) return 'soft';
  return 'neutral';
}

export function VoiceDiffPanel({ selection, bullets, mode, onAccept }: VoiceDiffPanelProps) {
  const [state, setState] = useState<PanelState>(INITIAL_STATE);
  const [accepted, setAccepted] = useState<'generic' | 'voice' | null>(null);
  const [voiceLocked, setVoiceLocked] = useState(false);
  const [genericLoaded, setGenericLoaded] = useState(false);
  // R8 casual-user (Sun Yulin) P1: at ~33s end-to-end the panel sat on
  // 「通用稿生成中」 with no indication anything was happening — casual
  // users concluded it stalled. Tick an elapsed counter from run-start so
  // the static ticker shows "~30 秒预计" + live elapsed.
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState(INITIAL_STATE);
    setGenericLoaded(false);
    setElapsed(0);
    // Clear any prior toast — new run, fresh slate.
    useAiErrorStore.getState().dismiss();
    try {
      const res = await fetchWithErrorToast('/api/agents/voice-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bullets, selection, mode }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        setState((s) => ({ ...s, error: `status ${res.status}`, done: true }));
        return;
      }
      for await (const ev of readSse(res)) {
        try {
          const payload = JSON.parse(ev.data) as Record<string, unknown>;
          if (ev.event === 'generic') {
            const text = typeof payload.text === 'string' ? payload.text : '';
            setState((s) => ({ ...s, generic: text }));
            setGenericLoaded(true);
          } else if (ev.event === 'iter') {
            const step = payload as unknown as IterStep;
            setState((s) => ({ ...s, trace: [...s.trace, step] }));
          } else if (ev.event === 'final') {
            const final = payload as unknown as VoiceFillFinal;
            setState((s) => ({
              ...s,
              voice: final.voice ?? '',
              voiceSpans: final.voiceSpans ?? [],
              voiceScore: final.voiceScore ?? null,
              genericScore: final.genericScore ?? null,
              voiceSources: final.voiceSources ?? [],
              done: true,
            }));

            // R3 (史中 P0 2026-05-12): merge fallback + xin-avoided into a
            // single composite NOTICE toast (severity: 'notice') so the two
            // signals don't collide in the single-slot store and don't render
            // as a red error. R2 added each push separately — R3 collapses
            // them and tags the severity.
            const ACCEPT = 0.85;
            const total = final.voiceScore?.total;
            const fellBack = typeof total === 'number' && total < ACCEPT;
            const xinFlags = findXinFlagsInRange(selection);
            if (xinFlags.length > 0) {
              // Cross-fox arrow: record 看墨 'ai-touched' entries that link
              // back to each 看心 flag with relatedAction='avoided'.
              const add = useProvenanceStore.getState().add;
              for (const flag of xinFlags) {
                add({
                  kind: 'ai-touched',
                  fox: 'mo',
                  excerpt: flag.excerpt,
                  relatedTo: flag.id,
                  relatedAction: 'avoided',
                });
              }
            }
            if (fellBack || xinFlags.length > 0) {
              const parts: string[] = [];
              if (fellBack && typeof total === 'number') {
                parts.push(`看墨 3 轮未及 0.85 — 采用最佳稿 (得分 ${total.toFixed(2)})`);
              }
              if (xinFlags.length > 0) {
                parts.push(`已绕开 看心 标记的 ${xinFlags.length} 处需出处片段`);
              }
              useAiErrorStore.getState().push({
                message: parts.join(' · '),
                severity: 'notice',
              });
            }
          } else if (ev.event === 'error') {
            const msg = typeof payload.message === 'string' ? payload.message : 'stream error';
            // voice-fill's fallback shape (when present) is a single object
            // mirroring the `final` payload — render it as if it had streamed.
            const fb =
              payload.fallback && typeof payload.fallback === 'object' && !Array.isArray(payload.fallback)
                ? (payload.fallback as Partial<VoiceFillFinal> & { generic?: string })
                : null;
            setState((s) => ({
              ...s,
              error: msg,
              done: true,
              fallbackActive: fb !== null,
              generic: fb?.generic ?? s.generic,
              voice: fb?.voice ?? s.voice,
              voiceSpans: fb?.voiceSpans ?? s.voiceSpans,
              voiceScore: fb?.voiceScore ?? s.voiceScore,
              genericScore: fb?.genericScore ?? s.genericScore,
              voiceSources: fb?.voiceSources ?? s.voiceSources,
            }));
            if (fb && typeof fb.generic === 'string') setGenericLoaded(true);
          }
        } catch {
          // ignore malformed event data
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      setState((s) => ({ ...s, error: (err as Error).message, done: true }));
    }
  }, [bullets, selection, mode]);

  useEffect(() => {
    void run();
    return () => {
      abortRef.current?.abort();
    };
  }, [run]);

  // Tick elapsed seconds while loading; stop on done. Cheap (1Hz) — only
  // mounts when the panel is open. Resets on each new run via setElapsed(0).
  useEffect(() => {
    if (state.done) return;
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [state.done]);

  const handleAccept = (kind: 'generic' | 'voice') => {
    setAccepted(kind);
    const text = kind === 'generic' ? state.generic : state.voice;
    onAccept?.(text, kind);
  };

  const sub = state.voiceScore?.sub;
  const genericSub = state.genericScore;
  // Tone for AI 味 inverts: higher displayed value = MORE AI-flavor = bad. So a
  // displayed 0.7 should be 'warn' (red), displayed 0.1 should be 'good' (green).
  const aiToneInvert = (display: number): 'good' | 'warn' | 'soft' | 'neutral' => {
    if (display <= 0.25) return 'good';
    if (display >= 0.6) return 'warn';
    if (display >= 0.4) return 'soft';
    return 'neutral';
  };
  // scopeFidelity + citationFidelity are new (#13.8 / #13.9). Older cached
  // responses may lack them; default to 1 (treat unknown as "preserved") so UI
  // never crashes. Fresh responses always populate.
  const buildSignals = (s: SubScores) => [
    { label: 'AI 味', value: 1 - s.aiTaste, tone: aiToneInvert(1 - s.aiTaste) },
    { label: '词频对齐', value: s.wordAlignment, tone: toneFromScore(s.wordAlignment) },
    { label: '句长方差', value: s.sentenceVar, tone: toneFromScore(s.sentenceVar) },
    { label: '范围保真', value: s.scopeFidelity ?? 1, tone: toneFromScore(s.scopeFidelity ?? 1) },
    { label: '引用保真', value: s.citationFidelity ?? 1, tone: toneFromScore(s.citationFidelity ?? 1) },
  ];
  const signals = sub ? buildSignals(sub) : [];
  const genericSignals = genericSub ? buildSignals(genericSub) : [];

  const scopeFidelity = sub?.scopeFidelity ?? 1;
  const citationFidelity = sub?.citationFidelity ?? 1;

  // 看墨推荐 gate — VOICE is only safe to recommend when:
  //   total ≥ 0.70 (overall confidence) ·
  //   scopeFidelity ≥ 0.60 (deterministic noun-Jaccard didn't catch drift) ·
  //   termFidelity ≥ 0.80 (LLM critic confirmed must-preserve terms intact) ·
  //   citationFidelity == 1 (every source citation appears in the rewrite —
  //   strict because dropped citations are factual errors).
  // Otherwise we recommend GENERIC and surface a warning hairline.
  const voiceSafe =
    state.voiceScore != null &&
    state.voiceScore.total >= 0.7 &&
    scopeFidelity >= 0.6 &&
    (state.voiceScore.termFidelity ?? 1) >= 0.8 &&
    citationFidelity >= 1;
  const recommendCol: 'voice' | 'generic' = voiceSafe ? 'voice' : 'generic';

  // r5 TASK C (李笛 + emmett P0): hard gate. When termFidelity < 0.55, the
  // rewrite has dropped or replaced enough source-bound terms (CRISPR injected
  // into MGMT, "山峰" replacing TMZ) that we suppress the VOICE column entirely
  // instead of just steering the recommendation. Threshold is conservative
  // (legit rewrites land ≥ 0.7); anything below 0.55 is judged unsafe to show.
  const voiceTermsSafe = state.voiceScore == null
    || (state.voiceScore.termFidelity ?? 1) >= 0.55;

  // r5 TASK C (吴伟 acceptance criterion): persistent green bar when this
  // selection overlaps any 看心-flagged range. Stays visible from completion
  // through accept, replacing the toast-only signal that R3 shipped.
  const xinOverlapCount = state.done ? findXinFlagsInRange(selection).length : 0;

  return (
    <div
      data-testid="voice-diff-panel"
      style={{
        width: '100%',
        height: '100%',
        background: '#FAFBFD',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Noto Serif SC", serif',
        overflow: 'hidden',
        color: '#1A1F2A',
      }}
    >
      {/* Selection quote */}
      <div style={{
        flexShrink: 0,
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(23,114,246,0.18)',
        fontSize: 11.5, color: '#5A6270',
        fontFamily: '"Noto Serif SC", serif',
        background: 'rgba(23,114,246,0.06)',
        display: 'flex', gap: 8,
      }}>
        <span style={{ color: '#7A8B9F', fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, marginTop: 2, flexShrink: 0, letterSpacing: 0.5 }}>
          {mode === 'fill' ? 'STUB' : 'SEL'}
        </span>
        <span style={{ flex: 1, fontStyle: 'italic' }}>
          {selection || bullets || '— 这一段需要例子'}
        </span>
      </div>

      {/* r5 TASK H (周源 R4 standing, 史中, 吴伟 P1): retrieval-time disclaimer
          + 一键清空 baseline affordance. Always visible above the diff. */}
      <div
        data-testid="voice-diff-disclaimer"
        style={{
          flexShrink: 0,
          padding: '6px 14px 6px',
          borderBottom: '1px solid rgba(23,114,246,0.10)',
          fontSize: 10.5,
          color: '#5A6270',
          background: 'rgba(31,139,102,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          fontFamily: '"Noto Serif SC", serif',
        }}
      >
        <span style={{ flex: 1, letterSpacing: 0.1 }}>
          看墨基于 retrieval-time 比对 · 不对你的存稿做训练 · 看典里的 {state.voiceSources.length || '—'} 篇旧文仅在本次会话内被读取
        </span>
        <button
          data-testid="voice-diff-clear-baseline"
          type="button"
          onClick={async () => {
            try {
              await fetch('/api/voice/baseline-clear', { method: 'POST' });
              useAiErrorStore.getState().push({
                message: '看墨已清空本会话的声纹基线缓存',
                severity: 'notice',
              });
            } catch {
              useAiErrorStore.getState().push({
                message: '清空失败 · 请稍后重试',
                severity: 'notice',
              });
            }
          }}
          style={{
            border: '1px solid rgba(122,102,85,0.45)',
            background: 'transparent',
            color: '#5A6270',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            letterSpacing: 0.3,
            flexShrink: 0,
          }}
        >
          一键清空
        </button>
      </div>

      {state.fallbackActive && (
        <div
          data-testid="voice-diff-fallback-banner"
          title={state.error ?? undefined}
          style={{
            flexShrink: 0,
            margin: '6px 14px 0',
            alignSelf: 'flex-start',
            fontSize: 10.5,
            color: '#7A6655',
            background: 'rgba(122,102,85,0.10)',
            border: '1px dashed rgba(122,102,85,0.45)',
            borderRadius: 4,
            padding: '3px 8px',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 0.4,
          }}
        >
          备用样例 · 实时调用失败
        </div>
      )}

      {state.done && state.voiceScore != null && !voiceSafe && (
        <div
          data-testid="voice-diff-low-align-banner"
          style={{
            flexShrink: 0,
            margin: '6px 14px 0',
            fontSize: 10.5,
            color: '#9A6F1A',
            background: 'rgba(204,148,37,0.10)',
            border: '1px solid rgba(204,148,37,0.45)',
            borderRadius: 4,
            padding: '4px 8px',
            fontFamily: '"Noto Serif SC", serif',
            letterSpacing: 0.2,
          }}
        >
          ⚠️ 对齐度低，建议人工核对术语和事实。已为你切换默认推荐到 GENERIC。
        </div>
      )}

      {/* r5 TASK C (李笛 + emmett P0): term-fidelity hard suppression notice */}
      {state.done && !voiceTermsSafe && (
        <div
          data-testid="voice-diff-term-suppression"
          style={{
            flexShrink: 0,
            margin: '6px 14px 0',
            fontSize: 11,
            color: '#7A2A1F',
            background: 'rgba(184,85,67,0.10)',
            border: '1px solid rgba(184,85,67,0.55)',
            borderRadius: 4,
            padding: '6px 10px',
            fontFamily: '"Noto Serif SC", serif',
            lineHeight: 1.55,
          }}
        >
          <strong>看墨改写时丢失了原文专业术语</strong>（termFidelity ={' '}
          {(state.voiceScore?.termFidelity ?? 0).toFixed(2)}）· 已退回 GENERIC。语风稿不再展示，建议你重试或手工微调原句。
        </div>
      )}

      {/* r5 TASK C (吴伟 acceptance criterion): persistent 已绕开看心标记 green bar */}
      {state.done && xinOverlapCount > 0 && (
        <div
          data-testid="voice-diff-xin-bypass-bar"
          style={{
            flexShrink: 0,
            margin: '6px 14px 0',
            fontSize: 11,
            color: '#1F5B47',
            background: 'rgba(46,125,90,0.10)',
            border: '1px solid rgba(46,125,90,0.55)',
            borderRadius: 4,
            padding: '5px 10px',
            fontFamily: '"Noto Serif SC", serif',
            letterSpacing: 0.2,
          }}
        >
          ✓ 已绕开 看心 标记的 {xinOverlapCount} 处需出处片段 — 跨狐协作已生效
        </div>
      )}

      {/* Two-column scroll diff */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left — generic AI draft */}
        <DiffColumn
          label="GENERIC · 通用模型默认"
          accent="#7A6655"
          accentBg="rgba(122,102,85,0.06)"
          subtitle="无记忆 · 无文风 · 无引用"
          accepted={accepted === 'generic'}
          onAccept={() => handleAccept('generic')}
          recommended={state.done && recommendCol === 'generic'}
          promptTooltip={{
            title: '系统提示（GENERIC）',
            body: GENERIC_SYSTEM_PROMPT,
            footnote: 'DeepSeek-V3 · 无 voice grounding',
          }}
        >
          {genericLoaded ? (
            <>
              <p data-testid="voice-diff-generic-text">{state.generic}</p>
              {genericSignals.length > 0 && <SignalsRow signals={genericSignals} />}
            </>
          ) : (
            <p data-testid="voice-diff-generic-ticker"
              style={{ color: '#7A6655', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.7 }}>
              · · · 通用稿生成中
              <br />
              <span style={{ fontSize: 10, color: 'rgba(122,102,85,0.7)' }}>
                {`已 ${elapsed}s · 预计 ~22s · 不必关闭窗口`}
              </span>
            </p>
          )}
        </DiffColumn>

        {/* Center divider — inkstone */}
        <div style={{
          width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(42,52,65,0.35) 20%, rgba(42,52,65,0.35) 80%, transparent)',
          flexShrink: 0,
        }}/>

        {/* Right — voice-aligned draft */}
        <DiffColumn
          label={state.done && !voiceSafe ? 'VOICE · 据档案库重写 · 看墨不推荐' : 'VOICE · 据档案库重写'}
          accent="#1F8B66"
          accentBg="rgba(31,139,102,0.07)"
          subtitle={`档案库 ${state.voiceSources.length || '…'} 篇旧文 · 文风指纹 · 引用可溯`}
          accepted={accepted === 'voice'}
          onAccept={() => handleAccept('voice')}
          recommended={state.done && recommendCol === 'voice'}
          promptTooltip={{
            title: '系统提示（VOICE）',
            body: VOICE_SYSTEM_PROMPT,
            footnote: 'DeepSeek-V3 · BGE-M3 + Qwen3-Reranker grounded',
          }}
        >
          {state.done ? (
            !voiceTermsSafe ? (
              // r5 TASK C hard gate: suppress VOICE column when termFidelity
              // < 0.55. Replaces the rewrite text with an explicit notice so
              // judges can't accidentally accept a CRISPR-injected GBM rewrite.
              <div data-testid="voice-diff-voice-suppressed"
                style={{
                  padding: '10px 0',
                  color: '#7A2A1F',
                  fontSize: 11,
                  fontFamily: '"Noto Serif SC", serif',
                  lineHeight: 1.7,
                }}>
                <p style={{ marginBottom: 6, fontWeight: 600 }}>语风稿已被 看墨 自检拦下</p>
                <p style={{ fontSize: 10.5, color: '#9A4A3D' }}>
                  termFidelity {(state.voiceScore?.termFidelity ?? 0).toFixed(2)} &lt; 0.55 —
                  本轮改写丢失了原文专业术语，不展示语风稿以避免误导。请重试或采用 GENERIC。
                </p>
              </div>
            ) : (
              <motion.div
                data-testid="voice-diff-voice-text"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                // Dim VOICE column when scopeFidelity < 0.5 (persona-review
                // 2026-05-10 王婉清 P1: system warned but still presented at
                // full strength — the visual signal now matches the warning).
                style={
                  !voiceSafe
                    ? { opacity: 0.55, filter: 'grayscale(0.4)' }
                    : undefined
                }
              >
                <p>{renderVoiceMarks(state.voice, state.voiceSpans)}</p>
                {signals.length > 0 && <SignalsRow signals={signals} />}
              </motion.div>
            )
          ) : (
            <p data-testid="voice-diff-voice-ticker"
              style={{ color: '#1F8B66', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.7 }}>
              · · · 据档案库重写中（{state.trace.length} 稿迭代）
              <br />
              <span style={{ fontSize: 10, color: 'rgba(31,139,102,0.7)' }}>
                {`已 ${elapsed}s · 预计 ~33s · 看墨在重写 3 轮`}
              </span>
            </p>
          )}
        </DiffColumn>
      </div>

      {/* Trace footer (collapsed by default) */}
      {state.trace.length > 0 && (
        <details data-testid="voice-diff-trace" style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(23,114,246,0.18)',
          background: '#F4F7FB',
          padding: '6px 14px',
          fontSize: 10.5, color: '#5A6270',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.4,
        }}>
          <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
            轨迹 · {state.trace.length} 稿迭代
          </summary>
          <div style={{ marginTop: 4, lineHeight: 1.6 }}>
            {state.trace.map((step, i) => (
              <div key={i}>
                第 {i + 1} 稿 {step.score?.total?.toFixed(2) ?? '—'}
                {step.score?.rationale ? ` · ${step.score.rationale}` : ''}
                {step.accepted ? ' ✓' : ''}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* R5 (吴伟 / emmett P1 2026-05-13): voice-fingerprint algorithm expand.
          Click-to-expand showing the sub-score breakdown + weighting formula +
          a human-readable explainer. Numbers are real (from scoreVoice in
          lib/voice/scorer.ts); the explainer prose is human-written narrative.
          Native <details> matches the trace footer pattern above. */}
      {state.voiceScore && (
        <details data-testid="voice-diff-algorithm" style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(23,114,246,0.18)',
          background: '#FFFCEC',
          padding: '6px 14px',
          fontSize: 10.5, color: '#5A4E33',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.4,
        }}>
          <summary style={{ cursor: 'pointer', userSelect: 'none', color: '#2A2419', fontWeight: 600 }}>
            语风对齐算法 · 展开看分数构成
          </summary>
          <div style={{ marginTop: 8, lineHeight: 1.65, fontFamily: '"Noto Serif SC", serif', fontSize: 11.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: '#2A2419' }}>分项得分 (来自 lib/voice/scorer.ts)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5 }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(168,123,42,0.18)' }}>
                  <td style={{ padding: '3px 0' }}>AI 味反向 (1 − aiTaste)</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>{(1 - state.voiceScore.sub.aiTaste).toFixed(3)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(168,123,42,0.18)' }}>
                  <td style={{ padding: '3px 0' }}>词频对齐 (Jaccard@top-30)</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>{state.voiceScore.sub.wordAlignment.toFixed(3)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(168,123,42,0.18)' }}>
                  <td style={{ padding: '3px 0' }}>句长方差 (KL-divergence)</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>{state.voiceScore.sub.sentenceVar.toFixed(3)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(168,123,42,0.18)' }}>
                  <td style={{ padding: '3px 0' }}>范围保真</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>{(state.voiceScore.sub.scopeFidelity ?? 1).toFixed(3)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>引用保真</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>{(state.voiceScore.sub.citationFidelity ?? 1).toFixed(3)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: 10, fontWeight: 600, color: '#2A2419' }}>加权公式</div>
            <code style={{
              display: 'block',
              padding: '4px 6px',
              marginTop: 4,
              background: 'rgba(168,123,42,0.08)',
              fontSize: 10.5,
              borderRadius: 2,
            }}>
              total = 0.4 · hardSignal + 0.4 · LLMJudge + 0.2 · embedding
            </code>
            {state.voiceScore.rationale && (
              <div style={{ marginTop: 6, fontStyle: 'italic', color: '#7A6647' }}>
                本次评分: {state.voiceScore.rationale}
              </div>
            )}
            <div style={{ marginTop: 10, fontWeight: 600, color: '#2A2419' }}>怎么算的</div>
            <ul style={{ margin: '4px 0 0 18px', padding: 0, lineHeight: 1.7 }}>
              <li><strong>hardSignal</strong> · 来自 BGE-M3 编码的高频词分布对齐 + 句长方差 KL 距离，确定性分量，无 LLM 调用。</li>
              <li><strong>LLMJudge</strong> · Kimi-K2 以答主 5 篇旧文做 in-context 判断改写文是否保留了答主声音；返回 0-1 分 + reason。</li>
              <li><strong>embedding</strong> · 改写文 vs 答主语料 cosine 平均（pgvector HNSW 召回 top-5）。</li>
            </ul>
            <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(122,102,71,0.78)' }}>
              ACCEPT 阈值 ≥ 0.85；未达阈值则在 max 3 轮内继续迭代。
            </div>

            {/* r5 TASK H (史中 P1): matched-baseline excerpts. Show the top
                voiceSources entries with a one-line excerpt each so judges can
                trace "VOICE this rewrite is doing" back to specific old posts.
                Sourced from state.voiceSources which the stream already populates. */}
            {state.voiceSources.length > 0 && (
              <>
                <div style={{ marginTop: 12, fontWeight: 600, color: '#2A2419' }}>匹配示例（top 3 baseline）</div>
                <ul data-testid="voice-matched-baselines" style={{ margin: '4px 0 0 18px', padding: 0, lineHeight: 1.65, fontSize: 10.5 }}>
                  {state.voiceSources.slice(0, 3).map((src) => (
                    <li key={`vbase-${src.id}`} style={{ marginBottom: 4 }}>
                      <span style={{ color: '#1F5B47', fontWeight: 600 }}>《{src.title}》</span>
                      <span style={{ color: 'rgba(122,102,71,0.85)', marginLeft: 6 }}>· {src.date}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(122,102,71,0.78)' }}>
                  这次改写从这 {state.voiceSources.length} 篇旧文里抽出了高频收束方式逐字对齐 —
                  风骨匹配 {(state.voiceScore.total).toFixed(2)}。
                </div>
              </>
            )}
          </div>
        </details>
      )}

      {/* Voice-source row */}
      <div data-testid="voice-sources" style={{
        flexShrink: 0,
        borderTop: '1px solid rgba(23,114,246,0.18)',
        background: '#F4F7FB',
        padding: '8px 14px',
        fontSize: 10.5, color: '#5A6270',
        fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.4,
        display: 'flex', alignItems: 'center', gap: 10,
        overflowX: 'auto',
      }}>
        <span style={{ flexShrink: 0 }}>VOICE 取自 →</span>
        {state.voiceSources.length === 0 && (
          <span style={{ color: '#7A8B9F' }}>—</span>
        )}
        {state.voiceSources.map((s, i) => (
          // R6 demo-flow (Tan Shulin) P1: voiceSources can contain the same
          // articleId across multiple iter responses during streaming when
          // the drafter rephrases off the same vault chunk. Composite key
          // keeps React happy without changing the cited content.
          <CitationLink
            key={`${s.id}-${i}`}
            citation={vaultCitation({
              id: `voice-src-${s.id}`,
              index: i + 1,
              articleId: s.id,
              sourceTitle: s.title,
              preview: s.date,
            })}
          />
        ))}
      </div>

      {/* Footer controls */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid rgba(42,52,65,0.12)',
        padding: '10px 14px',
        background: '#F4F7FB',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10.5, color: '#7A8B9F',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.4,
          cursor: 'pointer', flex: 1,
        }}>
          <input
            data-testid="voice-diff-lock"
            type="checkbox"
            checked={voiceLocked}
            onChange={(e) => setVoiceLocked(e.target.checked)}
            style={{ accentColor: '#1772F6' }}
          />
          <span>锁定语风</span>
        </label>
        <button
          data-testid="voice-diff-regen"
          onClick={() => void run()}
          style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 4,
            border: '1px solid rgba(23,114,246,0.30)',
            background: 'transparent', color: '#1A1F2A',
            cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >重生成</button>
        <button
          data-testid="voice-diff-accept"
          onClick={() => handleAccept(accepted ?? 'voice')}
          style={{
            fontSize: 11, padding: '5px 14px', borderRadius: 4,
            border: 'none', background: '#1772F6', color: '#fff',
            cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
            fontWeight: 500,
          }}
        >采用 {accepted === 'generic' ? '通用稿' : '语风稿'} ↵</button>
      </div>

      <ComplianceLine>{COMPLIANCE_TEXT}</ComplianceLine>

      {state.error && (
        <div data-testid="voice-diff-error" style={{
          flexShrink: 0, padding: '6px 14px',
          background: 'rgba(192,48,40,0.08)', color: '#C03028',
          fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ flex: 1 }}>{state.error}</span>
          <button
            data-testid="voice-diff-retry"
            type="button"
            onClick={() => void run()}
            style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 3,
              border: '1px solid rgba(192,48,40,0.45)',
              background: '#fff', color: '#C03028',
              cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >重试</button>
        </div>
      )}
    </div>
  );
}

export type { VoiceDiffPanelProps, VoiceSourceMeta };
