import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { InlineVoiceMark } from '@/components/voice/InlineVoiceMark';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

describe('InlineVoiceMark', () => {
  beforeEach(() => {
    useFloatingWindowStore.setState({
      open: false,
      tabs: [],
      activeTabId: null,
      pos: { x: 240, y: 80 },
      size: { w: 480, h: 600 },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders children with seafoam underline styling', () => {
    render(
      <InlineVoiceMark sourceTitle="跨机构验证" sourceDate="2024-01" sourceArticleId="art-1">
        影像组学
      </InlineVoiceMark>
    );
    const span = screen.getByText('影像组学');
    expect(span).toBeInTheDocument();
    expect(span.getAttribute('style')).toMatch(/rgba\(31,\s*139,\s*102,\s*0?\.08\)/);
    expect(span.getAttribute('style')).toMatch(/1px solid (?:#1F8B66|rgb\(31,\s*139,\s*102\))/i);
  });

  it('mouseEnter shows tooltip with locked source format; mouseLeave hides it', () => {
    render(
      <InlineVoiceMark sourceTitle="TCIA 数据集踩坑指北" sourceDate="2024-11" sourceArticleId="art-2">
        基线
      </InlineVoiceMark>
    );
    const span = screen.getByText('基线');
    expect(screen.queryByText(/TCIA 数据集踩坑指北/)).not.toBeInTheDocument();
    fireEvent.mouseEnter(span);
    expect(screen.getByText('据 TCIA 数据集踩坑指北 (2024-11)')).toBeInTheDocument();
    fireEvent.mouseLeave(span);
    expect(screen.queryByText(/TCIA 数据集踩坑指北/)).not.toBeInTheDocument();
  });

  it('click invokes openTab with vault kind + scrollToArticleId prop', () => {
    const spy = vi.spyOn(useFloatingWindowStore.getState(), 'openTab');
    render(
      <InlineVoiceMark sourceTitle="A" sourceDate="2025-01" sourceArticleId="art-xyz">
        词组
      </InlineVoiceMark>
    );
    fireEvent.click(screen.getByText('词组'));
    expect(spy).toHaveBeenCalledWith('vault', '看典 · 档案库', { scrollToArticleId: 'art-xyz' });
  });
});
