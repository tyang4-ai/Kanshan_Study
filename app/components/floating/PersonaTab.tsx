'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FIXED_MASKS, type MaskMeta, type CustomMask } from '@/lib/personas';
import type { PersonaMessage as PMsg } from '@/lib/agents/persona-panel';
import { PersonaMessage } from '@/components/persona/PersonaMessage';
import { Dot } from '@/components/persona/Dot';
import { CustomMaskForm } from '@/components/persona/CustomMaskForm';
import { MaskChipRow } from '@/components/persona/MaskChipRow';
import { RoundSelector } from '@/components/persona/RoundSelector';
import { RoundDivider } from '@/components/persona/RoundDivider';
import { UserBubble } from '@/components/persona/UserBubble';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { FOX_BY_ID, type FoxId } from '@/lib/foxes/registry';
import { fetchWithErrorToast } from '@/lib/fetch-helpers';
import { useAiErrorStore } from '@/lib/store/ai-error';

interface PersonaTabProps {
  mode?: 'auto' | 'pick' | 'recent';
  selection?: { text: string; rect?: DOMRect } | null;
}

type StreamItem =
  | { kind: 'msg'; msg: PMsg }
  | { kind: 'divider'; round: number; label: '初评' | '互评' }
  | { kind: 'user'; text: string }
  | { kind: 'fallback-banner'; message: string };

const FALLBACK_BANNER_TEXT = '备用样例 · 实时调用失败';

const COMPLIANCE_TEXT = '仿真读者 · 非真人 · 不可作为审稿依据';
const DEFAULT_SELECTION_TEXT =
  'CT 报告里那句"未见明显异常"——AI 看到的就是字面意思，但医生知道，那一句话背后是十年才能学会的"看哪里不要紧"。';

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

function dividerLabel(round: number): '初评' | '互评' {
  return round === 1 ? '初评' : '互评';
}

function isMockError(message: string | null): boolean {
  if (!message) return false;
  return message.includes('402') || message.includes('余额');
}

