'use client';
// Settings panel — surfaces provider choice + onboarding reset + per-fox
// hotkey reference. Persona-review 2026-05-11 P0 (Xu Linchen): the previous
// implementation was a TODO placeholder and shipped as a blank rectangle to
// any judge who clicked the gear icon. Now: minimal but real.

import { useEffect, useState } from 'react';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';
import { useAiErrorStore } from '@/lib/store/ai-error';

interface OnboardingProfile {
  provider?: 'kimi' | 'deepseek' | 'qwen-local' | string;
}

type Provider = 'kimi' | 'deepseek' | 'qwen-local';

const PROVIDER_LABELS: Record<Provider, { label: string; sub: string }> = {
  kimi: { label: 'Kimi-K2 (默认)', sub: 'Moonshot AI · 国产 · 组委会 ¥199 额度' },
  deepseek: { label: 'DeepSeek-V3 / R1', sub: 'BYO key · 国产 · 备案 ✓' },
  'qwen-local': { label: '本地 Qwen3-72B', sub: '占位 · 自带 endpoint 时启用' },
};

function readProvider(): Provider {
  if (typeof window === 'undefined') return 'kimi';
  try {
    const raw = window.localStorage.getItem('kanshan-onboarding');
    if (!raw) return 'kimi';
    const profile = JSON.parse(raw) as OnboardingProfile;
    const p = profile.provider;
    if (p === 'kimi' || p === 'deepseek' || p === 'qwen-local') return p;
    return 'kimi';
  } catch {
    return 'kimi';
  }
}

function writeProvider(p: Provider): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem('kanshan-onboarding');
    const profile: OnboardingProfile = raw ? (JSON.parse(raw) as OnboardingProfile) : {};
    profile.provider = p;
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify(profile));
  } catch {
    // localStorage may be unavailable (private mode); the radio update still
    // reflects in component state.
  }
}

export function SettingsTab() {
  const [provider, setProvider] = useState<Provider>('kimi');
  useEffect(() => {
    // SSR can't access localStorage; sync once on mount to the persisted value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProvider(readProvider());
  }, []);

  const handleProvider = (p: Provider): void => {
    setProvider(p);
    writeProvider(p);
  };

  const handleResetOnboarding = (): void => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('重置「初次见面」对话框？下次访问会重新出现，但当前会话不受影响。')) return;
    try {
      window.localStorage.removeItem('kanshan-onboarding');
      window.alert('已重置。刷新或下次访问时会重新出现。');
    } catch {
      window.alert('localStorage 不可用，无法重置。');
    }
  };

  return (
    <div
      data-testid="settings-tab"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#FAFBFD',
        fontFamily: '"Noto Serif SC", serif',
        color: '#1A1F2A',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '10px 14px 8px',
          borderBottom: '1px solid rgba(23,114,246,0.18)',
          background: '#fff',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600 }}>设置 · 看山书房</div>
        <div
          style={{
            fontSize: 9.5,
            color: '#7A8B9F',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 0.4,
            marginTop: 4,
          }}
        >
          PROVIDER · ACCOUNT · KEYBOARD · COMPLIANCE
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px' }}>
        {/* Provider section */}
        <section style={{ marginBottom: 22 }}>
          <h3
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: '#1772F6',
              letterSpacing: 0.6,
              marginBottom: 8,
              fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase',
            }}
          >
            LLM Provider
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => {
              const meta = PROVIDER_LABELS[p];
              const active = provider === p;
              const disabled = p === 'qwen-local';
              return (
                <label
                  key={p}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 3,
                    border: `1px solid ${active ? '#1772F6' : 'rgba(23,114,246,0.18)'}`,
                    background: active ? 'rgba(23,114,246,0.06)' : 'transparent',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.55 : 1,
                  }}
                >
                  <input
                    type="radio"
                    name="kanshan-provider"
                    value={p}
                    checked={active}
                    disabled={disabled}
                    onChange={() => !disabled && handleProvider(p)}
                    style={{ marginTop: 3 }}
                    aria-label={meta.label}
                  />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{meta.label}</span>
                    <span style={{ fontSize: 10, color: '#5A6270' }}>{meta.sub}</span>
                    {disabled && (
                      <span style={{ fontSize: 9.5, color: '#B85543', fontFamily: 'JetBrains Mono, monospace' }}>
                        敬请期待 · 等本地 endpoint 接入完成
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Onboarding reset */}
        <section style={{ marginBottom: 22 }}>
          <h3
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: '#1772F6',
              letterSpacing: 0.6,
              marginBottom: 8,
              fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase',
            }}
          >
            Onboarding
          </h3>
          <button
            type="button"
            data-testid="settings-reset-onboarding"
            onClick={handleResetOnboarding}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              border: '1px solid rgba(184,85,67,0.45)',
              background: 'transparent',
              color: '#B85543',
              fontFamily: '"Noto Serif SC", serif',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            重置「初次见面」对话框
          </button>
          <p style={{ fontSize: 10.5, color: '#5A6270', marginTop: 6 }}>
            清除浏览器本地的入门状态。下次访问 / 顾婉昔切换时会重新弹出 BYO key 引导。
          </p>
        </section>

        {/* Hotkey reference */}
        <section style={{ marginBottom: 22 }}>
          <h3
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: '#1772F6',
              letterSpacing: 0.6,
              marginBottom: 8,
              fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase',
            }}
          >
            Keyboard
          </h3>
          <table
            style={{
              width: '100%',
              fontSize: 11,
              borderCollapse: 'collapse',
              fontFamily: '"Noto Serif SC", serif',
            }}
          >
            <tbody>
              {[
                ['Ctrl/Cmd + B', '加粗'],
                ['Ctrl/Cmd + I', '斜体'],
                ['Ctrl/Cmd + Z', '撤销 · 编辑器内'],
                ['Ctrl/Cmd + Shift + Z', '重做 · 编辑器内'],
                ['Esc', '关闭浮窗 / 取消便签'],
                ['Enter', '在 看山 输入框中：发送（IME 组字中除外）'],
                ['Shift + Enter', '在 看山 输入框中：换行'],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid rgba(23,114,246,0.08)' }}>
                  <td
                    style={{
                      padding: '5px 0 5px 0',
                      width: 160,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10.5,
                      color: '#3A4252',
                    }}
                  >
                    {k}
                  </td>
                  <td style={{ padding: '5px 0', color: '#1A1F2A' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Compliance posture */}
        <section style={{ marginBottom: 22 }}>
          <h3
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: '#1772F6',
              letterSpacing: 0.6,
              marginBottom: 8,
              fontFamily: 'JetBrains Mono, monospace',
              textTransform: 'uppercase',
            }}
          >
            Compliance
          </h3>
          <ul
            style={{
              fontSize: 11.5,
              color: '#1A1F2A',
              lineHeight: 1.7,
              listStyle: 'disc',
              paddingLeft: 18,
            }}
          >
            <li>关键链路只用 Kimi / DeepSeek (国产已备案) — 我们自愿选境内，避免 备案 边界争议。</li>
            <li>输出双标识符合 GB 45438-2025，可追溯。</li>
            <li>不训练答主内容；档案库不入第三方训练集。</li>
            <li>引用全部实时检索 · 可点击溯源 · 不做热点自动扩写。</li>
            <li>设置仅本地保存 · 不同步至云。</li>
          </ul>
        </section>

        {/* 知乎账号 section */}
        <ZhihuAccountSection />

        {/* Version footer */}
        <section>
          <div
            style={{
              fontSize: 10,
              color: '#7A8B9F',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 0.4,
            }}
          >
            看山书房 · v0.1 · 2026-05-14 知乎黑客松提交版
          </div>
        </section>
      </div>

      <ComplianceLine>设置仅本地保存 · 不同步至云</ComplianceLine>
    </div>
  );
}

