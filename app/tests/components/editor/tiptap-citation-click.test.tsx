import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleCitationSupClick } from '@/components/editor/TipTapEditor';

const openTabMock = vi.fn();
vi.mock('@/lib/store/floating-window', () => ({
  useFloatingWindowStore: Object.assign(
    (selector: (s: { openTab: typeof openTabMock }) => unknown) =>
      selector({ openTab: openTabMock }),
    { getState: () => ({ openTab: openTabMock }) },
  ),
}));

const windowOpenSpy = vi.fn();

beforeEach(() => {
  openTabMock.mockClear();
  windowOpenSpy.mockClear();
  vi.stubGlobal('open', windowOpenSpy);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function makeSup(id: string, kind: 'web' | 'vault' | 'zhihu', label: string): HTMLElement {
  const sup = document.createElement('sup');
  sup.setAttribute('data-citation-id', id);
  sup.setAttribute('data-kind', kind);
  sup.textContent = label;
  return sup;
}

describe('handleCitationSupClick (D3)', () => {
  it('returns false when the target is not a citation sup', () => {
    const div = document.createElement('div');
    expect(handleCitationSupClick(div, openTabMock)).toBe(false);
    expect(windowOpenSpy).not.toHaveBeenCalled();
    expect(openTabMock).not.toHaveBeenCalled();
  });

  it('web kind opens external URL via window.open', () => {
    const sup = makeSup('cite-w-3', 'web', '[3]');
    expect(handleCitationSupClick(sup, openTabMock)).toBe(true);
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    expect(windowOpenSpy.mock.calls[0][0]).toContain('arxiv.org');
  });

  it('vault kind opens the vault tab via openTab', () => {
    const sup = makeSup('cite-v-7', 'vault', '[v7]');
    expect(handleCitationSupClick(sup, openTabMock)).toBe(true);
    expect(openTabMock).toHaveBeenCalledWith(
      'vault',
      '看典 · 档案库',
      expect.objectContaining({ scrollToArticleId: '01-imaging-genomics-turn' }),
    );
  });

  it('zhihu kind opens the answer URL via window.open', () => {
    const sup = makeSup('cite-z-leng', 'zhihu', '[@冷泉]');
    expect(handleCitationSupClick(sup, openTabMock)).toBe(true);
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    expect(windowOpenSpy.mock.calls[0][0]).toContain('zhihu.com');
  });

  it('returns false for an unknown citation id', () => {
    const sup = makeSup('cite-unknown', 'web', '[?]');
    expect(handleCitationSupClick(sup, openTabMock)).toBe(false);
  });

  it('walks up from a child element to the enclosing sup', () => {
    const sup = makeSup('cite-w-3', 'web', '[3]');
    const child = document.createElement('span');
    sup.appendChild(child);
    expect(handleCitationSupClick(child, openTabMock)).toBe(true);
    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
  });
});
