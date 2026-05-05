import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TourTrigger } from '@/components/tour/TourTrigger';

describe('TourTrigger', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.body.innerHTML = '';
  });
  afterEach(() => {
    window.localStorage.clear();
    document.body.innerHTML = '';
  });

  it('does not auto-trigger when kanshan-onboarding is absent', () => {
    const { queryByTestId } = render(<TourTrigger />);
    expect(queryByTestId('tour-overlay')).toBeNull();
    expect(queryByTestId('tour-trigger')).toBeTruthy();
  });

  it('auto-triggers when kanshan-onboarding is set and tour-done is absent', () => {
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'guest' }));
    const { queryByTestId } = render(<TourTrigger />);
    expect(queryByTestId('tour-overlay')).toBeTruthy();
  });

  it('does not auto-trigger when tour-done is set', () => {
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'guest' }));
    window.localStorage.setItem('kanshan-tour-done', new Date().toISOString());
    const { queryByTestId } = render(<TourTrigger />);
    expect(queryByTestId('tour-overlay')).toBeNull();
  });

  it('clicking the trigger button mounts TourEngine even if previously dismissed', () => {
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'guest' }));
    window.localStorage.setItem('kanshan-tour-done', new Date().toISOString());
    const { getByTestId, queryByTestId } = render(<TourTrigger />);
    expect(queryByTestId('tour-overlay')).toBeNull();
    fireEvent.click(getByTestId('tour-trigger'));
    expect(queryByTestId('tour-overlay')).toBeTruthy();
  });
});