export function PersonaTab({ selection }: PersonaTabProps) {
  const selectionText = selection?.text ?? DEFAULT_SELECTION_TEXT;

  const [items, setItems] = useState<StreamItem[]>([]);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedFixedIds, setSelectedFixedIds] = useState<Set<string>>(
    () => new Set(FIXED_MASKS.map((m) => m.id))
  );
  const [customMasks, setCustomMasks] = useState<CustomMask[]>([]);
  const [selectedCustomIds, setSelectedCustomIds] = useState<Set<string>>(() => new Set());
  const [rounds, setRounds] = useState<1 | 2 | 3>(1);

  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [followupInput, setFollowupInput] = useState<string>('');
  const [isComposing, setIsComposing] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);

  const selectedFixed: MaskMeta[] = FIXED_MASKS.filter((m) => selectedFixedIds.has(m.id));
  const selectedCustom: CustomMask[] = customMasks.filter((m) => selectedCustomIds.has(m.id));
  const totalSelected = selectedFixed.length + selectedCustom.length;
  const roundSelectorDisabled = totalSelected <= 1;
  const effectiveRounds: 1 | 2 | 3 = roundSelectorDisabled ? 1 : rounds;

  // serialize Set deps for useEffect
  const fixedKey = [...selectedFixedIds].sort().join(',');
  const customKey = [...selectedCustomIds].sort().join(',');
  const customMasksKey = customMasks.map((m) => `${m.id}:${m.label}:${m.description}`).join('|');

  // The initial-rounds run, hoisted out of useEffect so the user-facing "重试"
  // button can re-fire it without remounting the panel. Safe to call any time
  // — it aborts the prior controller, resets state, and starts fresh.
  const runRoundsRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!selectionText) return;

    const startRun = async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setItems([]);
      setError(null);
      setStreaming(true);
      // Clear any prior global toast — fresh slate for this run.
      useAiErrorStore.getState().dismiss();

      try {
        const res = await fetchWithErrorToast('/api/agents/persona-panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selection: selectionText,
            fixedIds: [...selectedFixedIds],
            custom: selectedCustom,
            rounds: effectiveRounds,
            mode: 'rounds',
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          if (!ctrl.signal.aborted) {
            setError(`status ${res.status}`);
            setStreaming(false);
          }
          return;
        }
        for await (const ev of readSse(res)) {
          if (ctrl.signal.aborted) return;
          try {
            const payload = JSON.parse(ev.data) as Record<string, unknown>;
            if (ev.event === 'round-start') {
              const round = typeof payload.round === 'number' ? payload.round : 1;
              setItems((s) => [
                ...s,
                { kind: 'divider', round, label: dividerLabel(round) },
              ]);
            } else if (ev.event === 'message') {
              const msg = payload as unknown as PMsg;
              setItems((s) => [...s, { kind: 'msg', msg }]);
            } else if (ev.event === 'round-end') {
              // no-op
            } else if (ev.event === 'error') {
              const msg = typeof payload.message === 'string' ? payload.message : 'stream error';
              const fallback = Array.isArray(payload.fallback)
                ? (payload.fallback as PMsg[])
                : [];
              const next: StreamItem[] = [];
              if (fallback.length > 0) {
                next.push({ kind: 'divider', round: 1, label: '初评' });
                next.push({ kind: 'fallback-banner', message: msg });
                fallback.forEach((m) => next.push({ kind: 'msg', msg: m }));
              }
              setItems(next);
              setError(msg);
              // Stop the typing indicator — the stream errored. Tab stays
              // mounted so the user can read the error and click 重试.
              setStreaming(false);
            } else if (ev.event === 'done') {
              setStreaming(false);
            }
          } catch {
            // ignore malformed event data
          }
        }
        if (!ctrl.signal.aborted) setStreaming(false);
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError((err as Error).message);
        setStreaming(false);
      }
    };

    runRoundsRef.current = startRun;
    void startRun();

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionText, fixedKey, customKey, customMasksKey, effectiveRounds]);

  const handleToggleFixed = (id: string) => {
    setSelectedFixedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleCustom = (id: string) => {
    setSelectedCustomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddCustom = (m: CustomMask) => {
    setCustomMasks((prev) => [...prev, m]);
    setSelectedCustomIds((prev) => {
      const next = new Set(prev);
      next.add(m.id);
      return next;
    });
    setIsAddingCustom(false);
  };

  const handleDeleteCustom = (id: string) => {
    setCustomMasks((prev) => prev.filter((m) => m.id !== id));
    setSelectedCustomIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const submitFollowup = async () => {
    const text = followupInput.trim();
    if (!text || streaming) return;

    const history = items.flatMap((it) => (it.kind === 'msg' ? [it.msg] : []));
    setItems((s) => [...s, { kind: 'user', text }]);
    setFollowupInput('');
    setStreaming(true);
    setError(null);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    useAiErrorStore.getState().dismiss();
    try {
      const res = await fetchWithErrorToast('/api/agents/persona-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selection: selectionText,
          fixedIds: [...selectedFixedIds],
          custom: selectedCustom,
          mode: 'followup',
          history,
          userMessage: text,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        if (!ctrl.signal.aborted) {
          setError(`status ${res.status}`);
          setStreaming(false);
        }
        return;
      }
      for await (const ev of readSse(res)) {
        if (ctrl.signal.aborted) return;
        try {
          const payload = JSON.parse(ev.data) as Record<string, unknown>;
          if (ev.event === 'routing') {
            // could log; currently a no-op
          } else if (ev.event === 'message') {
            const msg = payload as unknown as PMsg;
            setItems((s) => [...s, { kind: 'msg', msg }]);
          } else if (ev.event === 'error') {
            const msg = typeof payload.message === 'string' ? payload.message : 'stream error';
            const fallback = Array.isArray(payload.fallback)
              ? (payload.fallback as PMsg[])
              : [];
            setItems((s) => {
              const additions: StreamItem[] = [];
              if (fallback.length > 0) {
                additions.push({ kind: 'fallback-banner', message: msg });
                fallback.forEach((m) => additions.push({ kind: 'msg', msg: m }));
              }
              return [...s, ...additions];
            });
            setError(msg);
          } else if (ev.event === 'done') {
            setStreaming(false);
          }
        } catch {
          // ignore
        }
      }
      if (!ctrl.signal.aborted) setStreaming(false);
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      setError((err as Error).message);
      setStreaming(false);
    }
  };

  const handleFollowupKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    if (isComposing) return;
    e.preventDefault();
    void submitFollowup();
  };

  const allSelectedMasks: Array<MaskMeta | CustomMask> = [...selectedFixed, ...selectedCustom];
  const mockBadge = isMockError(error) ? ' [mock data — DeepSeek 余额不足]' : '';

  return (
    <div
      data-testid="persona-tab"
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
      {/* Header strip — non-draggable (events stop here) */}
      <div
        data-testid="persona-header"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          flexShrink: 0,
          padding: '10px 14px 8px',
          borderBottom: '1px solid rgba(23,114,246,0.18)',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* stacked avatars */}
          <div
            data-testid="persona-stacked-avatars"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            {allSelectedMasks.map((m, i) => {
              const foxId: FoxId = ('fox' in m ? m.fox : 'wen') as FoxId;
              const f = FOX_BY_ID[foxId];
              const avatarStyle: CSSProperties = {
                width: 22,
                height: 22,
                borderRadius: 11,
                background: f.glow,
                color: '#fff',
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: i === 0 ? 0 : -6,
                border: '1.5px solid #fff',
                boxShadow: `0 0 4px ${f.glowSoft}55`,
                zIndex: allSelectedMasks.length - i,
              };
              return (
                <div key={m.id} title={m.label} style={avatarStyle}>
                  {f.initial}
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#1A1F2A',
                fontFamily: '"Noto Serif SC", serif',
              }}
            >
              读者团 · 四人格评议
            </div>
            <div
              style={{
                fontSize: 9.5,
                color: '#7A8B9F',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: 0.4,
              }}
            >
              {totalSelected} PERSONAS · 内存 12 轮
            </div>
          </div>
          <RoundSelector
            value={effectiveRounds}
            onChange={(v) => setRounds(v)}
            disabled={roundSelectorDisabled}
          />
        </div>
        <MaskChipRow
          fixed={FIXED_MASKS as Array<{ id: string; label: string; hint: string; fox: 'wen' }>}
          custom={customMasks}
          selectedFixedIds={selectedFixedIds}
          selectedCustomIds={selectedCustomIds}
          onToggleFixed={handleToggleFixed}
          onToggleCustom={handleToggleCustom}
          onAddCustom={() => setIsAddingCustom(true)}
          onDeleteCustom={handleDeleteCustom}
        />
      </div>

      {/* Selection quote pane */}
      <div
        data-testid="persona-quote"
        style={{
          flexShrink: 0,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(23,114,246,0.18)',
          background: 'rgba(23,114,246,0.06)',
          fontSize: 11.5,
          color: '#5A6270',
          fontFamily: '"Noto Serif SC", serif',
          display: 'flex',
          gap: 8,
        }}
      >
        <span
          style={{
            color: '#7A8B9F',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            marginTop: 2,
            flexShrink: 0,
            letterSpacing: 0.5,
          }}
        >
          SEL
        </span>
        <span style={{ flex: 1, fontStyle: 'italic' }}>{selectionText}</span>
      </div>

      {/* Message list */}
      <div
        data-testid="persona-message-list"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {items.map((it, i) => {
          if (it.kind === 'divider') {
            return (
              <RoundDivider key={`d-${i}-${it.round}`} round={it.round} label={it.label} />
            );
          }
          if (it.kind === 'user') {
            return <UserBubble key={`u-${i}`} text={it.text} />;
          }
          if (it.kind === 'fallback-banner') {
            return (
              <div
                key={`fb-${i}`}
                data-testid="persona-fallback-banner"
                title={it.message}
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
                {FALLBACK_BANNER_TEXT}
              </div>
            );
          }
          return (
            <PersonaMessage
              key={it.msg.id ?? `m-${i}`}
              id={it.msg.id}
              round={it.msg.round}
              foxId={it.msg.foxId}
              mask={it.msg.mask}
              text={it.msg.text}
              tags={it.msg.tags}
              replyToMask={it.msg.replyToMask}
              agree={it.msg.agree}
              time={it.msg.time}
            />
          );
        })}

        {/* 看心 typing indicator */}
        <div
          data-testid="persona-typing-indicator"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            color: '#7A8B9F',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 0.4,
            paddingTop: 4,
          }}
        >
          <Dot delay={0} />
          <Dot delay={0.2} />
          <Dot delay={0.4} />
          <span>看心 正在审阅…</span>
        </div>
      </div>

      {/* Custom mask form (inline, when adding) */}
      {isAddingCustom && (
        <div
          style={{
            flexShrink: 0,
            padding: '8px 14px',
            borderTop: '1px solid rgba(23,114,246,0.18)',
            background: '#F4F7FB',
          }}
        >
          <CustomMaskForm
            onAdd={handleAddCustom}
            onCancel={() => setIsAddingCustom(false)}
          />
        </div>
      )}

      {/* Followup input row */}
      <div
        style={{
          flexShrink: 0,
          padding: '8px 14px',
          borderTop: '1px solid rgba(23,114,246,0.18)',
          background: '#fff',
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <input
          data-testid="persona-followup-input"
          type="text"
          value={followupInput}
          disabled={streaming}
          placeholder="向读者团追问…"
          onChange={(e) => setFollowupInput(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={handleFollowupKeyDown}
          style={{
            flex: 1,
            border: '1px solid rgba(23,114,246,0.18)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            color: '#1A1F2A',
            background: streaming ? '#F4F7FB' : '#fff',
            outline: 'none',
            fontFamily: '"Noto Sans SC", sans-serif',
          }}
        />
        <button
          data-testid="persona-followup-send"
          type="button"
          disabled={streaming || followupInput.trim().length === 0}
          onClick={() => void submitFollowup()}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: 'none',
            background:
              streaming || followupInput.trim().length === 0
                ? 'rgba(23,114,246,0.30)'
                : '#1772F6',
            color: '#fff',
            fontSize: 12,
            cursor:
              streaming || followupInput.trim().length === 0 ? 'not-allowed' : 'pointer',
            fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >
          发送
        </button>
      </div>

      {error && !isMockError(error) && (
        <div
          data-testid="persona-error-banner"
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            background: 'rgba(192,48,40,0.08)',
            color: '#C03028',
            fontSize: 10.5,
            fontFamily: 'JetBrains Mono, monospace',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderTop: '1px solid rgba(192,48,40,0.20)',
          }}
        >
          <span style={{ flex: 1 }}>出错了，请重试 · {error}</span>
          <button
            data-testid="persona-retry"
            type="button"
            onClick={() => void runRoundsRef.current()}
            style={{
              fontSize: 10.5,
              padding: '3px 10px',
              borderRadius: 3,
              border: '1px solid rgba(192,48,40,0.45)',
              background: '#fff',
              color: '#C03028',
              cursor: 'pointer',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            重试
          </button>
        </div>
      )}

      <ComplianceLine>
        {COMPLIANCE_TEXT}
        {mockBadge}
      </ComplianceLine>
    </div>
  );
}

export type { PersonaTabProps };
