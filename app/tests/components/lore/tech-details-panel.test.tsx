import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TechDetailsPanel } from '@/components/lore/TechDetailsPanel';
import { getFox } from '@/lib/foxes/registry';

describe('TechDetailsPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders all 5 sections', () => {
    const { getByTestId } = render(<TechDetailsPanel onClose={() => {}} />);
    expect(getByTestId('section-overview')).toBeTruthy();
    expect(getByTestId('section-stack')).toBeTruthy();
    expect(getByTestId('section-credits')).toBeTruthy();
    expect(getByTestId('section-repo')).toBeTruthy();
    expect(getByTestId('section-key')).toBeTruthy();
  });

  it('overview section contains the project intro', () => {
    const { getByTestId } = render(<TechDetailsPanel onClose={() => {}} />);
    const overview = getByTestId('section-overview');
    expect(overview.textContent).toContain('看山书房');
    expect(overview.textContent).toContain('灵感激发');
    expect(overview.textContent).toContain('内容精加工');
  });

  it('stack section contains tech stack tokens', () => {
    const { getByTestId } = render(<TechDetailsPanel onClose={() => {}} />);
    const stack = getByTestId('section-stack');
    expect(stack.textContent).toContain('Next.js 15');
    expect(stack.textContent).toContain('TipTap');
    expect(stack.textContent).toContain('DeepSeek-V3');
  });

  it('GitHub link has correct href + target=_blank + rel=noopener noreferrer', () => {
    const { getByTestId } = render(<TechDetailsPanel onClose={() => {}} />);
    const link = getByTestId('tech-details-repo-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://github.com/tyang4-ai/Kanshan_Study');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('reads onboarding mode = guest from localStorage', () => {
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'guest' }));
    const { getByTestId } = render(<TechDetailsPanel onClose={() => {}} />);
    expect(getByTestId('tech-details-mode').textContent).toContain('受限模式');
  });

  it('reads onboarding mode = byo-key from localStorage', () => {
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'byo-key' }));
    const { getByTestId } = render(<TechDetailsPanel onClose={() => {}} />);
    expect(getByTestId('tech-details-mode').textContent).toContain('已自带密钥');
  });

  it('shows 未配置 when onboarding is absent', () => {
    const { getByTestId } = render(<TechDetailsPanel onClose={() => {}} />);
    expect(getByTestId('tech-details-mode').textContent).toContain('未配置');
  });

  it('clicking 更换密钥 prompts confirm and clears onboarding', () => {
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'byo-key' }));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { getByTestId } = render(<TechDetailsPanel onClose={() => {}} />);
    fireEvent.click(getByTestId('tech-details-swap-key'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(window.localStorage.getItem('kanshan-onboarding')).toBeNull();
    expect(getByTestId('tech-details-mode').textContent).toContain('未配置');
  });

  it('cancelling confirm preserves onboarding', () => {
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'byo-key' }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { getByTestId } = render(<TechDetailsPanel onClose={() => {}} />);
    fireEvent.click(getByTestId('tech-details-swap-key'));
    expect(window.localStorage.getItem('kanshan-onboarding')).not.toBeNull();
    expect(getByTestId('tech-details-mode').textContent).toContain('已自带密钥');
  });

  it('shan attribution string visible at bottom', () => {
    const { getByTestId } = render(<TechDetailsPanel onClose={() => {}} />);
    const attribution = getByTestId('tech-details-attribution');
    expect(attribution.textContent).toContain(getFox('shan').attribution);
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<TechDetailsPanel onClose={onClose} />);
    fireEvent.click(getByTestId('tech-details-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop calls onClose', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<TechDetailsPanel onClose={onClose} />);
    fireEvent.click(getByTestId('tech-details-panel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
