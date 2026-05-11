'use client';

import { useEffect, useRef, useState } from 'react';
import { PersonaMessage } from '@/components/persona/PersonaMessage';
import { TypewriterText } from '@/components/persona/TypewriterText';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { FOX_BY_ID, type FoxId } from '@/lib/foxes/registry';
import type { DebateTurn } from '@/lib/agents/debate';
import { fetchWithErrorToast } from '@/lib/fetch-helpers';
import { useAiErrorStore } from '@/lib/store/ai-error';

interface DebateTabProps {
  selection?: { text: string; rect?: DOMRect } | null;
  turns?: number;
}

const DEFAULT_SELECTION_TEXT = '这种黑盒特性在临床决策场景下是致命的。';
const COMPLIANCE_TEXT = '辩论由模型扮演 · 不代表真实立场';

async function* readSse(
  res: Response,
): AsyncGenerator<{ event: string; data: string }> {
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

function isMockError(message: string | null): boolean {
  if (!message) return false;
  // 5/12 TODO: verify Kimi quota error code; 402 covers DeepSeek, 401 covers placeholder Kimi state
  return message.includes('402') || message.includes('401') || message.includes('余额');
}

export function DebateTab({ selection, turns = 6 }: DebateTabProps) {
  const selectionText = selection?.text ?? DEFAULT_SELECTION_TEXT;

  const [messages, setMessages] = useState<DebateTurn[]>([]);
  const [currentTurn, setCurrentTurn] = useState<DebateTurn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackActive, setFallbackActive] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Reset on dependency change is intentional — new selection/turns means a new debate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]);
    setCurrentTurn(null);
    setError(null);
    setFallbackActive(false);

    useAiErrorStore.getState().dismiss();

    const run = async () => {
      try {
        const res = await fetchWithErrorToast('/api/agents/debate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selection: selectionText, turns }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          if (!ctrl.signal.aborted) {
            setError(`status ${res.status}`);
          }
          return;
        }
        for await (const ev of readSse(res)) {
          if (ctrl.signal.aborted) return;
          try {
            const payload = JSON.parse(ev.data) as Record<string, unknown>;
            if (ev.event === 'turn') {
              const next = payload as unknown as DebateTurn;
              setCurrentTurn((prev) => {
                if (prev) {
                  setMessages((m) => [...m, prev]);
                }
                return next;
              });
            } else if (ev.event === 'error') {
              const msg =
                typeof payload.message === 'string'
                  ? payload.message
                  : 'stream error';
              const fallback = Array.isArray(payload.fallback)
                ? (payload.fallback as DebateTurn[])
                : [];
              if (fallback.length > 0) setFallbackActive(true);
              setMessages((m) => [...m, ...fallback]);
              setCurrentTurn(null);
              setError(msg);
            } else if (ev.event === 'done') {
              // currentTurn (if any) commits via TypewriterText onComplete
            }
          } catch {
            // ignore malformed event data
          }
        }
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError((err as Error).message);
      }
    };

    void run();

    return () => {
      ctrl.abort();
    };
  }, [selectionText, turns]);

  const mockBadge = isMockError(error) ? ' [mock data — LLM 余额不足]' : '';

  return (
    <div
      data-testid="debate-tab"
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
      <div
        data-testid="debate-quote"
        style={{
          flexShrink: 0,
          padding: '8px 14px',
          background: '#F4F7FB',
          borderBottom: '1px solid rgba(23,114,246,0.18)',
          fontSize: 11.5,
          color: '#5A6270',
        }}
      >
        论点：「{selectionText}」
      </div>

      <div
        data-testid="debate-message-list"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {fallbackActive && (
          <div
            data-testid="debate-fallback-banner"
            title={error ?? undefined}
            style={{
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
        {messages.map((m, i) => (
          <PersonaMessage
            key={`${m.id}-${i}`}
            foxId={m.foxId}
            mask={m.mask}
            text={m.text}
            tags={[]}
            replyToMask={m.replyToMask}
            agree={m.agree ?? undefined}
            time={`回合 ${i + 1}`}
          />
        ))}
        {currentTurn && (
          <LiveDebateRow
            key={currentTurn.id}
            turn={currentTurn}
            turnNumber={messages.length + 1}
            onComplete={() => {
              setMessages((m) => [...m, currentTurn]);
              setCurrentTurn((c) => (c?.id === currentTurn.id ? null : c));
            }}
          />
        )}
      </div>

      <ComplianceLine>
        {COMPLIANCE_TEXT}
        {mockBadge}
      </ComplianceLine>
    </div>
  );
}

function LiveDebateRow({
  turn,
  turnNumber,
  onComplete,
}: {
  turn: DebateTurn;
  turnNumber: number;
  onComplete: () => void;
}) {
  const f = FOX_BY_ID[turn.foxId as FoxId];

  return (
    <div
      data-testid="live-debate-row"
      style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
    >
      <div
        style={{
          position: 'relative',
          width: 26,
          height: 26,
          borderRadius: 13,
          background: f.glow,
          color: '#fff',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 6px ${f.glowSoft}55`,
        }}
      >
        {f.initial}
        <span
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 11,
            height: 11,
            borderRadius: 6,
            background: '#1F2F40',
            color: '#A8C8FF',
            fontSize: 8,
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #FAFBFD',
            lineHeight: 1,
          }}
        >
          面
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            marginBottom: 3,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#1A1F2A',
              fontFamily: '"Noto Serif SC", serif',
            }}
          >
            {f.name}
          </span>
          <span
            style={{
              fontSize: 9.5,
              padding: '1px 6px',
              borderRadius: 3,
              background: 'rgba(23,114,246,0.10)',
              color: '#1772F6',
              fontFamily: '"Noto Sans SC", sans-serif',
              fontWeight: 500,
              border: '0.5px solid rgba(23,114,246,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <span
              style={{
                fontSize: 8,
                opacity: 0.7,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: 0.4,
              }}
            >
              面具
            </span>
            {turn.mask}
          </span>
          <span
            style={{
              fontSize: 9.5,
              color: '#7A8B9F',
              marginLeft: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {`回合 ${turnNumber}`}
          </span>
        </div>
        {turn.replyToMask && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: '#5A6270',
              background: '#F0F3F8',
              padding: '1px 7px',
              borderRadius: 8,
              marginBottom: 4,
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: 2,
                background: '#C03028',
              }}
            />
            不同意{' '}
            <span style={{ color: '#1772F6', fontWeight: 500 }}>
              {`「${turn.replyToMask}」`}
            </span>
          </div>
        )}
        <div
          style={{
            fontSize: 13,
            color: '#1A1F2A',
            lineHeight: 1.6,
            fontFamily: '"Noto Serif SC", serif',
          }}
        >
          <TypewriterText text={turn.text} speed={30} onComplete={onComplete} />
        </div>
      </div>
    </div>
  );
}

export type { DebateTabProps };
