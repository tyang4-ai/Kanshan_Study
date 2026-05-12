import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// The server-only `@/lib/art/workspace-bg` is not imported by WorkspaceShell
// anymore — the resolved URL is passed as a `workspaceBgUrl` prop from the
// page-level Server Component. Tests just pass it directly.

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
  afterEach(() => cleanup());

  it('does NOT render workspace-bg-image when workspaceBgUrl is null', async () => {
    const { WorkspaceShell } = await import('@/components/workspace/WorkspaceShell');
    const { queryByTestId } = render(<WorkspaceShell workspaceBgUrl={null} />);
    expect(queryByTestId('workspace-bg-image')).toBeNull();
  });

  it('does NOT render workspace-bg-image when workspaceBgUrl is undefined', async () => {
    const { WorkspaceShell } = await import('@/components/workspace/WorkspaceShell');
    const { queryByTestId } = render(<WorkspaceShell />);
    expect(queryByTestId('workspace-bg-image')).toBeNull();
  });

  it('renders workspace-bg-image with the resolved URL when present', async () => {
    const { WorkspaceShell } = await import('@/components/workspace/WorkspaceShell');
    const { getByTestId } = render(<WorkspaceShell workspaceBgUrl="/art/bg/workspace.jpg" />);
    const img = getByTestId('workspace-bg-image') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/art/bg/workspace.jpg');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });
});
