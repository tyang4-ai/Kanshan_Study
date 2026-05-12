import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const avatarRef = vi.hoisted(() => ({
  urls: { me: null as string | null, guwanxi: null as string | null },
}));

vi.mock('@/lib/art/account-avatars', () => ({
  get ACCOUNT_AVATAR_URLS() { return avatarRef.urls; },
}));

describe('TitleBar · ProfileChip avatar', () => {
  beforeEach(() => {
    avatarRef.urls = { me: null, guwanxi: null };
    window.localStorage.clear();
  });
  afterEach(() => cleanup());

  it('does NOT render profile-avatar img when avatar URL is null', async () => {
    avatarRef.urls = { me: null, guwanxi: null };
    const { ProfileChip } = await import('@/components/chrome/TitleBar');
    const { queryByTestId, container } = render(<ProfileChip />);
    expect(queryByTestId('profile-avatar')).toBeNull();
    expect(container.textContent).toMatch(/我|顾/);
  });

  it('renders profile-avatar img + initial char when avatar URL is set', async () => {
    avatarRef.urls = { me: '/art/avatars/me.png', guwanxi: '/art/avatars/guwanxi.png' };
    const { ProfileChip } = await import('@/components/chrome/TitleBar');
    const { getByTestId, container } = render(<ProfileChip />);
    const img = getByTestId('profile-avatar') as HTMLImageElement;
    expect(img.getAttribute('src')).toMatch(/\/art\/avatars\/(me|guwanxi)\.png/);
    expect(container.textContent).toMatch(/我|顾/);
  });
});
