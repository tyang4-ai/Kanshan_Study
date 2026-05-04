import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Aurora } from '@/components/lore/Aurora';

describe('Aurora', () => {
  it('renders with passed-in animation duration', () => {
    const { container } = render(
      <Aurora hue={195} top="18%" width={140} height={180} dur="22s" delay="0s" opacity={0.55} filterId="aurora-test" />,
    );
    // The blob is the second div inside the wrap div; it carries the animation style.
    const divs = container.querySelectorAll('div');
    const blob = divs[divs.length - 1] as HTMLElement;
    const styleText = blob.getAttribute('style') ?? '';
    expect(styleText).toContain('22s');
    expect(styleText).toContain('auroraDrift');
  });

  it('multiple instances render distinct elements with different filterIds', () => {
    const { container } = render(
      <>
        <Aurora hue={195} top="18%" width={140} height={180} dur="22s" delay="0s"  opacity={0.55} filterId="aurora-a" />
        <Aurora hue={270} top="24%" width={120} height={160} dur="28s" delay="-3s" opacity={0.42} filterId="aurora-b" />
      </>,
    );
    const filters = container.querySelectorAll('filter');
    const ids = Array.from(filters).map((f) => f.getAttribute('id'));
    expect(ids).toContain('aurora-a');
    expect(ids).toContain('aurora-b');
  });
});
