import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LorePortal } from '@/components/lore/LorePortal';

describe('LorePortal — painted background', () => {
  it('does not render the background <img> when bgImage is null', () => {
    const { queryByTestId } = render(
      <LorePortal onClose={() => {}} bgImage={null} />,
    );
    expect(queryByTestId('lore-portal-bg-image')).toBeNull();
  });

  it('does not render the background <img> when bgImage is undefined (default)', () => {
    const { queryByTestId } = render(<LorePortal onClose={() => {}} />);
    expect(queryByTestId('lore-portal-bg-image')).toBeNull();
  });

  it('renders the background <img> with provided URL when bgImage is set', () => {
    const { queryByTestId } = render(
      <LorePortal onClose={() => {}} bgImage="/art/bg/lore.jpg" />,
    );
    const img = queryByTestId('lore-portal-bg-image') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/art/bg/lore.jpg');
    expect(img?.getAttribute('aria-hidden')).toBe('true');
  });

  it('passes hutImages through to the matching House (renders <image> in place of procedural SVG)', () => {
    const { queryByTestId } = render(
      <LorePortal
        onClose={() => {}}
        hutImages={{ shan: '/art/lore/huts/shan.png' }}
      />,
    );
    // shan's hut renders a painted image; the others remain procedural.
    expect(queryByTestId('hut-image-shan')).not.toBeNull();
    expect(queryByTestId('hut-svg-shan')).toBeNull();
    // mo got no entry, so it falls back to the procedural silhouette.
    expect(queryByTestId('hut-svg-mo')).not.toBeNull();
    expect(queryByTestId('hut-image-mo')).toBeNull();
  });
});
