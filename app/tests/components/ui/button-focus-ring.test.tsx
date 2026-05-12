import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '@/components/ui/button';

// Phase #16 Track 9 — we can't assert :focus-visible browser state in jsdom,
// but we CAN assert the Tailwind utility classes that drive it are present in
// the rendered className string. This is sufficient: if the classes are
// emitted, Tailwind's preflight + the focus-visible pseudo will fire when the
// browser/Chrome reach that state.

describe('Button focus ring classes', () => {
  it('emits the amber focus-visible ring + offset classes', () => {
    const { getByRole } = render(<Button>Click</Button>);
    const btn = getByRole('button');
    const cls = btn.className;
    expect(cls).toContain('focus-visible:ring-amber-300/50');
    expect(cls).toContain('focus-visible:ring-offset-2');
    expect(cls).toContain('focus-visible:ring-offset-[#2A2724]');
  });

  it('includes the kanshan-btn-press micro-interaction class', () => {
    const { getByRole } = render(<Button>Press</Button>);
    expect(getByRole('button').className).toContain('kanshan-btn-press');
  });

  it('preserves passed className alongside the focus-ring classes', () => {
    const { getByRole } = render(<Button className="extra-cls">x</Button>);
    const cls = getByRole('button').className;
    expect(cls).toContain('extra-cls');
    expect(cls).toContain('focus-visible:ring-amber-300/50');
  });

  it('applies to non-default variants too (ghost)', () => {
    const { getByRole } = render(<Button variant="ghost">g</Button>);
    expect(getByRole('button').className).toContain('focus-visible:ring-amber-300/50');
  });

  it('button is focusable (jsdom .focus())', () => {
    const { getByRole } = render(<Button>focusable</Button>);
    const btn = getByRole('button') as HTMLButtonElement;
    btn.focus();
    expect(document.activeElement).toBe(btn);
  });
});
