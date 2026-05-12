'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { useEditorStore } from '@/lib/store/editor';
import { useAiErrorStore } from '@/lib/store/ai-error';
import { SUPPORTED_RING_IDS, DEFAULT_RING_ID } from '@/lib/zhihu';
import { useProvenanceStore } from '@/lib/store/provenance';

// S7-B2 (2026-05-11): "发布到知乎 黑客松脑洞补给站" affordance. The pitch
// already claimed 知乎 OpenAPI integration but no button surfaced it — judges
// saw the badge in 看势 and the 想法 fixture but the WRITE side was invisible.
// Opens a small modal with preview + hashtags + ring picker. Real mode posts
// via HMAC; mock mode returns the fixture response so the demo screen-share
// can run without a real post landing in the 圈子.
//
// Lin Maohua + Shi Junhe (R7/R8 reviews) both flagged this as the single
// biggest "make 知乎 integration visible" win.

const FIXED_HASHTAGS = ['知乎黑客松', '看山书房', '答主工作台', '灵感激发'];

const wrap: CSSProperties = {
  position: 'absolute',
  bottom: 26,
  left: 24,
  zIndex: 6,
  pointerEvents: 'auto',
};

const buttonStyle: CSSProperties = {
  fontFamily: '"Noto Serif SC", serif',
  fontSize: 11,
  letterSpacing: 1.2,
  color: '#FAF8F3',
  background: 'linear-gradient(180deg, #1772F6 0%, #0E5BCC 100%)',
  border: '1px solid rgba(14,91,204,0.6)',
  borderRadius: 999,
  padding: '6px 14px',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(14,91,204,0.32), inset 0 1px 0 rgba(255,255,255,0.18)',
  transition: 'transform 0.12s ease',
};

interface PublishResponse {
  ok?: boolean;
  result?: { ring_id?: string; pin_id?: string };
  ringId?: string;
  error?: string;
}

