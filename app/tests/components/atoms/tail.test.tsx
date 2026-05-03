import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tail } from '@/components/atoms/Tail';
import { getFox } from '@/lib/foxes/registry';

describe('Tail', () => {
  it('renders fox tail img with correct src', () => {
    render(<Tail fox={getFox('mo')} active />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/foxes/tail-mo.png');
  });

  it('applies rotate transform around bottom-center hinge', () => {
    render(<Tail fox={getFox('mo')} rotate={45} />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.style.transform).toContain('translate(-50%, -100%)');
    expect(img.style.transform).toContain('rotate(45deg)');
    expect(img.style.transformOrigin).toContain('100%');
  });

  it('active applies drop-shadow glow filter', () => {
    render(<Tail fox={getFox('mo')} active />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.style.filter).toContain('drop-shadow(0 0 10px');
  });

  it('inactive uses subtle shadow only', () => {
    render(<Tail fox={getFox('mo')} />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.style.filter).not.toContain('drop-shadow(0 0 10px');
  });

  it('onClick fires + cursor + pointer-events update', () => {
    const fn = vi.fn();
    render(<Tail fox={getFox('mo')} onClick={fn} />);
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.style.cursor).toBe('pointer');
    expect(img.style.pointerEvents).toBe('auto');
    fireEvent.click(img);
    expect(fn).toHaveBeenCalledOnce();
  });
});
