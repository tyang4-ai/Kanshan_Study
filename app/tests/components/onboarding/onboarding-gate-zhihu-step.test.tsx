import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { useAccountStore } from '@/lib/store/account';
import { useVaultConsentStore } from '@/lib/store/vault-consent';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';

const STORAGE_KEY = 'kanshan-onboarding';

function resetSession(): void {
  useZhihuSessionStore.setState({
    uid: null,
    fullname: null,
    avatarPath: null,
    exp: null,
    hydrated: false,
  });
}

describe('OnboardingGate · zhihu-login step', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'kanshan-account=; path=/; max-age=0';
    document.cookie = 'kanshan-provider=; path=/; max-age=0';
    useVaultConsentStore.setState({ consented: false, hydratedFor: null });
    useAccountStore.setState({ active: 'me' });
    resetSession();
    // Stub hydrate so it doesn't actually call fetch in tests.
    vi.spyOn(useZhihuSessionStore.getState(), 'hydrate').mockImplementation(async () => {
      /* no-op for tests; individual tests prime state via setState */
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('for `me` account: zhihu-login step renders after BYO submit with locked copy', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    const step = getByTestId('onboarding-zhihu-login-step');
    const text = step.textContent ?? '';
    expect(text).toContain('连接你的知乎账号 (可选)');
    expect(text).toContain('我们只读取你的昵称和头像');
    expect(text).toContain('不会代你发布、不会读私信、不会绑定永久 token');
    expect(text).toContain('退出登录后服务端立即清除会话');
    expect(text).toContain('使用知乎账号登录');
    expect(text).toContain('跳过 — 之后再说');
  });

  it('for `guwanxi` account: zhihu-login step NOT rendered (skip to vault-consent which auto-resolves)', () => {
    useAccountStore.setState({ active: 'guwanxi' });
    const { getByTestId, queryByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    expect(queryByTestId('onboarding-zhihu-login-step')).toBeNull();
    // Gate closes (guwanxi consent auto-accepted in the store).
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });

  it('if session already hydrated with truthy fullname, skip zhihu-login step', () => {
    useZhihuSessionStore.setState({
      uid: 42,
      fullname: '张三',
      avatarPath: null,
      exp: Date.now() + 60000,
      hydrated: true,
    });
    const { getByTestId, queryByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    expect(queryByTestId('onboarding-zhihu-login-step')).toBeNull();
    expect(getByTestId('onboarding-vault-consent')).toBeInTheDocument();
  });

  it('clicking 使用知乎账号登录 sets window.location.href to /api/auth/zhihu/start', () => {
    const hrefAssignments: string[] = [];
    const realLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...realLocation,
        href: realLocation.href,
        get search() {
          return realLocation.search;
        },
        assign: (v: string) => hrefAssignments.push(v),
      },
    });
    // Make `location.href = X` trap as an assignment by defining setter.
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      get: () => realLocation.href,
      set: (v: string) => hrefAssignments.push(v),
    });

    const { getByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    fireEvent.click(getByTestId('onboarding-zhihu-login'));
    expect(hrefAssignments).toContain('/api/auth/zhihu/start');

    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: realLocation });
  });

  it('clicking 跳过 — 之后再说 advances to vault-consent', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    expect(getByTestId('onboarding-zhihu-login-step')).toBeInTheDocument();
    fireEvent.click(getByTestId('onboarding-zhihu-skip'));
    expect(getByTestId('onboarding-vault-consent')).toBeInTheDocument();
  });

  it('saving the gate via vault-accept still works after going through zhihu-skip', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    fireEvent.click(getByTestId('onboarding-zhihu-skip'));
    fireEvent.click(getByTestId('onboarding-vault-accept'));
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });
});
