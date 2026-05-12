import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { House, type VillageEntry } from '@/components/lore/House';

const shanEntry: VillageEntry = {
  foxId: 'shan',
  silhouette: 'orchestrator',
  width: 134,
  height: 132,
  windowShape: 'arch',
  lore: '镇中央的门楼。守门人，讯使，值更人；他的灯永远亮着。',
};

describe('House — image-swap fallback', () => {
  it('renders procedural SVG silhouette when imageSrc is omitted', () => {
    const { queryByTestId } = render(
      <House entry={shanEntry} hovered={false} onHover={() => {}} onClick={() => {}} />,
    );
    expect(queryByTestId('hut-svg-shan')).not.toBeNull();
    expect(queryByTestId('hut-image-shan')).toBeNull();
  });

  it('renders <image> when imageSrc is provided, omitting the procedural shape', () => {
    const { queryByTestId } = render(
      <House
        entry={shanEntry}
        hovered={false}
        onHover={() => {}}
        onClick={() => {}}
        imageSrc="/foo.png"
      />,
    );
    const img = queryByTestId('hut-image-shan');
    expect(img).not.toBeNull();
    // SVG <image> uses `href` (React maps it to the SVG attribute).
    expect(img?.getAttribute('href')).toBe('/foo.png');
    expect(img?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(img?.getAttribute('width')).toBe(String(shanEntry.width));
    expect(img?.getAttribute('height')).toBe(String(shanEntry.height));
    expect(queryByTestId('hut-svg-shan')).toBeNull();
  });
});
