import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const bgRef = vi.hoisted(() => ({ url: null as string | null }));

vi.mock('@/lib/art/workspace-bg', () => ({
  get WORKSPACE_BG_URL() { return bgRef.url; },
}));

// Stub heavy children so the shell renders without their internals.
vi.mock('@/components/rail/LeftRail', () => ({ LeftRail: () => <div data-testid="left-rail" /> }));
vi.mock('@/components/rail/LoreEnvelope', () => ({ LoreEnvelope: () => <div /> }));
vi.mock('@/components/editor/WritingSurface', () => ({ WritingSurface: () => <div data-testid="writing-surface" /> }));
vi.mock('@/components/menu/ContextMenu', () => ({ ContextMenu: () => <div /> }));
vi.mock('@/components/floating/TabbedFloatingWindow', () => ({ TabbedFloatingWindow: () => <div /> }));
vi.mock('@/components/lore/LorePortal', () => ({ LorePortal: () => <div /> }));
vi.mock('@/components/chrome/AiFailureToast', () => ({ AiFailureToast: () => <div /> }));
vi.mock('@/components/chrome/AuthErrorToast', () => ({ AuthErrorToast: () => <div /> }));
vi.mock('@/components/onboarding/DailyFoxPulse', () => ({ DailyFoxPulse: () => <div /> }));
vi.mock('@/components/floating/TrendsConfirmModal', () => ({
  TrendsConfirmModal: () => <div />,
  markTrendsAcknowledged: () => {},
}));
vi.mock('@/components/workspace/useGlobalShortcuts', () => ({ useGlobalShortcuts: () => {} }));

describe('WorkspaceShell · background image', () => {
  beforeEach(() => { bgRef.url = null; });
  afterEach(() => cleanup());

  it('does NOT render workspace-bg-image when asset is null', async () => {
    bgRef.url = null;
    const { WorkspaceShell } = await import('@/components/workspace/WorkspaceShell');
    const { queryByTestId } = render(<WorkspaceShell />);
    expect(queryByTestId('workspace-bg-image')).toBeNull();
  });

  it('renders workspace-bg-image with the resolved URL when present', async () => {
    bgRef.url = '/art/bg/workspace.jpg';
    const { WorkspaceShell } = await import('@/components/workspace/WorkspaceShell');
    const { getByTestId } = render(<WorkspaceShell />);
    const img = getByTestId('workspace-bg-image') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/art/bg/workspace.jpg');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });
});
