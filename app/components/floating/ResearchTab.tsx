'use client';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useState } from 'react';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { SourceRow } from '@/components/research/SourceRow';
import {
  TrendsConfirmModal,
  isTrendsAcknowledged,
  markTrendsAcknowledged,
} from '@/components/floating/TrendsConfirmModal';
import { useEditorStore } from '@/lib/store/editor';
import { useCorkboardStore } from '@/lib/store/corkboard';
import researchDataJson from '@/content/seed/research-radiogenomics.json';
import { renderResearchBody } from '@/lib/research/sanitize';

type ResearchScope = 'quick' | 'deep' | 'thorough';

interface ResearchSource {
  kind: 'web' | 'vault' | 'zhihu';
  id: string;
  label: string;
  text: string;
  host: string;
  url?: string;
  articleId?: string;
}

interface ResearchSection {
  heading: string;
  body: string;
}

interface ResearchReport {
  title: string;
  query: string;
  scope: ResearchScope;
  outline: string[];
  sections: ResearchSection[];
  sources: ResearchSource[];
  tokenCount: number;
}

const researchData = researchDataJson as ResearchReport;

interface ResearchTabProps {
  selection?: { text: string; rect?: DOMRect } | null;
}

const SCOPES: Array<{ id: ResearchScope; label: string }> = [
  { id: 'quick', label: '快查' },
  { id: 'deep', label: '深考' },
  { id: 'thorough', label: '尽考' },
];

function H({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="research-section-heading"
      style={{
        fontSize: 13, fontWeight: 600, color: '#1772F6',
        marginTop: 14, marginBottom: 4,
        fontFamily: '"Noto Serif SC", serif',
        letterSpacing: 0.5,
      }}
    >
      {children}
    </div>
  );
}

const scopeButtonStyle = (active: boolean): CSSProperties => ({
  padding: '3px 10px', fontSize: 11, borderRadius: 3,
  border: `1px solid ${active ? '#1772F6' : 'rgba(23,114,246,0.25)'}`,
  background: active ? '#1772F6' : 'transparent',
  color: active ? '#fff' : '#1A1F2A',
  cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
});