function ZhihuAccountSection(): React.ReactElement {
  const fullname = useZhihuSessionStore((s) => s.fullname);
  const uid = useZhihuSessionStore((s) => s.uid);
  const avatarPath = useZhihuSessionStore((s) => s.avatarPath);
  const clear = useZhihuSessionStore((s) => s.clear);

  const onConnect = (): void => {
    window.open('/api/auth/zhihu/start', '_blank');
  };

  const onDisconnect = async (): Promise<void> => {
    if (!window.confirm('退出登录后会回到登录引导，未同步到云端的本地数据不会丢失，但会换一个独立访客身份。确定继续？')) return;
    try {
      await fetch('/api/auth/zhihu/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // best-effort
    }
    clear();
    try {
      // Wipe the onboarding-completed flag so OnboardingGate re-mounts at
      // the zhihu-login step on next paint. Without this the user is left
      // in a half-state: logged out at the server but still inside the
      // workspace, with no path back to the login wall.
      window.localStorage.removeItem('kanshan-onboarding');
    } catch { /* localStorage unavailable — non-fatal */ }
    useAiErrorStore.getState().push({ message: '已退出知乎账号 · 即将刷新' });
    window.setTimeout(() => window.location.reload(), 600);
  };

  return (
    <section style={{ marginBottom: 22 }} data-testid="settings-zhihu-section">
      <h3
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: '#1772F6',
          letterSpacing: 0.6,
          marginBottom: 8,
          fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase',
        }}
      >
        知乎账号
      </h3>
      {!fullname ? (
        <button
          type="button"
          data-testid="settings-zhihu-connect"
          onClick={onConnect}
          style={{
            padding: '6px 12px',
            fontSize: 11,
            border: '1px solid #0084FF',
            background: 'transparent',
            color: '#0084FF',
            fontFamily: '"Noto Serif SC", serif',
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          连接你的知乎账号 ↗
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 14,
            background: avatarPath ? '#fff' : '#0084FF',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#fff', overflow: 'hidden',
            flexShrink: 0,
          }}>
            {avatarPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPath} alt="" width={28} height={28} style={{ display: 'block', objectFit: 'cover' }} />
            ) : fullname.slice(0, 1)}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1F2A' }}>{fullname}</span>
            {uid && (
              <span style={{
                fontSize: 10, color: '#5A6270',
                fontFamily: 'JetBrains Mono, monospace',
              }}>{uid}</span>
            )}
          </div>
          <button
            type="button"
            data-testid="settings-zhihu-disconnect"
            onClick={onDisconnect}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              border: '1px solid rgba(184,85,67,0.45)',
              background: 'transparent',
              color: '#B85543',
              fontFamily: '"Noto Serif SC", serif',
              borderRadius: 3,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            退出登录
          </button>
        </div>
      )}
    </section>
  );
}
