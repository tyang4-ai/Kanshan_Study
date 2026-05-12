'use client';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'kanshan-onboarding';

type OnboardingMode = 'byo-key' | 'guest';
type ProviderChoice = 'kimi' | 'deepseek';

interface OnboardingRecord {
  mode: OnboardingMode;
  provider?: ProviderChoice;
  apiKey?: string;
  dismissedAt: string;
}

function validateKey(k: string): string | null {
  const trimmed = k.trim();
  if (!trimmed) return '请输入密钥';
  if (!trimmed.startsWith('sk-')) return '密钥格式不对，应以 sk- 开头';
  if (trimmed.length < 20) return '密钥太短';
  return null;
}

interface OnboardingGateProps {
  guestModeAvailable?: boolean;
  /**
   * When true, the deployment is shared with anonymous visitors (the live
   * site during judging). "Guest mode" becomes cache-only — no live LLM
   * calls on the operator's credits. Set from `KANSHAN_PUBLIC_MODE` env.
   */
  publicMode?: boolean;
}

export function OnboardingGate({ guestModeAvailable = true, publicMode = false }: OnboardingGateProps = {}) {
  // Hydration-safe pattern: server + client first render BOTH return null,
  // then a post-mount effect sets the real visibility from localStorage.
  // Avoids hydration mismatch between SSR (no localStorage) and CSR.
  const [hidden, setHidden] = useState<boolean>(true);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderChoice>('kimi');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(window.localStorage.getItem(STORAGE_KEY) !== null);
  }, []);

  if (hidden) return null;

  const writeRecord = (record: OnboardingRecord) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setHidden(true);
    // Notify TourTrigger (mounted earlier with 'done' state since localStorage
    // was empty at that time) to re-check and auto-start the tour now that
    // onboarding has been completed within this session.
    window.dispatchEvent(new CustomEvent('kanshan-onboarding-done'));
  };

  const submitByoKey = () => {
    const err = validateKey(apiKey);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    // Cookie tells server which LLM adapter to route this user's BYO key to.
    document.cookie = `kanshan-provider=${provider}; path=/; max-age=31536000; SameSite=Lax`;
    writeRecord({
      mode: 'byo-key',
      provider,
      apiKey: apiKey.trim(),
      dismissedAt: new Date().toISOString(),
    });
  };

  const submitGuest = () => {
    // Default guest visitors to the guwanxi demo account so the vault is non-empty.
    document.cookie = 'kanshan-account=guwanxi; path=/; max-age=31536000; SameSite=Lax';
    // Guest mode uses the app's Kimi credit in self-hosted dev; in shared
    // (public-mode) deployments, set kanshan-mode=cache so the server forces
    // cache-only replies and never charges the operator's credits.
    document.cookie = 'kanshan-provider=kimi; path=/; max-age=31536000; SameSite=Lax';
    if (publicMode) {
      document.cookie = 'kanshan-mode=cache; path=/; max-age=31536000; SameSite=Lax';
    }
    writeRecord({
      mode: 'guest',
      dismissedAt: new Date().toISOString(),
    });
  };

  const handleKeyInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    submitByoKey();
  };

  const handleBackdropKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const root: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 4000,
    background: 'rgba(20,22,30,0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Noto Serif SC", serif',
  };

  const card: CSSProperties = {
    background: 'rgba(250,248,243,0.98)',
    border: '1px solid rgba(168,155,126,0.35)',
    borderRadius: 4,
    padding: 28,
    maxWidth: 920,
    width: 'calc(100% - 48px)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
  };

  const titleRow: CSSProperties = {
    textAlign: 'center',
    marginBottom: 20,
  };

  const titleText: CSSProperties = {
    fontSize: 22,
    color: '#2A2419',
    fontFamily: '"Noto Serif SC", serif',
  };

  const subtitleText: CSSProperties = {
    fontSize: 11,
    letterSpacing: 4,
    color: '#7A6F5A',
    fontFamily: 'JetBrains Mono, monospace',
    marginTop: 6,
  };

  const columnsRow: CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
  };

  const column: CSSProperties = {
    flex: 1,
    padding: '4px 20px',
    display: 'flex',
    flexDirection: 'column',
  };

  const divider: CSSProperties = {
    width: 1,
    background: 'rgba(168,155,126,0.35)',
    alignSelf: 'stretch',
    margin: '0 8px',
  };

  const colHeading: CSSProperties = {
    fontSize: 16,
    color: '#2A2419',
    fontFamily: '"Noto Serif SC", serif',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const recommendBadge: CSSProperties = {
    fontSize: 9,
    fontStyle: 'italic',
    color: 'rgba(168,155,126,0.55)',
    fontFamily: 'JetBrains Mono, monospace',
    letterSpacing: 1,
  };

  const captionLabel: CSSProperties = {
    fontSize: 10,
    letterSpacing: 2,
    color: '#7A6F5A',
    fontFamily: 'JetBrains Mono, monospace',
    marginBottom: 10,
  };

  const stepList: CSSProperties = {
    fontSize: 13,
    color: '#3A3225',
    lineHeight: 1.7,
    margin: '0 0 14px 18px',
    padding: 0,
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 12,
    background: '#FFFDF8',
    border: '1px solid rgba(168,155,126,0.45)',
    borderRadius: 2,
    color: '#2A2419',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const errorText: CSSProperties = {
    fontSize: 11,
    color: '#9A2E2E',
    marginTop: 6,
    fontFamily: '"Noto Serif SC", serif',
  };

  const buttonStyle: CSSProperties = {
    marginTop: 12,
    padding: '10px 14px',
    background: '#2A2419',
    color: '#FAF8F3',
    border: '1px solid #2A2419',
    borderRadius: 2,
    fontFamily: '"Noto Serif SC", serif',
    fontSize: 13,
    letterSpacing: 2,
    cursor: 'pointer',
  };

  const guestButtonStyle: CSSProperties = {
    ...buttonStyle,
    background: 'transparent',
    color: '#2A2419',
  };

  const localNote: CSSProperties = {
    fontSize: 10,
    color: '#7A6F5A',
    fontFamily: '"Noto Serif SC", serif',
    marginTop: 10,
    letterSpacing: 1,
  };

  const limitList: CSSProperties = {
    fontSize: 13,
    color: '#3A3225',
    lineHeight: 1.7,
    margin: '0 0 14px 18px',
    padding: 0,
  };

  const limitSubtitle: CSSProperties = {
    fontSize: 11,
    color: '#7A6F5A',
    fontFamily: '"Noto Serif SC", serif',
    marginTop: 8,
    fontStyle: 'italic',
  };

  const linkStyle: CSSProperties = {
    color: '#5A6F8A',
    textDecoration: 'underline',
  };

  const providerRow: CSSProperties = {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  };

  const providerPillBase: CSSProperties = {
    flex: 1,
    padding: '8px 10px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    letterSpacing: 1,
    border: '1px solid #2A2419',
    borderRadius: 2,
    cursor: 'pointer',
    textAlign: 'center',
  };

  const providerPillSelected: CSSProperties = {
    ...providerPillBase,
    background: '#2A2419',
    color: '#FAF8F3',
  };

  const providerPillUnselected: CSSProperties = {
    ...providerPillBase,
    background: 'transparent',
    color: '#2A2419',
  };

  return (
    <div
      data-testid="onboarding-gate"
      style={root}
      onClick={(e) => {
        // Backdrop click does not dismiss. Stop propagation only when target is the root.
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      onKeyDown={handleBackdropKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={titleRow}>
          <div style={titleText}>欢迎来到 看山书房</div>
          <div style={subtitleText}>第一步 · 选择运行方式</div>
        </div>
        <div style={columnsRow}>
          {/* Left column: BYO key */}
          <div style={column} data-testid="onboarding-byo-column">
            <div style={colHeading}>
              <span>自带密钥</span>
              <span style={recommendBadge}>推荐</span>
            </div>
            <div style={captionLabel}>BYO · LLM API KEY</div>
            <div style={providerRow}>
              <button
                type="button"
                data-testid="onboarding-provider-kimi"
                style={provider === 'kimi' ? providerPillSelected : providerPillUnselected}
                onClick={() => setProvider('kimi')}
              >
                Kimi (推荐 · 比赛额度)
              </button>
              <button
                type="button"
                data-testid="onboarding-provider-deepseek"
                style={provider === 'deepseek' ? providerPillSelected : providerPillUnselected}
                onClick={() => setProvider('deepseek')}
              >
                DeepSeek
              </button>
            </div>
            {provider === 'kimi' ? (
              <ol style={stepList}>
                <li>
                  前往{' '}
                  <a
                    href="https://platform.moonshot.cn"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkStyle}
                  >
                    platform.moonshot.cn
                  </a>{' '}
                  注册
                </li>
                <li>在控制台创建一个密钥</li>
                <li>比赛期间使用组委会 ¥199 额度（不需自行充值）</li>
              </ol>
            ) : (
              <ol style={stepList}>
                <li>
                  注册{' '}
                  <a
                    href="https://platform.deepseek.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkStyle}
                  >
                    platform.deepseek.com
                  </a>
                </li>
                <li>在 API 控制台创建一个密钥</li>
                <li>充值 ¥10 即可玩通整个工作台 (~10 万 tokens)</li>
              </ol>
            )}
            <input
              data-testid="onboarding-api-key-input"
              type="text"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyInputKeyDown}
              placeholder="sk-..."
              style={inputStyle}
              spellCheck={false}
              autoComplete="off"
            />
            {error && (
              <div data-testid="onboarding-error" style={errorText}>
                {error}
              </div>
            )}
            <button
              type="button"
              data-testid="onboarding-byo-submit"
              style={buttonStyle}
              onClick={submitByoKey}
            >
              开始使用 →
            </button>
            <div style={localNote}>密钥仅保存在本机 · 不上传至我们的服务器</div>
          </div>

          <div style={divider} aria-hidden />

          {/* Right column: guest / cache-demo mode */}
          <div style={column} data-testid="onboarding-guest-column">
            <div style={colHeading}>
              <span>{publicMode ? '演示模式' : '受限模式'}</span>
              {!guestModeAvailable && !publicMode && (
                <span style={recommendBadge}>本部署暂未开放</span>
              )}
              {publicMode && <span style={recommendBadge}>缓存回放</span>}
            </div>
            <div style={captionLabel}>
              {publicMode ? 'DEMO · CACHED REPLAY ONLY' : 'GUEST · NO KEY REQUIRED'}
            </div>
            {publicMode ? (
              <ul style={limitList}>
                <li>预录制的演示流程可正常回放</li>
                <li>未缓存的对话会返回 “请提供您的 API key” 提示</li>
                <li>编辑器、档案库、工作台框架完全可用</li>
                <li>不会使用作者本人的 LLM 额度</li>
              </ul>
            ) : (
              <ul style={limitList}>
                <li>每小时 60 次 LLM 请求</li>
                <li>每天 200 次 LLM 请求</li>
                <li>同时最多 3 个请求</li>
                <li>跨设备/跨网络共享额度（按 IP 计费）</li>
              </ul>
            )}
            <div style={limitSubtitle}>
              {publicMode
                ? '本次比赛期间的公开访问采用缓存模式。想跑真实 AI，请用左侧自带密钥（仅本机保存）。'
                : guestModeAvailable
                  ? '适合: 仅想快速看看；想完整体验请用自己的密钥'
                  : '此预览部署未配置共享额度。AI 功能请使用左侧自带密钥；浏览界面 / lore 门户 / 工作台框架不需密钥也可正常使用。'}
            </div>
            <button
              type="button"
              data-testid="onboarding-guest-submit"
              style={
                publicMode || guestModeAvailable
                  ? guestButtonStyle
                  : { ...guestButtonStyle, opacity: 0.4, cursor: 'not-allowed' }
              }
              onClick={publicMode || guestModeAvailable ? submitGuest : undefined}
              disabled={!publicMode && !guestModeAvailable}
              aria-disabled={!publicMode && !guestModeAvailable}
            >
              {publicMode
                ? '看演示 (缓存模式) →'
                : guestModeAvailable
                  ? '我了解，先体验受限版本 →'
                  : '受限模式不可用'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
