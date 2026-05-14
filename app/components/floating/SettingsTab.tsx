'use client';
// Settings panel — demo-day collapse (2026-05-13). The bare provider radio
// was retired; provider choice now lives behind the "实时模式" toggle which
// flips CACHE_MODE from cache-only to live-only and accepts a BYO API key.
// In cache-only mode (default), every fox returns instant pre-seeded
// responses with zero LLM calls.

import { useEffect, useState } from 'react';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';
import { useAiErrorStore } from '@/lib/store/ai-error';

const LIVE_KEY = 'kanshan-live-mode';
const COOKIE_NAME = 'kanshan-cache-mode';

type Provider = 'kimi' | 'deepseek';

interface LiveModeRecord {
  enabled: boolean;
  provider?: Provider;
  apiKey?: string;
}

function readLiveMode(): LiveModeRecord {
  if (typeof window === 'undefined') return { enabled: false };
  try {
    const raw = window.localStorage.getItem(LIVE_KEY);
    if (!raw) return { enabled: false };
    const parsed = JSON.parse(raw) as LiveModeRecord;
    return parsed && typeof parsed === 'object' ? parsed : { enabled: false };
  } catch {
    return { enabled: false };
  }
}

function writeLiveMode(record: LiveModeRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LIVE_KEY, JSON.stringify(record));
  } catch { /* localStorage unavailable */ }
  // Server reads this cookie via `modeFromHeaders` in app/lib/cache/wrap.ts.
  // Setting it to live-only flips routes off the cache lookup path entirely.
  const value = record.enabled ? 'live-only' : 'cache-only';
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  // Also retain the provider for legacy routes that read it from cookies.
  if (record.enabled && record.provider) {
    document.cookie = `kanshan-provider=${record.provider}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

function validateKey(k: string): string | null {
  const trimmed = k.trim();
  if (!trimmed) return '请输入密钥';
  if (!trimmed.startsWith('sk-')) return '密钥格式不对，应以 sk- 开头';
  if (trimmed.length < 20) return '密钥太短';
  return null;
}

export function SettingsTab() {
  const [live, setLive] = useState<LiveModeRecord>({ enabled: false });
  const [draftProvider, setDraftProvider] = useState<Provider>('kimi');
  const [draftKey, setDraftKey] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    // SSR can't access localStorage; sync once on mount.
    const r = readLiveMode();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive(r);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (r.provider) setDraftProvider(r.provider);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (r.apiKey) setDraftKey(r.apiKey);
  }, []);

  const onToggleLive = (next: boolean): void => {
    if (!next) {
      const cleared: LiveModeRecord = { enabled: false };
      setLive(cleared);
      writeLiveMode(cleared);
      setKeyError(null);
      useAiErrorStore.getState().push({ message: '已切回缓存演示模式' });
      return;
    }
    // Turning ON only flips the local toggle; saving the key actually
    // commits it. This lets the user see the form before "saving".
    setLive({ enabled: true, provider: draftProvider, apiKey: '' });
  };

  const onSaveLive = (): void => {
    const err = validateKey(draftKey);
    if (err) {
      setKeyError(err);
      return;
    }
    setKeyError(null);
    const record: LiveModeRecord = {
      enabled: true,
      provider: draftProvider,
      apiKey: draftKey.trim(),
    };
    setLive(record);
    writeLiveMode(record);
    useAiErrorStore.getState().push({ message: '实时模式已启用 · 下一次调用将命中真实模型' });
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
          LIVE MODE · ACCOUNT · KEYBOARD · COMPLIANCE
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px' }}>
        {/* Live mode section */}
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
            实时模式
          </h3>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 3,
              border: `1px solid ${live.enabled ? '#1772F6' : 'rgba(23,114,246,0.18)'}`,
              background: live.enabled ? 'rgba(23,114,246,0.06)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              data-testid="settings-live-toggle"
              checked={live.enabled}
              onChange={(e) => onToggleLive(e.target.checked)}
              aria-label="实时模式开关"
            />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                实时模式 · 调用真实 LLM
              </span>
              <span style={{ fontSize: 10, color: '#5A6270' }}>
                开启后所有狐影将使用真实模型推理（约 2–8 秒延迟）。需要自带 Kimi 或 DeepSeek API key。
              </span>
            </span>
          </label>

          {live.enabled && (
            <div
              data-testid="settings-live-form"
              style={{
                marginTop: 10,
                padding: '10px 12px',
                border: '1px solid rgba(23,114,246,0.18)',
                borderRadius: 3,
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                {(['kimi', 'deepseek'] as Provider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    data-testid={`settings-live-provider-${p}`}
                    onClick={() => setDraftProvider(p)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: 11,
                      border: '1px solid #1772F6',
                      background: draftProvider === p ? '#1772F6' : 'transparent',
                      color: draftProvider === p ? '#fff' : '#1772F6',
                      borderRadius: 2,
                      cursor: 'pointer',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {p === 'kimi' ? 'Kimi-K2' : 'DeepSeek-V3'}
                  </button>
                ))}
              </div>
              <input
                type="password"
                data-testid="settings-live-api-key"
                value={draftKey}
                onChange={(e) => {
                  setDraftKey(e.target.value);
                  if (keyError) setKeyError(null);
                }}
                placeholder="sk-..."
                style={{
                  padding: '8px 10px',
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  border: '1px solid rgba(23,114,246,0.35)',
                  borderRadius: 2,
                  background: '#FFFDF8',
                  color: '#1A1F2A',
                  outline: 'none',
                }}
                spellCheck={false}
                autoComplete="off"
              />
              {keyError && (
                <div style={{ fontSize: 11, color: '#9A2E2E' }}>{keyError}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  data-testid="settings-live-save"
                  onClick={onSaveLive}
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    border: '1px solid #1772F6',
                    background: '#1772F6',
                    color: '#fff',
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontFamily: '"Noto Serif SC", serif',
                  }}
                >
                  保存并启用
                </button>
              </div>
              <div style={{ fontSize: 10, color: '#7A8B9F' }}>
                密钥仅保存在本机浏览器 localStorage · 不上传至我们的服务器
              </div>
            </div>
          )}
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
            <li>关键链路只用 Kimi / DeepSeek (国产已备案) — 我们自愿选境内，避免备案边界争议。</li>
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
            看山书房 · v0.2 · 2026-05-14 知乎黑客松提交版
          </div>
        </section>

        {/* r5 TASK J (李大海 P1): 9 狐拓扑图 · 端侧 / 云端 分布 + 路由可见性 */}
        <section data-testid="settings-topology" style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 12, color: '#5A6270', letterSpacing: 1.5, marginBottom: 10, fontFamily: '"Noto Serif SC", serif' }}>
            9 狐拓扑图 · 端侧 / 云端
          </h3>
          <div style={{ fontSize: 11, color: '#5A6270', lineHeight: 1.7, fontFamily: '"Noto Serif SC", serif', marginBottom: 10 }}>
            9 只狐影 · 端侧 2 只 · 云端 7 只 · 路由全程可见
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(122,102,71,0.30)', textAlign: 'left', color: '#5A6270' }}>
                <th style={{ padding: '4px 0', fontWeight: 600 }}>狐</th>
                <th style={{ padding: '4px 0', fontWeight: 600 }}>位置</th>
                <th style={{ padding: '4px 0', fontWeight: 600 }}>引擎</th>
                <th style={{ padding: '4px 0', fontWeight: 600 }}>典型时延</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: '看心', loc: '端', engine: '规则匹配 (xin-detect.ts)', latency: '~0.5 ms', accent: '#1F5B47' },
                { name: '看典', loc: '端', engine: 'JSON / BGE-M3 (可选 OPFS)', latency: '~80 ms', accent: '#1F5B47' },
                { name: '看山', loc: '云', engine: 'Kimi-K2 (调度 + 工具路由)', latency: '~1.5 s', accent: '#7A6647' },
                { name: '看水', loc: '云', engine: 'PubMed API + LLM 综述', latency: '~1.4 s', accent: '#7A6647' },
                { name: '看势', loc: '云', engine: '知乎热榜 API + 相关度排序', latency: '~0.8 s', accent: '#7A6647' },
                { name: '看墨', loc: '云', engine: 'DeepSeek-V3 + BGE-M3 reranker', latency: '~3 × 11 s 迭代', accent: '#7A6647' },
                { name: '看文', loc: '云', engine: 'DeepSeek-V3 × 4 masks', latency: '~6 s 全部', accent: '#7A6647' },
                { name: '看纹', loc: '云', engine: 'DeepSeek-V3 自定面具', latency: '~3 s', accent: '#7A6647' },
                { name: '看辩', loc: '云', engine: 'DeepSeek-V3 (正/反双角色)', latency: '~4 s', accent: '#7A6647' },
              ].map((row) => (
                <tr key={row.name} style={{ borderBottom: '1px solid rgba(122,102,71,0.12)' }}>
                  <td style={{ padding: '5px 0', fontFamily: '"Noto Serif SC", serif', fontWeight: 600 }}>{row.name}</td>
                  <td style={{ padding: '5px 0' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: 9,
                      color: '#FBFAF7',
                      background: row.accent,
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontWeight: 600,
                      letterSpacing: 0.4,
                      fontFamily: '"Noto Serif SC", serif',
                    }}>{row.loc}</span>
                  </td>
                  <td style={{ padding: '5px 0', color: '#5A6270' }}>{row.engine}</td>
                  <td style={{ padding: '5px 0', color: 'rgba(122,102,71,0.85)' }}>{row.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(122,102,71,0.75)', fontFamily: '"Noto Serif SC", serif', lineHeight: 1.6 }}>
            <strong>路由可见性</strong>：底部 OrchestrationStrip 实时显示每只狐影的状态与跨狐协作次数；任何一次工具调用都可以在浏览器 DevTools → Network 中查到对应的 `/api/agents/*` 请求。
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
