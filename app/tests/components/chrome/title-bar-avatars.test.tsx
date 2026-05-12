import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// The server-only `@/lib/art/account-avatars` is not imported by TitleBar
// anymore — the resolved URLs are passed as an `avatarUrls` prop from the
// page-level Server Component. Tests pass it directly.

describe('TitleBar · ProfileChip avatar', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => cleanup());

  it('does NOT render profile-avatar img when avatar URL is null', async () => {
    const { ProfileChip } = await import('@/components/chrome/TitleBar');
    const { queryByTestId, container } = render(
      <ProfileChip avatarUrls={{ me: null, guwanxi: null }} />,
    );
    expect(queryByTestId('profile-avatar')).toBeNull();
    expect(container.textContent).toMatch(/我|顾/);
  });

  it('does NOT render profile-avatar img when avatarUrls prop is omitted', async () => {
    const { ProfileChip } = await import('@/components/chrome/TitleBar');
    const { queryByTestId, container } = render(<ProfileChip />);
    expect(queryByTestId('profile-avatar')).toBeNull();
    expect(container.textContent).toMatch(/我|顾/);
  });

  it('renders profile-avatar img + initial char when avatar URL is set', async () => {
    const { ProfileChip } = await import('@/components/chrome/TitleBar');
    const { getByTestId, container } = render(
      <ProfileChip avatarUrls={{ me: '/art/avatars/me.png', guwanxi: '/art/avatars/guwanxi.png' }} />,
    );
    const img = getByTestId('profile-avatar') as HTMLImageElement;
    expect(img.getAttribute('src')).toMatch(/\/art\/avatars\/(me|guwanxi)\.png/);
    expect(container.textContent).toMatch(/我|顾/);
  });
});
