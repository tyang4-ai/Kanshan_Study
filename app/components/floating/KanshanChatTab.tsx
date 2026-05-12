'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useFloatingWindowStore, type TabKind } from '@/lib/store/floating-window';
import { useCorkboardStore } from '@/lib/store/corkboard';
import type { KanshanTool, KanshanToolCall } from '@/lib/agents/kanshan-router';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { FOX_BY_ID } from '@/lib/foxes/registry';

// Compliance copy locked per persona-review #13.99 (2026-05-09).
// Asserts only what the architecture actually does:
//   - cache layer (lib/cache/store) stores the conversation hash + reply,
//     scoped to demo replay; not shared with third-party training pipelines.
//   - history is NOT persisted to localStorage; lives in component state only.
const KANSHAN_COMPLIANCE = '对话仅用于本次差遣 · 不入第三方训练集 · 历史不本地保存';

const FALLBACK_REPLY = '看山一时未通 — 请稍后重试。';

interface ChatTurn {
  role: 'user' | 'kanshan';
  content: string;
  toolCall?: KanshanToolCall;
  ts: number;
}

const TOOL_LABEL: Record<KanshanTool, string> = {
  open_research: '打开看水 · 深度研究',
  open_trends: '打开看势 · 热榜雷达',
  open_vault: '打开看典 · 档案库',
  open_persona: '召集看文 · 读者反应',
  open_debate: '召集看文/看纹 · 辩论',
  pin_to_corkboard: '钉到便签板',
  run_compliance_check: '让看心审一遍',
};

const TOOL_TAB: Record<KanshanTool, { kind: TabKind; title: string } | null> = {
  open_research: { kind: 'research', title: '看水 · 深度研究' },
  open_trends: { kind: 'trends', title: '看势 · 热榜雷达' },
  open_vault: { kind: 'vault', title: '看典 · 档案库' },
  open_persona: { kind: 'persona', title: '看文 · 读者反应' },
  open_debate: { kind: 'debate', title: '看文 · 看纹辩论' },
  pin_to_corkboard: null,
  run_compliance_check: null,
};

// S7-B1 (2026-05-11): the orchestrator's multi-agent dispatch was invisible
// — looked like a single LLM with 9 buttons. Map each tool to the visible
// fox(es) it routes to so the CoT animation can name them by glyph + glow.
const TOOL_FOX: Record<KanshanTool, { label: string; glow: string }> = {
  open_research: { label: '看水', glow: FOX_BY_ID.shui.glow },
  open_trends: { label: '看势', glow: FOX_BY_ID.shi.glow },
  open_vault: { label: '看典', glow: FOX_BY_ID.dian.glow },
  open_persona: { label: '看文', glow: FOX_BY_ID.wen.glow },
  open_debate: { label: '看文 + 看纹', glow: FOX_BY_ID.wen2.glow },
  pin_to_corkboard: { label: '看典', glow: FOX_BY_ID.dian.glow },
  run_compliance_check: { label: '看心', glow: FOX_BY_ID.xin.glow },
};

interface CotState {
  toolLabel: string;
  foxLabel: string;
  foxGlow: string;
  phase: 'reasoning' | 'dispatching';
}

