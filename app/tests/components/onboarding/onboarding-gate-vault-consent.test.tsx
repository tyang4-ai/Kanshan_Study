import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { useAccountStore } from '@/lib/store/account';
import { useVaultConsentStore } from '@/lib/store/vault-consent';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';

const STORAGE_KEY = 'kanshan-onboarding';

describe('OnboardingGate · vault consent step', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = 'kanshan-account=; path=/; max-age=0';
    document.cookie = 'kanshan-provider=; path=/; max-age=0';
    useVaultConsentStore.setState({ consented: false, hydratedFor: null });
    useAccountStore.setState({ active: 'me' });
    useZhihuSessionStore.setState({
      uid: null, fullname: null, avatarPath: null, exp: null, hydrated: false,
    });
  });
  afterEach(() => cleanup());

  it('shows the vault-consent screen after a `me` BYO key submit (via zhihu-skip)', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    fireEvent.click(getByTestId('onboarding-zhihu-skip'));
    expect(getByTestId('onboarding-vault-consent')).toBeInTheDocument();
    expect(queryByTestId('onboarding-byo-submit')).toBeNull();
  });

  it('locked copy is rendered verbatim', () => {
    const { getByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    fireEvent.click(getByTestId('onboarding-zhihu-skip'));
    const panel = getByTestId('onboarding-vault-consent');
    const text = panel.textContent ?? '';
    expect(text).toContain('看典 · 档案库使用说明');
    expect(text).toContain('当你导入文档到看典');
    expect(text).toContain('文件内容存入 Supabase 新加坡区数据库');
    expect(text).toContain('文本经 SiliconFlow BGE-M3 切块嵌入，用于语风指纹检索');
    expect(text).toContain('你的内容不会进入第三方训练集');
    expect(text).toContain('任何时刻可在「看典」面板「导出全部」或「删除全部」');
    expect(text).toContain('同意并继续');
    expect(text).toContain('暂不开通看典');
  });

  it('同意并继续 calls accept, persists, and closes the gate', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    fireEvent.click(getByTestId('onboarding-zhihu-skip'));
    fireEvent.click(getByTestId('onboarding-vault-accept'));
    expect(useVaultConsentStore.getState().consented).toBe(true);
    expect(window.localStorage.getItem('kanshan-vault-consent:me')).toBe('1');
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });

  it('暂不开通看典 leaves consented=false but still closes the gate', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    fireEvent.click(getByTestId('onboarding-zhihu-skip'));
    fireEvent.click(getByTestId('onboarding-vault-decline'));
    expect(useVaultConsentStore.getState().consented).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });

  it('for account guwanxi the consent screen is NOT rendered', () => {
    useAccountStore.setState({ active: 'guwanxi' });
    const { getByTestId, queryByTestId } = render(<OnboardingGate />);
    const input = getByTestId('onboarding-api-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-abcdefghijklmnop1234' } });
    fireEvent.click(getByTestId('onboarding-byo-submit'));
    // Gate closes immediately, no consent screen.
    expect(queryByTestId('onboarding-vault-consent')).toBeNull();
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });

  it('guest submit always skips the consent screen (defaults to guwanxi)', () => {
    const { getByTestId, queryByTestId } = render(<OnboardingGate />);
    fireEvent.click(getByTestId('onboarding-guest-submit'));
    expect(queryByTestId('onboarding-vault-consent')).toBeNull();
    expect(queryByTestId('onboarding-gate')).toBeNull();
  });
});
