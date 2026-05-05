import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';

const STORAGE_KEY = 'kanshan-onboarding';

describe('OnboardingGate', () => {
  beforeEach(() => {
    window.localStorage.clear();
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

  it('IME composition: Enter during composition does not submit', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    // Simulate composition Enter (keyCode 229)
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    // Now submit normally
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