export function KanshanChatTab() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [streaming, setStreaming] = useState(false);
  // S7-B1 (2026-05-11): chain-of-thought animation. Visible between the
  // kanshan reply and the actual dispatch so judges see the orchestrator
  // route to a specific fox — multi-agent moves from invisible to legible.
  const [cot, setCot] = useState<CotState | null>(null);
  const sendingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const openTab = useFloatingWindowStore((s) => s.openTab);
  const addPin = useCorkboardStore((s) => s.addPin);

  // Auto-scroll to bottom on new turn
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns.length, streaming, cot]);

  const dispatchTool = (toolCall: KanshanToolCall, replyText: string) => {
    const target = TOOL_TAB[toolCall.tool];
    if (target) {
      const args = toolCall.args ?? {};
      const props: Record<string, unknown> = {};
      if (typeof args.query === 'string') props.preloadQuery = args.query;
      openTab(target.kind, target.title, props);
      return;
    }
    if (toolCall.tool === 'pin_to_corkboard') {
      const args = toolCall.args ?? {};
      const title = typeof args.title === 'string' ? args.title : replyText.slice(0, 40);
      const snippet = typeof args.snippet === 'string' ? args.snippet : undefined;
      addPin({
        kind: 'note',
        content: { title, snippet, annotation: replyText },
        createdBy: 'kanshan',
        w: 180,
        h: 100,
      });
      return;
    }
    if (toolCall.tool === 'run_compliance_check') {
      // Compliance is a silent sweep; for the chat surface we just acknowledge.
      // Real wiring lands in plan #14 once 看心 has a dedicated tab kind.
      return;
    }
  };

  const send = async () => {
    if (sendingRef.current) return;
    const text = draft.trim();
    if (!text) return;
    sendingRef.current = true;
    setStreaming(true);
    setDraft('');
    // R9-S3 (Shi Junhe, 2026-05-11): show the CoT 'reasoning' banner the
    // moment the user hits send — not after the 5s LLM call returns. We
    // don't yet know which fox; render a neutral "看山 思考中…" line, then
    // upgrade to 'dispatching' (with the fox's name + glow) once the
    // tool_call event arrives.
    setCot({ toolLabel: '', foxLabel: '', foxGlow: 'rgba(168,155,126,0.5)', phase: 'reasoning' });
    const userTurn: ChatTurn = { role: 'user', content: text, ts: Date.now() };
    const historyForRequest = turns.map((t) => ({
      role: t.role,
      content: t.content,
    }));
    setTurns((prev) => [...prev, userTurn]);

    try {
      const res = await fetch('/api/agents/kanshan/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyForRequest, userMessage: text }),
      });
      if (!res.ok || !res.body) {
        setTurns((prev) => [
          ...prev,
          { role: 'kanshan', content: FALLBACK_REPLY, ts: Date.now() },
        ]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let replyText: string | null = null;
      let toolCall: KanshanToolCall | undefined;

      const processFrame = (frame: string) => {
        const lines = frame.split('\n');
        let event = '';
        let dataLine = '';
        for (const ln of lines) {
          if (ln.startsWith('event:')) event = ln.slice(6).trim();
          else if (ln.startsWith('data:')) dataLine = ln.slice(5).trim();
        }
        if (!event || !dataLine) return;
        try {
          const data = JSON.parse(dataLine);
          if (event === 'reply' && typeof data.text === 'string') {
            replyText = data.text;
          } else if (event === 'tool_call') {
            toolCall = data as KanshanToolCall;
          }
        } catch {
          // ignore malformed frame
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const f of frames) processFrame(f);
      }

      if (replyText) {
        const reply: ChatTurn = {
          role: 'kanshan',
          content: replyText,
          toolCall,
          ts: Date.now(),
        };
        setTurns((prev) => [...prev, reply]);
        if (toolCall) {
          // S7-B1 (revised after R9-S3, Shi Junhe 2026-05-11): CoT animation
          // previously fired AFTER the LLM call returned, so judges sat through
          // 5s of "看山想想…" silence before seeing the fox-routing moment.
          // Now we set the 'reasoning' phase eagerly when the send button
          // fires (see send()), and only transition to 'dispatching' here once
          // we know which fox. The whole moment lands AS the LLM call ends.
          const fox = TOOL_FOX[toolCall.tool];
          const target = TOOL_TAB[toolCall.tool];
          const toolLabel = target?.title ?? TOOL_LABEL[toolCall.tool];
          setCot({ toolLabel, foxLabel: fox.label, foxGlow: fox.glow, phase: 'dispatching' });
          setTimeout(() => {
            dispatchTool(toolCall!, replyText!);
            // L9-1 (Lin Maohua R9, 2026-05-11): "唤起 看水" pill needs to linger
            // 2s past dispatch so judges on Tencent Meeting screen-share have
            // time to register the orchestration moment. Without the linger
            // the panel-open animation steals attention from the CoT label.
          }, 400);
          setTimeout(() => setCot(null), 2400);
        } else {
          // No tool call — clear any reasoning state set on send.
          setCot(null);
        }
      }
    } catch {
      setTurns((prev) => [
        ...prev,
        { role: 'kanshan', content: '网络中断 — 请稍后重试。', ts: Date.now() },
      ]);
      setCot(null);
    } finally {
      setStreaming(false);
      sendingRef.current = false;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (composing || e.nativeEvent.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  // Persona-fix #1 (2026-05-09): when chat fails for "no key configured",
  // give the user a one-click path back to the OnboardingGate. Clearing the
  // localStorage key is what makes the gate re-mount on next render.
  const resetOnboardingAndReload = () => {
    try {
      window.localStorage.removeItem('kanshan-onboarding');
      // Also clear the provider/account cookies that gate routing decisions.
      document.cookie = 'kanshan-provider=; path=/; max-age=0';
    } catch {
      /* localStorage unavailable in some sandboxes — silently skip */
    }
    window.location.reload();
  };

  const containerStyle: CSSProperties = {
    width: '100%', height: '100%',
    background: '#FAFBFD',
    display: 'flex', flexDirection: 'column',
    fontFamily: '"Noto Sans SC", -apple-system, sans-serif',
    overflow: 'hidden',
    color: '#1A1F2A',
  };

  const headerStyle: CSSProperties = {
    flexShrink: 0,
    padding: '10px 14px',
    background: 'linear-gradient(180deg, #2C4258 0%, #1F2F40 100%)',
    display: 'flex', alignItems: 'center', gap: 12,
  };

  const bodyStyle: CSSProperties = {
    flex: 1, overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 12,
    background: '#FAFBFD',
  };

  const composerStyle: CSSProperties = {
    flexShrink: 0,
    padding: 12,
    borderTop: '1px solid rgba(168,155,126,0.25)',
    background: '#fff',
    display: 'flex', gap: 10, alignItems: 'flex-end',
  };

  return (
    <div style={containerStyle} data-testid="kanshan-chat-tab">
      <div style={headerStyle}>
        {/* R9-S1 (Shi Junhe R9, 2026-05-11): the bubble carries the 刘看山
            portrait but opening the chat dropped to the old '山' glyph —
            brand inconsistency, "fox disappears once you open the chat".
            Mirror the bubble's CSS-sprite crop of the 四视图 sheet. */}
        <div
          aria-hidden
          style={{
            width: 28, height: 28, borderRadius: 14,
            background: '#FAF8F3',
            backgroundImage: 'url(/foxes/shan-fourview.png)',
            backgroundSize: '400% 100%',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
            border: '1px solid rgba(168,155,126,0.6)',
            boxShadow: '0 0 8px rgba(168,155,126,0.5)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1.5,
            fontFamily: '"Noto Serif SC", serif', color: '#E8EEF5' }}>
            看山 · 编排
          </div>
          <div style={{ fontSize: 10, color: '#8FA1B6', marginTop: 1,
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.4 }}>
            ORCHESTRATOR · 听话差遣
          </div>
        </div>
      </div>

      <div ref={scrollRef} style={bodyStyle} data-testid="kanshan-chat-body">
        {turns.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'rgba(26,31,42,0.5)',
            fontSize: 12, fontFamily: '"Noto Serif SC", serif',
            padding: '40px 0',
          }}>
            让看山想想 — 「找点研究」「召个读者」「钉一张便签」…
          </div>
        )}
        {turns.map((t, i) => {
          const showHint = t.role === 'kanshan' && t.content === FALLBACK_REPLY;
          return (
            <div key={t.ts + '-' + i}>
              <ChatBubble turn={t} />
              {showHint && (
                <div data-testid="kanshan-chat-fallback-hint" style={{
                  alignSelf: 'flex-start', maxWidth: '85%',
                  marginTop: 6, fontSize: 11, color: '#7A6F5A',
                  fontFamily: '"Noto Serif SC", serif', lineHeight: 1.5,
                }}>
                  你的密钥未配置，差遣未送达。{' '}
                  <button
                    type="button"
                    data-testid="kanshan-chat-reopen-onboarding"
                    onClick={resetOnboardingAndReload}
                    style={{
                      background: 'transparent', border: 'none',
                      padding: 0, cursor: 'pointer',
                      color: '#1772F6',
                      textDecoration: 'underline',
                      fontFamily: '"Noto Serif SC", serif',
                      fontSize: 11,
                    }}
                  >
                    前往「自带 Kimi 密钥」配置
                  </button>
                  {' · 工具狐（看典 / 看势 / 看水）即使没钥匙也可以浏览。'}
                </div>
              )}
            </div>
          );
        })}
        {cot && (
          <div
            data-testid="kanshan-cot-banner"
            data-phase={cot.phase}
            style={{
              alignSelf: 'flex-start',
              maxWidth: '85%',
              marginTop: 4,
              padding: '8px 12px',
              fontSize: 12,
              fontStyle: 'italic',
              fontFamily: '"Noto Serif SC", serif',
              color: '#1A1F2A',
              background: cot.phase === 'dispatching'
                ? `linear-gradient(90deg, ${cot.foxGlow}26 0%, transparent 100%)`
                : 'rgba(168,155,126,0.10)',
              borderLeft: `2px solid ${cot.phase === 'dispatching' ? cot.foxGlow : 'rgba(168,155,126,0.55)'}`,
              borderBottom: '1px dotted rgba(168,155,126,0.35)',
              opacity: 0.95,
              transition: 'background 220ms ease, border-color 220ms ease',
            }}
          >
            {cot.phase === 'reasoning'
              ? '看山 思考中… 准备唤起合适的狐狸'
              : `正在唤起 ${cot.foxLabel} · ${cot.toolLabel}`}
          </div>
        )}
        {/* The {streaming && "看山想想…"} indicator was removed 2026-05-11
            (R9-S3 + L9-1). The CoT banner above now renders during the
            entire streaming window, so this would double-show. */}
      </div>

      <ComplianceLine>{KANSHAN_COMPLIANCE}</ComplianceLine>

      <div style={composerStyle}>
        <textarea
          data-testid="kanshan-chat-input"
          aria-label="向看山说一句话"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={handleKeyDown}
          placeholder="说点什么…(Enter 发送 · Shift+Enter 换行)"
          rows={2}
          style={{
            flex: 1,
            padding: '8px 10px',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 13,
            border: '1px solid rgba(168,155,126,0.35)',
            borderRadius: 2,
            background: '#FAFBFD',
            color: '#1A1F2A',
            outline: 'none',
            resize: 'vertical',
            minHeight: 40,
            maxHeight: 120,
          }}
        />
        <button
          data-testid="kanshan-chat-send"
          type="button"
          onClick={() => void send()}
          disabled={streaming || !draft.trim()}
          style={{
            padding: '10px 14px',
            background: streaming || !draft.trim() ? '#D1CDB7' : '#2A2419',
            color: '#FAF8F3',
            border: 'none',
            borderRadius: 2,
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 13,
            letterSpacing: 2,
            cursor: streaming || !draft.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {streaming ? '…' : '差遣 →'}
        </button>
      </div>
    </div>
  );
}

function ChatBubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === 'user';
  const align: CSSProperties = isUser
    ? { alignSelf: 'flex-end', maxWidth: '70%' }
    : { alignSelf: 'flex-start', maxWidth: '85%' };
  const bubble: CSSProperties = {
    padding: '10px 12px',
    borderRadius: 10,
    background: isUser ? '#2A2419' : '#FAF8F3',
    color: isUser ? '#FAF8F3' : '#1A1F2A',
    fontFamily: '"Noto Serif SC", serif',
    fontSize: 13,
    lineHeight: 1.6,
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    border: isUser ? 'none' : '1px solid rgba(168,155,126,0.3)',
    whiteSpace: 'pre-wrap',
  };
  return (
    <div style={align} data-testid={isUser ? 'chat-bubble-user' : 'chat-bubble-kanshan'}>
      <div style={bubble}>{turn.content}</div>
      {turn.toolCall && (
        <div style={{
          marginTop: 6, fontSize: 10, color: '#7A6F5A',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5,
        }}>
          → {TOOL_LABEL[turn.toolCall.tool]}
        </div>
      )}
    </div>
  );
}
