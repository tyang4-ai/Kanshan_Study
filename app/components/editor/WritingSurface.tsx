'use client';

import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import { Tab } from './Tab';
import { DefaultDocument } from './DefaultDocument';
import { ComplianceStamp } from './ComplianceStamp';

export type SelectionPayload = {
  text: string;
  rect: DOMRect;
};

export type WritingSurfaceProps = {
  onContextMenu?: (e: MouseEvent<HTMLDivElement>) => void;
  onSelectionChange?: (sel: SelectionPayload | null) => void;
};

type TabEntry = {
  filename: string;
  active: boolean;
  dirty: boolean;
};

const TABS: ReadonlyArray<TabEntry> = [
  { filename: '影像组学与基因组学.md', active: true, dirty: true },
  { filename: 'research-notes.md', active: false, dirty: false },
  { filename: 'readme.md', active: false, dirty: false },
];

const outerStyle: CSSProperties = {
  flex: 1,
  height: '100%',
  minWidth: 0,
  background: '#FAF8F3',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: 'inset 1px 0 0 rgba(0,0,0,0.06)',
};

const tabStripStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 0,
  background: '#EDE9DF',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
  height: 36,
  paddingLeft: 12,
  userSelect: 'none',
  fontFamily: '"Noto Sans SC", "Source Han Sans SC", sans-serif',
  overflowX: 'auto',
  overflowY: 'hidden',
  flexShrink: 0,
  scrollbarWidth: 'none',
};

const autosaveStyle: CSSProperties = {
  padding: '0 14px',
  fontSize: 11,
  color: '#7A6655',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

const scrollRegionStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  position: 'relative',
};

const documentColumnStyle: CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '40px 56px 200px',
  fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
  color: '#1A1F2A',
  lineHeight: 1.78,
  fontSize: 16,
};

export function WritingSurface({
  onContextMenu,
  onSelectionChange,
}: WritingSurfaceProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef<boolean>(false);

  // Selection tracking — surfaces selection upward, but skips while IME composing.
  useEffect(() => {
    if (!onSelectionChange) return;
    const handler = () => {
      if (isComposingRef.current) return;
      const sel: Selection | null = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        onSelectionChange(null);
        return;
      }
      const range: Range = sel.getRangeAt(0);
      if (!bodyRef.current?.contains(range.commonAncestorContainer)) {
        onSelectionChange(null);
        return;
      }
      const rect: DOMRect = range.getBoundingClientRect();
      onSelectionChange({ text: sel.toString(), rect });
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [onSelectionChange]);

  // IME composition flag — flipped on the editor body element directly.
  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    const onStart = () => {
      isComposingRef.current = true;
    };
    const onEnd = () => {
      isComposingRef.current = false;
    };
    node.addEventListener('compositionstart', onStart);
    node.addEventListener('compositionend', onEnd);
    return () => {
      node.removeEventListener('compositionstart', onStart);
      node.removeEventListener('compositionend', onEnd);
    };
  }, []);

  return (
    <div onContextMenu={onContextMenu} style={outerStyle}>
      {/* Tab strip — Obsidian-style */}
      <div style={tabStripStyle}>
        {TABS.map((t) => (
          <Tab key={t.filename} filename={t.filename} active={t.active} dirty={t.dirty} />
        ))}
        <div style={{ flex: 1, minWidth: 16 }} />
        <div style={autosaveStyle}>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: 3,
              background: '#2ECC71',
            }}
          />
          已自动保存 · 16:42
        </div>
      </div>

      {/* Scrollable document region — TipTap mounted here in plan #10; contentEditable placeholder for now. */}
      <div
        ref={bodyRef}
        contentEditable
        suppressContentEditableWarning
        data-testid="editor-body"
        style={scrollRegionStyle}
      >
        <div style={documentColumnStyle}>
          <DefaultDocument />
        </div>
      </div>

      <ComplianceStamp />
    </div>
  );
}

export default WritingSurface;