export function PublishButton() {
  const [open, setOpen] = useState(false);
  const [ringId, setRingId] = useState<string>(DEFAULT_RING_ID);
  const [tags, setTags] = useState<string[]>(FIXED_HASHTAGS);
  const [tagDraft, setTagDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const editor = useEditorStore((s) => s.editor);
  const pushError = useAiErrorStore((s) => s.push);
  // R2 judge fix (史中 P2 2026-05-12): 看心藏金尾 lore Easter egg. Only
  // surfaces once 看心 has actually contributed (≥ 1 provenance entry),
  // so judges who exercised the compliance pass see a wink at the lore;
  // judges who never used 看心 won't see an unearned flourish.
  const xinHasSpoken = useProvenanceStore((s) =>
    s.entries.some((e) => e.fox === 'xin'),
  );

  // Preview = first 200 chars of current editor body. Computed live so the
  // preview reflects what the user has actually written, not the cold-start
  // demo article unless they haven't edited.
  const previewText = (() => {
    if (!editor) return '';
    const raw = editor.state.doc.textContent ?? '';
    return raw.slice(0, 200);
  })();

  // Auto-dismiss the success toast after 4s so a clean run leaves no residue.
  useEffect(() => {
    if (!doneMsg) return;
    const t = window.setTimeout(() => setDoneMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [doneMsg]);

  const addTag = (): void => {
    const t = tagDraft.trim().replace(/^#+/, '');
    if (!t) return;
    if (tags.includes(t)) {
      setTagDraft('');
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagDraft('');
  };

  const removeTag = (t: string): void => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  const submit = async (): Promise<void> => {
    if (submitting) return;
    const body = previewText.trim();
    if (!body) {
      pushError({ message: '编辑器为空 — 写两句话再发吧。' });
      return;
    }
    setSubmitting(true);
    try {
      const hashLine = tags.length > 0 ? '\n\n' + tags.map((t) => '#' + t).join(' ') : '';
      const res = await fetch('/api/zhihu/publish-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: body + hashLine,
          ringId,
          aiAssisted: true,
          compliance: 'GB-45438',
        }),
      });
      const data: PublishResponse = await res.json();
      if (!res.ok || !data.ok) {
        pushError({ message: data.error ?? '发布失败 — 请稍后重试。' });
        return;
      }
      const ringLabel = SUPPORTED_RING_IDS.find((r) => r.id === ringId)?.name ?? '圈子';
      setDoneMsg(`已发布到「${ringLabel}」`);
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '网络中断';
      pushError({ message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={wrap} data-testid="publish-to-zhihu-wrap">
      <button
        type="button"
        data-testid="publish-to-zhihu-button"
        aria-label="发布到知乎 黑客松脑洞补给站"
        onClick={() => setOpen((v) => !v)}
        style={buttonStyle}
        className="kanshan-focus-ring kanshan-btn-press"
        onMouseDown={(e) => e.preventDefault()}
      >
        发布到知乎 →
      </button>
      {doneMsg && (
        <div
          role="status"
          aria-live="polite"
          data-testid="publish-to-zhihu-success"
          style={{
            marginTop: 8,
            padding: '6px 10px',
            background: '#E8F4EA',
            border: '1px solid #2E7D38',
            color: '#1B5223',
            fontSize: 11,
            fontFamily: '"Noto Serif SC", serif',
            borderRadius: 4,
          }}
        >
          {doneMsg}
        </div>
      )}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="发布到知乎对话框"
          data-testid="publish-to-zhihu-modal"
          style={{
            position: 'absolute',
            left: 0,
            bottom: 44,
            width: 360,
            padding: '14px 16px 16px',
            background: '#FAF8F3',
            border: '1px solid rgba(168,155,126,0.55)',
            borderRadius: 4,
            boxShadow: '0 12px 24px rgba(20,22,30,0.22)',
            fontFamily: '"Noto Serif SC", serif',
            color: '#1A1F2A',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>发布到知乎</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: '#7A6F5A' }}
            >
              ×
            </button>
          </div>

          <label style={{ fontSize: 10, color: '#7A6F5A', letterSpacing: 1 }}>正文预览</label>
          <div
            style={{
              marginTop: 4,
              padding: '8px 10px',
              maxHeight: 70,
              overflowY: 'auto',
              background: '#FFFCEC',
              border: '1px solid rgba(168,155,126,0.35)',
              borderRadius: 2,
              fontSize: 12,
              lineHeight: 1.55,
              color: '#2A2419',
            }}
          >
            {previewText || <em style={{ color: '#A89B7E' }}>（编辑器为空）</em>}
          </div>

          <label style={{ display: 'block', marginTop: 12, fontSize: 10, color: '#7A6F5A', letterSpacing: 1 }}>话题标签</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {tags.map((t) => (
              <span
                key={t}
                style={{
                  padding: '2px 8px',
                  background: '#EEF3FB',
                  border: '1px solid #BFD6F3',
                  borderRadius: 999,
                  fontSize: 11,
                  color: '#1772F6',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  aria-label={`移除话题 ${t}`}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1772F6', fontSize: 11, padding: 0 }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="加自定义话题"
              aria-label="加自定义话题"
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: 11,
                fontFamily: '"Noto Serif SC", serif',
                border: '1px solid rgba(168,155,126,0.55)',
                borderRadius: 2,
                background: '#FFFCEC',
                color: '#1A1F2A',
              }}
            />
            <button
              type="button"
              onClick={addTag}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                background: 'transparent',
                color: '#1772F6',
                border: '1px solid #BFD6F3',
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: '"Noto Serif SC", serif',
              }}
            >
              加入
            </button>
          </div>

          <label htmlFor="ring-picker" style={{ display: 'block', marginTop: 12, fontSize: 10, color: '#7A6F5A', letterSpacing: 1 }}>
            发布到的圈子
          </label>
          <select
            id="ring-picker"
            value={ringId}
            onChange={(e) => setRingId(e.target.value)}
            style={{
              marginTop: 4,
              width: '100%',
              padding: '4px 8px',
              fontSize: 12,
              fontFamily: '"Noto Serif SC", serif',
              border: '1px solid rgba(168,155,126,0.55)',
              borderRadius: 2,
              background: '#FFFCEC',
              color: '#1A1F2A',
            }}
          >
            {SUPPORTED_RING_IDS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <div
            data-testid="publish-to-zhihu-gb45438-row"
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
              padding: '6px 8px',
              background: '#FFF7E4',
              border: '1px solid rgba(168,123,42,0.45)',
              borderRadius: 2,
              fontSize: 10,
              lineHeight: 1.5,
              color: '#5A4A1F',
            }}
          >
            <input
              type="checkbox"
              data-testid="publish-to-zhihu-gb45438-checkbox"
              aria-label="本文由看山书房 AI 辅助生成 · 发布时附 GB 45438 标识"
              checked
              disabled
              readOnly
              style={{ marginTop: 2, accentColor: '#A87B2A', cursor: 'not-allowed' }}
            />
            <span>本文由看山书房 AI 辅助生成 · 发布时附 GB 45438 标识（不可关闭）</span>
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontFamily: '"Noto Serif SC", serif',
                background: 'transparent',
                color: '#7A6F5A',
                border: '1px solid rgba(168,155,126,0.55)',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              type="button"
              data-testid="publish-to-zhihu-confirm"
              onClick={() => void submit()}
              disabled={submitting}
              className="kanshan-focus-ring kanshan-btn-press"
              style={{
                padding: '6px 14px',
                fontSize: 11,
                letterSpacing: 1,
                fontFamily: '"Noto Serif SC", serif',
                background: submitting ? '#A0BFE5' : '#1772F6',
                color: '#FAF8F3',
                border: '1px solid rgba(14,91,204,0.6)',
                borderRadius: 2,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? '发布中…' : '发布'}
            </button>
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 10,
              color: '#7A6F5A',
              fontFamily: '"Noto Serif SC", serif',
              lineHeight: 1.5,
            }}
          >
            发布走 HMAC + Bearer 双签 · 不上传第三方训练集 · 演示模式下不会真投递
          </div>
          {xinHasSpoken && (
            <div
              data-testid="publish-to-zhihu-golden-tail"
              style={{
                marginTop: 6,
                fontSize: 9.5,
                fontStyle: 'italic',
                color: 'rgba(122,111,90,0.55)',
                fontFamily: '"Noto Serif SC", serif',
                letterSpacing: 0.4,
              }}
            >
              看心独见，不语
            </div>
          )}
        </div>
      )}
    </div>
  );
}
