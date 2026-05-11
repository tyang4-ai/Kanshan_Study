import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Corkboard } from '@/components/rail/Corkboard';
import { useCorkboardStore } from '@/lib/store/corkboard';

const noop = () => {};

describe('Corkboard', () => {
  beforeEach(() => {
    useCorkboardStore.getState().clear();
    localStorage.removeItem('kanshan-corkboard');
    // R6 demo-flow review (Tan Shulin) P1: Corkboard now seeds 3 demo
    // post-its on first mount when both pins are empty AND the seed flag
    // is unset. Tests that want to assert empty/single-pin state should
    // set the flag in their own beforeEach so the seed effect bails.
    localStorage.setItem('kanshan-corkboard-seeded', '1');
  });

  it('renders empty state when no pins', () => {
    const { getByTestId } = render(
      <Corkboard
        width={320}
        height={2000}
        searchOpen={false}
        postitOpen={false}
        onCloseSearch={noop}
        onClosePostit={noop}
      />,
    );
    expect(getByTestId('corkboard-empty')).toBeTruthy();
  });

  it('renders pins from store', () => {
    useCorkboardStore.getState().addPin({
      kind: 'vault',
      content: { title: '影像组学外部验证' },
      createdBy: 'user',
      w: 180,
      h: 120,
    });
    const { container } = render(
      <Corkboard
        width={320}
        height={2000}
        searchOpen={false}
        postitOpen={false}
        onCloseSearch={noop}
        onClosePostit={noop}
      />,
    );
    expect(container.textContent).toContain('影像组学外部验证');
  });

  it('search filter narrows displayed pins', () => {
    useCorkboardStore.getState().addPin({
      kind: 'vault', content: { title: 'Apples' }, createdBy: 'user', w: 180, h: 120,
    });
    useCorkboardStore.getState().addPin({
      kind: 'vault', content: { title: 'Bananas' }, createdBy: 'user', w: 180, h: 120,
    });
    const { getByTestId, container } = render(
      <Corkboard
        width={320}
        height={2000}
        searchOpen
        postitOpen={false}
        onCloseSearch={noop}
        onClosePostit={noop}
      />,
    );
    const input = getByTestId('corkboard-search-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'apple' } });
    expect(container.textContent).toContain('Apples');
    expect(container.textContent).not.toContain('Bananas');
  });

  it('post-it composer ignores Enter while IME composing', () => {
    const { getByTestId } = render(
      <Corkboard
        width={320}
        height={2000}
        searchOpen={false}
        postitOpen
        onCloseSearch={noop}
        onClosePostit={noop}
      />,
    );
    const ta = getByTestId('corkboard-postit-input') as HTMLTextAreaElement;
    fireEvent.compositionStart(ta);
    fireEvent.change(ta, { target: { value: '中文测试' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    // Pin not created (still composing)
    expect(useCorkboardStore.getState().pins.length).toBe(0);
    fireEvent.compositionEnd(ta);
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(useCorkboardStore.getState().pins.length).toBe(1);
    expect(useCorkboardStore.getState().pins[0].content.annotation).toBe('中文测试');
  });

  it('drop with VAULT_DRAG_MIME creates a vault pin', () => {
    const { getByTestId } = render(
      <Corkboard
        width={320}
        height={2000}
        searchOpen={false}
        postitOpen={false}
        onCloseSearch={noop}
        onClosePostit={noop}
      />,
    );
    const board = getByTestId('corkboard');
    const dataTransfer = {
      types: ['application/kanshan-vault'],
      getData: (k: string) =>
        k === 'application/kanshan-vault'
          ? JSON.stringify({ id: 'v1', title: 'Dropped vault entry', snippet: 'snip' })
          : '',
      setData: () => {},
      dropEffect: 'copy',
      effectAllowed: 'copy',
    };
    fireEvent.drop(board, { dataTransfer });
    expect(useCorkboardStore.getState().pins.length).toBe(1);
    expect(useCorkboardStore.getState().pins[0].content.title).toBe('Dropped vault entry');
    expect(useCorkboardStore.getState().pins[0].kind).toBe('vault');
  });

  it('drop with foreign MIME is rejected (no pin added)', () => {
    const { getByTestId } = render(
      <Corkboard
        width={320}
        height={2000}
        searchOpen={false}
        postitOpen={false}
        onCloseSearch={noop}
        onClosePostit={noop}
      />,
    );
    const board = getByTestId('corkboard');
    const dataTransfer = {
      types: ['text/plain'],
      getData: () => 'foreign payload',
      setData: () => {},
      dropEffect: 'copy',
      effectAllowed: 'copy',
    };
    fireEvent.drop(board, { dataTransfer });
    expect(useCorkboardStore.getState().pins.length).toBe(0);
  });
});
