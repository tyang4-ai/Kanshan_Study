import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ToolIconName } from '@/components/icons/ToolIcon';

// The ToolIcon module reads `pickAssetUrl` at module load and stashes results
// in a static `ICON_URLS` map. To test both branches (asset vs fallback) we
// re-mock + re-import per test using vi.resetModules + dynamic import.

describe('ToolIcon', () => {
  afterEach(() => {
    cleanup();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe('fallback rendering (no asset present)', () => {
    beforeEach(() => {
      vi.doMock('@/lib/art/asset-resolver', () => ({
        pickAssetUrl: () => null,
        assetExists: () => false,
        __resetAssetCache: () => undefined,
      }));
    });

    it('renders an inline SVG fallback for vault when no asset', async () => {
      const { ToolIcon } = await import('@/components/icons/ToolIcon');
      const { container, getByTestId } = render(<ToolIcon name="vault" />);
      const el = getByTestId('tool-icon-vault');
      expect(el.getAttribute('data-source')).toBe('fallback');
      expect(container.querySelector('svg')).not.toBeNull();
    });

    it('renders all 7 names without crashing', async () => {
      const { ToolIcon } = await import('@/components/icons/ToolIcon');
      const names: ToolIconName[] = ['vault', 'trends', 'stats', 'settings', 'ai-touched', 'flag', 'fox'];
      for (const name of names) {
        const { getByTestId, unmount } = render(<ToolIcon name={name} />);
        const el = getByTestId(`tool-icon-${name}`);
        expect(el.getAttribute('data-source')).toBe('fallback');
        expect(el.querySelector('svg')).not.toBeNull();
        unmount();
      }
    });

    it('applies size prop to inline SVG width/height', async () => {
      const { ToolIcon } = await import('@/components/icons/ToolIcon');
      const { container } = render(<ToolIcon name="vault" size={24} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('24');
      expect(svg?.getAttribute('height')).toBe('24');
    });

    it('default size is 18', async () => {
      const { ToolIcon } = await import('@/components/icons/ToolIcon');
      const { container } = render(<ToolIcon name="settings" />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('18');
      expect(svg?.getAttribute('height')).toBe('18');
    });

    it('color prop flows through to fallback stroke', async () => {
      const { ToolIcon } = await import('@/components/icons/ToolIcon');
      const { container } = render(<ToolIcon name="flag" color="#FF00AA" />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('stroke')).toBe('#FF00AA');
    });

    it('applies className to wrapper', async () => {
      const { ToolIcon } = await import('@/components/icons/ToolIcon');
      const { getByTestId } = render(<ToolIcon name="fox" className="custom-cls" />);
      expect(getByTestId('tool-icon-fox').className).toContain('custom-cls');
    });
  });

  describe('asset rendering (custom override present)', () => {
    beforeEach(() => {
      vi.doMock('@/lib/art/asset-resolver', () => ({
        pickAssetUrl: (path: string) => path, // every path "exists"
        assetExists: () => true,
        __resetAssetCache: () => undefined,
      }));
    });

    it('renders an <img> with the resolved url for vault', async () => {
      const { ToolIcon } = await import('@/components/icons/ToolIcon');
      const { getByTestId } = render(<ToolIcon name="vault" size={32} />);
      const img = getByTestId('tool-icon-vault') as HTMLImageElement;
      expect(img.tagName).toBe('IMG');
      expect(img.getAttribute('data-source')).toBe('asset');
      expect(img.getAttribute('src')).toBe('/art/icons/vault.png');
      expect(img.getAttribute('width')).toBe('32');
      expect(img.getAttribute('height')).toBe('32');
    });

    it('renders <img> for all 7 names when assets exist', async () => {
      const { ToolIcon } = await import('@/components/icons/ToolIcon');
      const names: ToolIconName[] = ['vault', 'trends', 'stats', 'settings', 'ai-touched', 'flag', 'fox'];
      for (const name of names) {
        const { getByTestId, unmount } = render(<ToolIcon name={name} />);
        const el = getByTestId(`tool-icon-${name}`);
        expect(el.tagName).toBe('IMG');
        expect(el.getAttribute('data-source')).toBe('asset');
        expect(el.getAttribute('src')).toBe(`/art/icons/${name}.png`);
        unmount();
      }
    });
  });
});
