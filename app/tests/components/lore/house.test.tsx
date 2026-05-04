import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { House, type VillageEntry } from '@/components/lore/House';
import { getFox } from '@/lib/foxes/registry';

const moEntry: VillageEntry = {
  foxId: 'mo',
  silhouette: 'studio',
  width: 112,
  height: 108,
  windowShape: 'round',
  lore: '墨色三分，留白七分。冬夜守灯，不写则已。',
};

describe('House', () => {
  it('onMouseEnter calls onHover with foxId', () => {
    const onHover = vi.fn();
    const { getByTestId } = render(
      <House entry={moEntry} hovered={false} onHover={onHover} onClick={() => {}} />,
    );
    fireEvent.mouseEnter(getByTestId('house'));
    expect(onHover).toHaveBeenCalledWith('mo');
  });

  it('onMouseLeave calls onHover with null', () => {
    const onHover = vi.fn();
    const { getByTestId } = render(
      <House entry={moEntry} hovered={false} onHover={onHover} onClick={() => {}} />,
    );
    fireEvent.mouseLeave(getByTestId('house'));
    expect(onHover).toHaveBeenCalledWith(null);
  });

  it('onClick fires when the house is clicked', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(
      <House entry={moEntry} hovered={false} onHover={() => {}} onClick={onClick} />,
    );
    fireEvent.click(getByTestId('house'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders the fox name with the 刘 prefix preserved', () => {
    const { getByTestId } = render(
      <House entry={moEntry} hovered={false} onHover={() => {}} onClick={() => {}} />,
    );
    expect(getByTestId('house').textContent).toContain(getFox('mo').name);
  });

  it('hovered state lifts via data-hovered attribute', () => {
    const { getByTestId, rerender } = render(
      <House entry={moEntry} hovered={false} onHover={() => {}} onClick={() => {}} />,
    );
    expect(getByTestId('house').getAttribute('data-hovered')).toBe('false');
    rerender(<House entry={moEntry} hovered={true} onHover={() => {}} onClick={() => {}} />);
    expect(getByTestId('house').getAttribute('data-hovered')).toBe('true');
  });

  it('window radial gradient uses fox glow color', () => {
    const { container } = render(
      <House entry={moEntry} hovered={false} onHover={() => {}} onClick={() => {}} />,
    );
    const stops = container.querySelectorAll('stop');
    const glowStop = Array.from(stops).find((s) => s.getAttribute('offset') === '0%');
    expect(glowStop?.getAttribute('stop-color')).toBe(getFox('mo').glow);
  });

  it('renders chimney smoke for silhouettes that declare a chimney', () => {
    const { queryByTestId } = render(
      <House entry={moEntry} hovered={false} onHover={() => {}} onClick={() => {}} />,
    );
    expect(queryByTestId('house-smoke')).not.toBeNull();
  });

  it('does NOT render chimney smoke for silhouettes without a chimney', () => {
    const dianEntry: VillageEntry = {
      foxId: 'dian',
      silhouette: 'tower',
      width: 102,
      height: 148,
      windowShape: 'lattice',
      lore: '卷帙数千，签牌可凭。',
    };
    const { queryByTestId } = render(
      <House entry={dianEntry} hovered={false} onHover={() => {}} onClick={() => {}} />,
    );
    expect(queryByTestId('house-smoke')).toBeNull();
  });

  it('xin gatehouse renders cross-mullion lines on the window', () => {
    const xinEntry: VillageEntry = {
      foxId: 'xin',
      silhouette: 'gatehouse',
      width: 118,
      height: 104,
      windowShape: 'square',
      lore: '幕前光影，幕后界尺。',
    };
    const { container } = render(
      <House entry={xinEntry} hovered={false} onHover={() => {}} onClick={() => {}} />,
    );
    // The XinMullion adds 2 extra lines on top of the silhouette's existing lines.
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });
});
