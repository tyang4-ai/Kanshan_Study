import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { KanshanChatTab } from '@/components/floating/KanshanChatTab';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useCorkboardStore } from '@/lib/store/corkboard';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import { useAccountStore } from '@/lib/store/account';

// LLD-Track-3 (2026-05-11): revisit-hint surfaces a session-storage-based
// "上次你在写「X」，聊到「Y」 — 要继续吗？" bubble when the user returns to
// a stale chat session. Not persisted back — purely ephemeral on mount.

const HOUR = 60 * 60 * 1000;

function seedSession(turns: { role: string; content: string; ts: number }[]): void {
  window.sessionStorage.setItem('kanshan-chat-session-v1', JSON.stringify(turns));
}

function seedAccount(id: string): void {
  window.sessionStorage.setItem('kanshan-chat-session-account-v1', id);
}

describe('KanshanChatTab · revisit hint', () => {
  beforeEach(() => {
    useFloatingWindowStore.setState({ open: false, tabs: [], activeTabId: null });
    useCorkboardStore.getState().clear();
    window.sessionStorage.clear();
    // Reset editor-tabs store to an unhydrated baseline.
    useEditorTabsStore.setState({ docs: {}, activeId: null, hydratedFor: null });
    useAccountStore.setState({ active: 'me' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fresh session (no prior turns) → no revisit bubble, intro placeholder intact', () => {
    const { queryByTestId, container } = render(<KanshanChatTab />);
    expect(queryByTestId('chat-bubble-system')).toBeNull();
    expect(container.textContent).toContain('让看山想想');
  });

  it('recent session (< 1h gap) → no revisit bubble', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    seedSession([
      { role: 'user', content: '帮我看看影像组学', ts: now - 5 * 60 * 1000 },
      { role: 'kanshan', content: '好。', ts: now - 5 * 60 * 1000 + 100 },
    ]);
    const { queryByTestId } = render(<KanshanChatTab />);
    expect(queryByTestId('chat-bubble-system')).toBeNull();
  });

  it('stale session + active doc → revisit bubble with filename + topic', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    seedSession([
      { role: 'user', content: '我想写一篇关于量子计算的回答。', ts: now - 2 * HOUR },
      { role: 'kanshan', content: '好。', ts: now - 2 * HOUR + 100 },
    ]);
    useEditorTabsStore.setState({
      docs: {
        'd1': {
          id: 'd1',
          filename: 'quantum.md',
          htmlContent: '<p></p>',
          lastSavedAt: now,
          dirty: false,
          source: 'local',
        },
      },
      activeId: 'd1',
      hydratedFor: 'me',
    });
    const { getByTestId } = render(<KanshanChatTab />);
    const bubble = getByTestId('chat-bubble-system');
    expect(bubble.textContent).toBe(
      '上次你在写「quantum.md」，聊到「我想写一篇关于量子计算的回答」 — 要继续吗？',
    );
  });

  it('stale session + no active doc → revisit bubble without filename clause', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    seedSession([
      { role: 'user', content: '我想写一篇关于量子计算的回答。', ts: now - 2 * HOUR },
    ]);
    const { getByTestId } = render(<KanshanChatTab />);
    const bubble = getByTestId('chat-bubble-system');
    expect(bubble.textContent).toBe(
      '上次你聊到「我想写一篇关于量子计算的回答」 — 要继续吗？',
    );
  });

  it('topic truncates past 18 chars with ellipsis', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const long = 'A'.repeat(40);
    seedSession([
      { role: 'user', content: long, ts: now - 2 * HOUR },
    ]);
    const { getByTestId } = render(<KanshanChatTab />);
    const bubble = getByTestId('chat-bubble-system');
    expect(bubble.textContent).toContain('「' + 'A'.repeat(18) + '…」');
  });

  it('falls back to 刚才那个话题 when no prior user turn exists', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    seedSession([
      { role: 'kanshan', content: '看山在听。', ts: now - 2 * HOUR },
    ]);
    const { getByTestId } = render(<KanshanChatTab />);
    const bubble = getByTestId('chat-bubble-system');
    expect(bubble.textContent).toContain('「刚才那个话题」');
  });

  it('revisit bubble is NOT written back to sessionStorage', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const prior = [
      { role: 'user', content: '我想写一篇关于量子计算的回答。', ts: now - 2 * HOUR },
    ];
    seedSession(prior);
    render(<KanshanChatTab />);
    const raw = window.sessionStorage.getItem('kanshan-chat-session-v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { role: string }[];
    // Only the original user turn — no system entry persisted.
    expect(parsed).toHaveLength(1);
    expect(parsed[0].role).toBe('user');
  });

  it('multi-account: switching from me → guwanxi suppresses previous account revisit', () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    // History was written while account = me.
    seedSession([
      { role: 'user', content: 'me 的私密话题。', ts: now - 2 * HOUR },
    ]);
    seedAccount('me');
    // Now we mount the tab while account = guwanxi.
    useAccountStore.setState({ active: 'guwanxi' });
    const { queryByTestId, container } = render(<KanshanChatTab />);
    expect(queryByTestId('chat-bubble-system')).toBeNull();
    // Other account's content also must not leak.
    expect(container.textContent).not.toContain('me 的私密话题');
  });
});
