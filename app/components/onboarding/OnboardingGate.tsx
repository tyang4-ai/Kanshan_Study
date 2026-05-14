'use client';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useEffect, useState } from 'react';
import { useAccountStore } from '@/lib/store/account';
import { useVaultConsentStore } from '@/lib/store/vault-consent';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';
import { useTweak } from '@/lib/store/tweak';

const STORAGE_KEY = 'kanshan-onboarding';

type Step = 'zhihu-login' | 'demo-notice' | 'vault-consent';

interface OnboardingRecord {
  // 'cache-demo' replaces the previous 'byo-key' | 'guest' modes (2026-05-13).
  // BYO key now lives in Settings → 实时模式; the welcome screen is just a
  // one-button "I understand we're in cache mode" gate.
  mode: 'cache-demo';
  dismissedAt: string;
}

interface OnboardingGateProps {
  /**
   * Pre-resolved onboarding background image URL (server-side via
   * `getOnboardingBgUrl`). Null when the asset is absent.
   */
  bgUrl?: string | null;
}

export function OnboardingGate({ bgUrl = null }: OnboardingGateProps = {}) {
  // Hydration-safe pattern: server + client first render BOTH return null,
  // then a post-mount effect sets the real visibility from localStorage.
  const [hidden, setHidden] = useState<boolean>(true);
  const onboardingBgDarken = useTweak('onboarding.bg.darken', 0.55);
  // OAuth-first flow: zhihu-login is the entry step. Once the session has a
  // real fullname we advance to demo-notice, then vault-consent.
  const [step, setStep] = useState<Step>('zhihu-login');
  const [pendingRecord, setPendingRecord] = useState<OnboardingRecord | null>(null);
  const activeAccount = useAccountStore((s) => s.active);
  const acceptVaultConsent = useVaultConsentStore((s) => s.accept);
  const hydrateVaultConsent = useVaultConsentStore((s) => s.hydrate);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(window.localStorage.getItem(STORAGE_KEY) !== null);
  }, []);

  const sessionFullname = useZhihuSessionStore((s) => s.fullname);
  const hydrateZhihuSession = useZhihuSessionStore((s) => s.hydrate);
  // r6 OAuth-bypass: this hook MUST be hoisted above the `if (hidden) return null`
  // gate below — calling useZhihuSessionStore() inside onSkipOAuth (post-gate)
  // creates a Rules-of-Hooks violation that crashes the tree on logout
  // (React error #310 — hook count drops when hidden flips back to false).
  const skipLogin = useZhihuSessionStore((s) => s.skipLogin);
  useEffect(() => {
    void hydrateZhihuSession();
  }, [hydrateZhihuSession]);
  useEffect(() => {
    if (step !== 'zhihu-login') return;
    if (sessionFullname) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep('demo-notice');
    }
  }, [step, sessionFullname]);

  if (hidden) return null;

  const bgLayer = bgUrl ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bgUrl}
        alt=""
        aria-hidden
        data-testid="onboarding-bg-image"
        style={{
          position: 'fixed', inset: 0, width: '100vw', height: '100vh',
          objectFit: 'cover', zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 1,
          background: `rgba(26, 31, 42, ${onboardingBgDarken})`,
        }}
      />
    </>
  ) : null;

  const finalizeRecord = (record: OnboardingRecord) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setHidden(true);
    window.dispatchEvent(new CustomEvent('kanshan-onboarding-done'));
  };

  const onZhihuLogin = () => {
    window.location.href = '/api/auth/zhihu/start';
  };

  // r6 OAuth-bypass (2026-05-13): when 知乎 OAuth is unreachable (their side
  // returns 404 on /me + 200-with-error-body on /oauth POST), judges can opt
  // into pure演示模式. Skip seats a stable per-browser 演示用户 identity in
  // Zustand state + a localStorage flag — no server cookie needed. All
  // workspace edits flow into the same persisted stores (editor-tabs,
  // corkboard, last-visit, persona-masks), so they stay browser-cached and
  // isolated per judge / per machine.
  // NB: `skipLogin` itself is hoisted above the `if (hidden) return null` gate
  // (see top of component) to keep hook order stable across logout.
  const onSkipOAuth = () => {
    skipLogin();
    // setStep below will fire from the sessionFullname effect once the store
    // updates, but call it directly too so the transition is instant.
    setStep('demo-notice');
  };

  const acknowledgeDemoNotice = () => {
    // The cache-demo welcome screen has no inputs — single button just
    // advances to vault-consent. Default the demo persona cookie so the
    // server-side vault routes see 顾婉昔 from the first request.
    document.cookie = 'kanshan-account=guwanxi; path=/; max-age=31536000; SameSite=Lax';
    const record: OnboardingRecord = {
      mode: 'cache-demo',
      dismissedAt: new Date().toISOString(),
    };
    setPendingRecord(record);
    setStep('vault-consent');
  };

  const acceptVault = () => {
    hydrateVaultConsent(activeAccount);
    acceptVaultConsent();
    if (pendingRecord) finalizeRecord(pendingRecord);
  };

  const declineVault = () => {
    hydrateVaultConsent(activeAccount);
    if (pendingRecord) finalizeRecord(pendingRecord);
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
    maxWidth: 620,
    width: 'calc(100% - 48px)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
    position: 'relative',
    zIndex: 2,
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

  const consentBodyStyle: CSSProperties = {
    fontSize: 13,
    color: '#3A3225',
    lineHeight: 1.85,
    fontFamily: '"Noto Serif SC", serif',
    margin: '8px 4px 18px',
  };

  const consentBulletList: CSSProperties = {
    fontSize: 13,
    color: '#3A3225',
    lineHeight: 1.9,
    margin: '0 0 18px 22px',
    padding: 0,
    fontFamily: '"Noto Serif SC", serif',
  };

  const consentButtonRow: CSSProperties = {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  };

  if (step === 'zhihu-login') {
    return (
      <div
        data-testid="onboarding-gate"
        style={root}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
          }
        }}
        onKeyDown={handleBackdropKeyDown}
        role="dialog"
        aria-modal="true"
      >
        {bgLayer}
        <div
          data-testid="onboarding-zhihu-login-step"
          style={card}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={titleRow}>
            <div style={titleText}>用知乎账号登录</div>
            <div style={subtitleText}>第一步 · 账号</div>
          </div>
          <div style={consentBodyStyle}>登录后你将获得：</div>
          <ul style={consentBulletList}>
            <li>跨设备同步：档案、笔记、写作进度在任意设备共用一个账户</li>
            <li>云端档案库：你的旧文档语风指纹长期保留，不入第三方训练集</li>
            <li>用知乎账号一键发布到知乎，无需重新登录</li>
          </ul>
          <div style={consentBodyStyle}>权限边界：</div>
          <ul style={consentBulletList}>
            <li>只读取昵称 + 头像，不读私信</li>
            <li>不会代你发布、不会绑定永久 token</li>
            <li>「设置 · 账号 · 退出登录」可随时清除会话</li>
          </ul>
          <div style={consentButtonRow}>
            <button
              type="button"
              data-testid="onboarding-zhihu-login"
              style={buttonStyle}
              onClick={onZhihuLogin}
            >
              使用知乎账号登录
            </button>
            <button
              type="button"
              data-testid="onboarding-zhihu-skip"
              style={{
                ...buttonStyle,
                background: 'transparent',
                color: '#1A1815',
                border: '1px solid #2A2419',
                fontWeight: 600,
              }}
              onClick={onSkipOAuth}
            >
              演示模式 · 跳过登录
            </button>
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 11.5,
              color: '#1A1815',
              fontFamily: '"Noto Serif SC", serif',
              lineHeight: 1.6,
              letterSpacing: 0.3,
            }}
          >
            <strong>演示模式</strong>：跳过登录直接进入工作台，所有编辑/便签/档案变更仅保存在<strong>本浏览器</strong>，不上传服务器。适合评委快速体验（如 知乎 OAuth 暂时不可用）。
          </div>
        </div>
      </div>
    );
  }

  if (step === 'vault-consent') {
    return (
      <div
        data-testid="onboarding-gate"
        style={root}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
          }
        }}
        onKeyDown={handleBackdropKeyDown}
        role="dialog"
        aria-modal="true"
      >
        {bgLayer}
        <div
          data-testid="onboarding-vault-consent"
          style={card}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={titleRow}>
            <div style={titleText}>看典 · 档案库使用说明</div>
            <div style={subtitleText}>第三步 · 数据使用同意</div>
          </div>
          <div style={consentBodyStyle}>当你导入文档到看典：</div>
          <ul style={consentBulletList}>
            <li>文件内容存入 Supabase 新加坡区数据库</li>
            <li>文本经 SiliconFlow BGE-M3 切块嵌入，用于语风指纹检索</li>
            <li>你的内容不会进入第三方训练集</li>
            <li>任何时刻可在「看典」面板「导出全部」或「删除全部」</li>
          </ul>
          <div style={consentButtonRow}>
            <button
              type="button"
              data-testid="onboarding-vault-accept"
              style={buttonStyle}
              onClick={acceptVault}
            >
              同意并继续
            </button>
            <button
              type="button"
              data-testid="onboarding-vault-decline"
              style={guestButtonStyle}
              onClick={declineVault}
            >
              暂不开通看典
            </button>
          </div>
        </div>
      </div>
    );
  }

  // step === 'demo-notice'
  return (
    <div
      data-testid="onboarding-gate"
      style={root}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      onKeyDown={handleBackdropKeyDown}
      role="dialog"
      aria-modal="true"
    >
      {bgLayer}
      <div
        data-testid="onboarding-demo-notice"
        style={card}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={titleRow}>
          <div style={titleText}>缓存演示模式</div>
          <div style={subtitleText}>第二步 · 演示说明</div>
        </div>
        <ul style={consentBulletList}>
          <li>本演示采用 <strong>预生成缓存</strong>，所有狐影回答即时返回，不调用任何 LLM、不消耗任何配额</li>
          <li>请按编辑器中的<strong>分步引导文档</strong>操作，以体验完整的「看山 → 看水/看典 → 看心 → 看文 → 看墨 → 发布」工作流</li>
          <li>若想看真实模型生成：进入<strong>右下角设置 → 实时模式</strong>，开启并填入你自带的 Kimi 或 DeepSeek 密钥</li>
          <li>你的 知乎 OAuth 身份保持不变；发布会用你真实的账号推送 Pin</li>
        </ul>
        <div style={consentButtonRow}>
          <button
            type="button"
            data-testid="onboarding-demo-acknowledge"
            style={buttonStyle}
            onClick={acknowledgeDemoNotice}
          >
            我理解，开始体验 →
          </button>
        </div>
      </div>
    </div>
  );
}
