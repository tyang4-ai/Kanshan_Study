'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { DiffColumn } from './DiffColumn';
import { SignalsRow } from './SignalsRow';
import { InlineVoiceMark } from './InlineVoiceMark';
import { ComplianceLine } from './ComplianceLine';
import { GENERIC_SYSTEM_PROMPT, VOICE_SYSTEM_PROMPT } from '@/lib/llm/deepseek';
import type { VoiceSpan, IterStep, VoiceFillFinal } from '@/lib/voice/rewriter';
import type { ScoreResult } from '@/lib/voice/scorer';

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
  trace: IterStep[];
  voiceSources: VoiceSourceMeta[];
  done: boolean;
  error: string | null;
}

const INITIAL_STATE: PanelState = {
  generic: '',
  voice: '',
  voiceSpans: [],
  voiceScore: null,
  trace: [],
  voiceSources: [],
  done: false,
  error: null,
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

function toneFromScore(value: number): 'good' | 'warn' | 'neutral' {
  if (value >= 0.6) return 'good';
  if (value <= 0.35) return 'warn';
  return 'neutral';
}

export function VoiceDiffPanel({ selection, bullets, mode, onAccept }: VoiceDiffPanelProps) {
  const [state, setState] = useState<PanelState>(INITIAL_STATE);
  const [accepted, setAccepted] = useState<'generic' | 'voice' | null>(null);
  const [voiceLocked, setVoiceLocked] = useState(false);
  const [genericLoaded, setGenericLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState(INITIAL_STATE);
    setGenericLoaded(false);
    try {
      const res = await fetch('/api/agents/voice-fill', {
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
              voiceSources: final.voiceSources ?? [],
              done: true,
            }));
          } else if (ev.event === 'error') {
            const msg = typeof payload.message === 'string' ? payload.message : 'stream error';
            setState((s) => ({ ...s, error: msg, done: true }));
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

  const handleAccept = (kind: 'generic' | 'voice') => {
    setAccepted(kind);
    const text = kind === 'generic' ? state.generic : state.voice;
    onAccept?.(text, kind);
  };

  const sub = state.voiceScore?.sub;
  const signals = sub
    ? [
        { label: 'AI 味', value: 1 - sub.aiTaste, tone: toneFromScore(1 - sub.aiTaste) },
        { label: '词频对齐', value: sub.wordAlignment, tone: toneFromScore(sub.wordAlignment) },
        { label: '句长方差', value: sub.sentenceVar, tone: toneFromScore(sub.sentenceVar) },
      ]
    : [];

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
          promptTooltip={{
            title: '系统提示（GENERIC）',
            body: GENERIC_SYSTEM_PROMPT,
            footnote: 'DeepSeek-V3 · 无 voice grounding',
          }}
        >
          {genericLoaded ? (
            <p data-testid="voice-diff-generic-text">{state.generic}</p>
          ) : (
            <p data-testid="voice-diff-generic-ticker"
              style={{ color: '#7A6655', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
              · · · 通用稿生成中
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
          label="VOICE · 据档案库重写"
          accent="#1F8B66"
          accentBg="rgba(31,139,102,0.07)"
          subtitle={`档案库 ${state.voiceSources.length || '…'} 篇旧文 · 文风指纹 · 引用可溯`}
          accepted={accepted === 'voice'}
          onAccept={() => handleAccept('voice')}
          recommended
          promptTooltip={{
            title: '系统提示（VOICE）',
            body: VOICE_SYSTEM_PROMPT,
            footnote: 'DeepSeek-V3 · BGE-M3 + Qwen3-Reranker grounded',
          }}
        >
          {state.done ? (
            <motion.div
              data-testid="voice-diff-voice-text"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <p>{renderVoiceMarks(state.voice, state.voiceSpans)}</p>
              {signals.length > 0 && <SignalsRow signals={signals} />}
            </motion.div>
          ) : (
            <p data-testid="voice-diff-voice-ticker"
              style={{ color: '#1F8B66', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
              · · · 据档案库重写中（{state.trace.length} 稿迭代）
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

      {/* Voice-source row */}
      <div style={{
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
          <span key={s.id} title={`${s.title} · ${s.date}`} style={{
            flexShrink: 0,
            background: '#fff',
            border: '1px solid rgba(23,114,246,0.18)',
            padding: '2px 8px', borderRadius: 3,
            fontFamily: '"Noto Sans SC", sans-serif',
            color: '#1772F6', fontSize: 10.5,
            cursor: 'default',
          }}>v{i + 1} · {s.title}</span>
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
          flexShrink: 0, padding: '4px 14px',
          background: 'rgba(192,48,40,0.08)', color: '#C03028',
          fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
        }}>
          {state.error}
        </div>
      )}
    </div>
  );
}

export type { VoiceDiffPanelProps, VoiceSourceMeta };
