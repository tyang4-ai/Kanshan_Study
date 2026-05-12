import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';

const STORAGE_KEY = 'kanshan-onboarding';

describe('OnboardingGate', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Wipe any residual cookies between tests
    document.cookie = 'kanshan-account=; path=/; max-age=0';
    document.cookie = 'kanshan-provider=; path=/; max-age=0';
    // Reset zhihu session so the `me` BYO flow lands on zhihu-login step.
    useZhihuSessionStore.setState({
      uid: null, fullname: null, avatarPath: null, exp: null, hydrated: false,
    });
  });
  afterEach(() => cleanup());

  it('renders when localStorage absent', () => {
    const { getByTestId } = render(<OnboardingGate />);
    expect(getByTestId('onboarding-gate')).toBeInTheDocument();
  });

  it('does NOT render when localStorage has byo-key record', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: 'byo-key', apiKey: 'sk-abcdefghijklmnop1234', dismissedAt: '2026-05-04T00:00:00.000Z' }),
    );
    const { queryByTestId } = render(<OnboardingGate />);
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });

  it('does NOT render when localStorage has guest record', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: 'guest', dismissedAt: '2026-05-04T00:00:00.000Z' }),
    );
    const { queryByTestId } = render(<OnboardingGate />);
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });

  it('validator: empty submit shows error', () => {
    const { getByTestId } = render(<OnboardingGate />);
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    const err = getByTestId('onboarding-error');
    expect(err.textContent).toContain('请输入密钥');
  });

  it('validator: non-sk- prefix shows format error', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'pk-1234567890abcdefghij' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    const err = getByTestId('onboarding-error');
    expect(err.textContent).toContain('sk-');
  });

  it('validator: too-short key shows length error', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-short' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    const err = getByTestId('onboarding-error');
    expect(err.textContent).toContain('短');
  });

  it('valid byo-key: writes localStorage with apiKey + mode and unmounts', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    // Zhihu-login step interposes for `me`; skip it.
    fireEvent.click(getByTestId('onboarding-zhihu-skip'));
    // Vault-consent step interposes for the default `me` account.
    fireEvent.click(getByTestId('onboarding-vault-accept'));
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.mode).toBe('byo-key');
    expect(parsed.apiKey).toBe('sk-abcdefghijklmnop1234');
    expect(typeof parsed.dismissedAt).toBe('string');
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });

  it('guest submit: writes localStorage with mode=guest (no apiKey) and unmounts', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingGate />);
    fireEvent.click(getByTestId('onboarding-guest-submit'));
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.mode).toBe('guest');
    expect(parsed.apiKey).toBeUndefined();
    expect(typeof parsed.dismissedAt).toBe('string');
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });

  it('guest submit: also writes kanshan-account=guwanxi cookie', () => {
    const { getByTestId } = render(<OnboardingGate />);
    fireEvent.click(getByTestId('onboarding-guest-submit'));
    expect(document.cookie).toContain('kanshan-account=guwanxi');
  });

  it('after submit and re-render: gate stays unmounted', () => {
    const { getByTestId, queryByTestId, rerender } = render(<OnboardingGate />);
    fireEvent.click(getByTestId('onboarding-guest-submit'));
    rerender(<OnboardingGate />);
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });

  it('escape key on gate root does not dismiss', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const gate = getByTestId('onboarding-gate');
    fireEvent.keyDown(gate, { key: 'Escape' });
    expect(getByTestId('onboarding-gate')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('click on backdrop does not dismiss', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const gate = getByTestId('onboarding-gate');
    fireEvent.click(gate);
    expect(getByTestId('onboarding-gate')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not render an X close button or aria-label="close"', () => {
    const { getByTestId, queryByLabelText } = render(<OnboardingGate />);
    const gate = getByTestId('onboarding-gate');
    expect(gate.textContent).not.toContain('×');
    expect(queryByLabelText('close')).toBeNull();
    expect(queryByLabelText('Close')).toBeNull();
  });

  it('renders both provider radios with Kimi default-selected', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const kimi = getByTestId('onboarding-provider-kimi');
    const deepseek = getByTestId('onboarding-provider-deepseek');
    // Selected state uses cream text color, unselected uses brown
    expect(kimi.style.color).toBe('rgb(250, 248, 243)');
    expect(deepseek.style.color).toBe('rgb(42, 36, 25)');
  });

  it('clicking DeepSeek radio updates conditional copy', () => {
    const { getByTestId, container } = render(<OnboardingGate />);
    fireEvent.click(getByTestId('onboarding-provider-deepseek'));
    const text = container.textContent ?? '';
    expect(text).toContain('platform.deepseek.com');
    expect(text).not.toContain('platform.moonshot.cn');
  });

  it('clicking Kimi radio shows Kimi-specific copy', () => {
    const { getByTestId, container } = render(<OnboardingGate />);
    // Switch to deepseek then back to kimi to verify toggling
    fireEvent.click(getByTestId('onboarding-provider-deepseek'));
    fireEvent.click(getByTestId('onboarding-provider-kimi'));
    const text = container.textContent ?? '';
    expect(text).toContain('platform.moonshot.cn');
    expect(text).not.toContain('platform.deepseek.com');
  });

  it('BYO submit writes kanshan-provider=deepseek cookie when DeepSeek selected', () => {
    const { getByTestId } = render(<OnboardingGate />);
    fireEvent.click(getByTestId('onboarding-provider-deepseek'));
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    expect(document.cookie).toContain('kanshan-provider=deepseek');
  });

  it('BYO submit writes kanshan-provider=kimi cookie when Kimi selected (default)', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    expect(document.cookie).toContain('kanshan-provider=kimi');
  });

  it('Guest submit writes kanshan-provider=kimi cookie AND kanshan-account=guwanxi', () => {
    const { getByTestId } = render(<OnboardingGate />);
    fireEvent.click(getByTestId('onboarding-guest-submit'));
    expect(document.cookie).toContain('kanshan-provider=kimi');
    expect(document.cookie).toContain('kanshan-account=guwanxi');
  });

  it('OnboardingRecord in localStorage includes provider field on BYO submit', () => {
    const { getByTestId } = render(<OnboardingGate />);
    fireEvent.click(getByTestId('onboarding-provider-deepseek'));
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    // Zhihu-login step interposes for `me`; skip it.
    fireEvent.click(getByTestId('onboarding-zhihu-skip'));
    // Vault-consent step interposes for the default `me` account.
    fireEvent.click(getByTestId('onboarding-vault-accept'));
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw as string);
    expect(parsed.provider).toBe('deepseek');
    expect(parsed.apiKey).toBe('sk-abcdefghijklmnop1234');
  });

  it('IME composition: Enter during composition does not submit', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    // Simulate composition Enter (keyCode 229)
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    // Now submit normally — zhihu-login + vault-consent steps interpose for `me`.
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
    fireEvent.click(getByTestId('onboarding-zhihu-skip'));
    fireEvent.click(getByTestId('onboarding-vault-accept'));
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