export function ResearchTab({ selection }: ResearchTabProps) {
  const [scope, setScope] = useState<ResearchScope>(researchData.scope);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryText = selection?.text || researchData.query;

  const handleBodyClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const sup = target.closest('sup[data-cite-id]');
    if (!sup) return;
    const id = sup.getAttribute('data-cite-id');
    const source = researchData.sources.find((s) => s.id === id);
    if (source) {
      // Real navigation lands in plan #14; for now just log.
      console.log('[research-cite]', source);
    }
  };

  const performInsert = () => {
    const editor = useEditorStore.getState().editor;
    if (!editor) return;
    const html = researchData.sections.map((s) => `<h3>${s.heading}</h3>${s.body}`).join('\n');
    editor.chain().focus().insertContent(html).run();
  };

  const handleInsert = () => {
    if (isTrendsAcknowledged()) {
      performInsert();
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmInsert = () => {
    markTrendsAcknowledged();
    setConfirmOpen(false);
    performInsert();
  };

  const handleCancelInsert = () => {
    setConfirmOpen(false);
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#FAFBFD',
      fontFamily: '"Noto Serif SC", serif',
      color: '#1A1F2A',
      overflow: 'hidden',
    }}>
      {/* Scope selector + status */}
      <div style={{
        flexShrink: 0,
        padding: '8px 14px',
        borderBottom: '1px solid rgba(23,114,246,0.18)',
        background: '#F4F7FB',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 10, color: '#7A8B9F', letterSpacing: 0.5,
          fontFamily: 'JetBrains Mono, monospace' }}>SCOPE</span>
        {SCOPES.map((s) => (
          <button
            key={s.id}
            data-testid={`research-scope-${s.id}`}
            data-active={scope === s.id}
            onClick={() => setScope(s.id)}
            style={scopeButtonStyle(scope === s.id)}
          >
            {s.label}
          </button>
        ))}
        <div style={{ flex: 1 }}/>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: '#1772F6',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 3, background: '#1772F6',
            animation: 'pulse 1.4s ease-in-out infinite',
          }}/>
          已就位
        </span>
      </div>

      {/* Title + query */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px 8px',
        borderBottom: '1px solid rgba(23,114,246,0.10)',
      }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: '#1A1F2A',
          fontFamily: '"Noto Serif SC", serif', lineHeight: 1.4 }}>
          {researchData.title}
        </div>
        <div
          data-testid="research-query"
          style={{ fontSize: 10, color: '#7A8B9F', marginTop: 6,
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.4 }}
        >
          看水 · 灵感激发 → 深度考据 · 「{queryText}」 · {researchData.sources.length} sources · {(researchData.tokenCount / 1000).toFixed(1)}k tok
        </div>
      </div>

      {/* Outline chips */}
      <div style={{
        flexShrink: 0,
        padding: '8px 16px',
        borderBottom: '1px solid rgba(23,114,246,0.10)',
        display: 'flex', gap: 6, flexWrap: 'wrap',
      }}>
        {researchData.outline.map((c, i) => (
          <span
            key={i}
            data-testid="research-outline-chip"
            style={{
              fontSize: 10.5, padding: '2px 8px', borderRadius: 12,
              background: '#E8F1FE', color: '#1772F6',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Report body */}
      <div
        onClick={handleBodyClick}
        style={{
          flex: 1, overflowY: 'auto',
          padding: '14px 18px',
          fontSize: 13, lineHeight: 1.85,
          fontFamily: '"Noto Serif SC", serif',
        }}
      >
        {researchData.sections.map((section, i) => (
          <div key={i}>
            <H>{section.heading}</H>
            <div>{renderResearchBody(section.body)}</div>
          </div>
        ))}
      </div>

      {/* Sources rail */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid rgba(23,114,246,0.18)',
        background: '#F4F7FB',
        padding: '8px 14px',
        maxHeight: 130, overflowY: 'auto',
      }}>
        <div style={{ fontSize: 9.5, color: '#7A8B9F', letterSpacing: 0.6,
          fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
          SOURCES · 三种 出处 · 全部可点
        </div>
        {researchData.sources.map((s) => (
          <SourceRow
            key={s.id}
            source={s}
            onClick={() => {
              console.log('[research-source]', s);
            }}
            onPin={() => {
              useCorkboardStore.getState().addPin({
                kind: 'research',
                sourceId: s.id,
                content: { title: s.text, snippet: s.host, url: s.url },
                createdBy: 'user',
                w: 180,
                h: 130,
              });
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        padding: '8px 14px',
        borderTop: '1px solid rgba(23,114,246,0.18)',
        background: '#F4F7FB',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          data-testid="research-followup"
          onClick={() => console.log('[research] 追加查证')}
          style={{
            fontSize: 11, padding: '5px 10px', borderRadius: 3,
            border: '1px solid rgba(23,114,246,0.25)',
            background: 'transparent', color: '#1A1F2A',
            cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >追加查证</button>
        <button
          data-testid="research-export"
          onClick={() => console.log('[research] 导出 .md')}
          style={{
            fontSize: 11, padding: '5px 10px', borderRadius: 3,
            border: '1px solid rgba(0,106,78,0.25)',
            background: 'transparent', color: '#1A1815',
            cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >导出 .md</button>
        <div style={{ flex: 1 }}/>
        <button
          data-testid="research-insert"
          onClick={handleInsert}
          style={{
            fontSize: 11, padding: '5px 14px', borderRadius: 3,
            border: 'none', background: '#1772F6', color: '#fff',
            cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
            fontWeight: 500,
          }}
        >插入正文 ↵</button>
      </div>
      <ComplianceLine>引用全部实时检索 · 不入训练集</ComplianceLine>

      <TrendsConfirmModal
        open={confirmOpen}
        onConfirm={handleConfirmInsert}
        onCancel={handleCancelInsert}
      />
    </div>
  );
}
