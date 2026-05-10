import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { KanshanChatBubble } from '@/components/chrome/KanshanChatBubble';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

describe('KanshanChatBubble', () => {
  beforeEach(() => {
    useFloatingWindowStore.setState({
      open: false,
      tabs: [],
      activeTabId: null,
    });
  });

  it('renders bottom-right floating button', () => {
    const { getByTestId } = render(<KanshanChatBubble />);
    const btn = getByTestId('kanshan-chat-bubble');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toContain('看山');
  });

  it('click opens kanshan-chat tab in floating window', () => {
    const { getByTestId } = render(<KanshanChatBubble />);
    const btn = getByTestId('kanshan-chat-bubble');
    fireEvent.click(btn);
    const state = useFloatingWindowStore.getState();
    expect(state.open).toBe(true);
    expect(state.tabs.some((t) => t.kind === 'kanshan-chat')).toBe(true);
  });

  it('one-tab-per-kind: clicking twice does not duplicate', () => {
    const { getByTestId } = render(<KanshanChatBubble />);
    const btn = getByTestId('kanshan-chat-bubble');
    fireEvent.click(btn);
    fireEvent.click(btn);
    const state = useFloatingWindowStore.getState();
    const matching = state.tabs.filter((t) => t.kind === 'kanshan-chat');
    expect(matching.length).toBe(1);
  });
});
