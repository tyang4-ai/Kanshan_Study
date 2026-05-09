import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FoxRail } from '@/components/atoms/FoxRail';

describe('FoxRail', () => {
  it('renders 9 buttons', () => {
    render(<FoxRail activeIds={['mo']} onPick={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(9);
  });

  it('clicking a button calls onPick with that FoxId', () => {
    const fn = vi.fn();
    render(<FoxRail activeIds={['mo']} onPick={fn} />);
    fireEvent.click(screen.getByTitle(/看文/));
    expect(fn).toHaveBeenCalledWith('wen');
  });

  it('active button uses fox.glow as background', () => {
    render(<FoxRail activeIds={['mo']} onPick={() => {}} />);
    const moBtn = screen.getByTitle(/看墨/) as HTMLButtonElement;
    // mo's resampled glow is #3A4252 → CSS may render as rgb(58, 66, 82)
    expect(moBtn.style.background).toMatch(/#3A4252|rgb\(58,\s*66,\s*82\)/);
  });

  it('aria-pressed reflects active state', () => {
    render(<FoxRail activeIds={['mo']} onPick={() => {}} />);
    expect(screen.getByTitle(/看墨/).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTitle(/^看文/).getAttribute('aria-pressed')).toBe('false');
  });

  it('tooltip title carries fox name + verb (e.g. 看墨 · 内容精加工; only shan keeps 刘 prefix)', () => {
    render(<FoxRail activeIds={['mo']} onPick={() => {}} />);
    expect(screen.getByTitle('看墨 · 内容精加工')).toBeInTheDocument();
    expect(screen.getByTitle('看水 · 灵感激发')).toBeInTheDocument();
    expect(screen.getByTitle('看心 · 思路梳理')).toBeInTheDocument();
    expect(screen.getByTitle('刘看山 · orchestrate')).toBeInTheDocument();
  });
});
