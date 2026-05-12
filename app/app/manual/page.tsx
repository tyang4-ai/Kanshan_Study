import type { Metadata } from 'next';
import Link from 'next/link';
import { FOXES } from '@/lib/foxes/registry';

export const metadata: Metadata = {
  title: '看山书房 · 使用手册',
  description: '看山书房工作台的使用指引：三段工作流、九狐分工、快捷键、合规系统。',
};

// Locked ComplianceLine text per surface (mirror of
// .claude/rules/compliance-strings.md — never paraphrase here).
const COMPLIANCE_SURFACES: ReadonlyArray<{ kind: string; text: string }> = [
  { kind: 'persona', text: '仿真读者 · 非真人 · 不可作为审稿依据' },
  { kind: 'debate', text: '辩论由模型扮演 · 不代表真实立场' },
  { kind: 'voice-diff', text: '输出已添加 GB 45438 标识 · AI 生成可追溯' },
  { kind: 'vault', text: '档案不入第三方训练集 · 仅你可见' },
  { kind: 'research', text: '引用全部实时检索 · 不入训练集' },
  { kind: 'trends', text: '看势仅供选题灵感 · 不做热点自动扩写' },
  { kind: 'stats', text: '数据仅来自你已发布作品 · 不读私信' },
  { kind: 'settings', text: '设置仅本地保存 · 不同步至云' },
];

// Stage → fox ids. Mirrors the FoxVerb taxonomy in lib/foxes/registry.ts.
// 看山 (orchestrate) is the host; not listed per-stage.
const STAGE_GROUPS: ReadonlyArray<{ stage: string; foxIds: ReadonlyArray<string>; lead: string }> = [
  {
    stage: '灵感激发',
    foxIds: ['shi', 'shui', 'dian'],
    lead: '从热榜、考据、档案库三路扒拉素材——选题不再从零开始。',
  },
  {
    stage: '思路梳理',
    foxIds: ['wen', 'wen2', 'xin'],
    lead: '让 4 种读者先读一遍；正反两派吵一架；皮影狐审一次合规边界。',
  },
  {
    stage: '内容精加工',
    foxIds: ['mo', 'jing'],
    lead: '看墨按你的语风重写选段；发布后看镜回流数据，下一篇更准。',
  },
];

const SHORTCUTS: ReadonlyArray<{ chord: string; action: string }> = [
  { chord: 'Ctrl+Shift+M', action: '让看墨润色当前选段（GENERIC vs VOICE 双栏对比）' },
  { chord: 'Ctrl+Shift+R', action: '召集看文读者团（4 种读者并行点评）' },
  { chord: 'Ctrl+Shift+F', action: '让看水查证选段（实时检索 · 不入训练集）' },
];

const SINGLETON_TABS: ReadonlyArray<{ key: string; title: string }> = [
  { key: 'vault', title: '看典 · 档案库' },
  { key: 'settings', title: '看山书房 · 设置' },
  { key: 'stats', title: '看镜 · 数据看板' },
  { key: 'trends', title: '看势 · 热榜雷达' },
];

const MULTI_TABS: ReadonlyArray<{ key: string; title: string }> = [
  { key: 'persona', title: '看文 · 读者反应' },
  { key: 'debate', title: '看文 · 看纹辩论' },
  { key: 'voice-diff', title: '看墨 · 润色' },
  { key: 'research', title: '看水 · 查证' },
];

// Closing 三句 — locked from Documents/kanshan_lore.md A.三章 emotional payoff.
const LORE_CLOSING: ReadonlyArray<string> = [
  '九重书房之门，唯读者能开。',
  '看山从未抬头看过自己的尾色。',
  '也许有一天，会有读者告诉它。',
];

export default function ManualPage(): React.ReactElement {
  return (
    <main
      data-testid="manual-page-root"
      style={{
        minHeight: '100vh',
        background: '#F4ECD8',
        color: '#2A2419',
        padding: '48px 24px 96px',
        fontFamily: '"Noto Sans SC", sans-serif',
      }}
    >
      <article
        style={{
          maxWidth: 880,
          margin: '0 auto',
          background: '#FFFDF8',
          border: '1px solid rgba(168,155,126,0.45)',
          borderRadius: 4,
          padding: '48px 56px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
        }}
      >
        <header style={{ marginBottom: 36, borderBottom: '1px solid rgba(168,155,126,0.35)', paddingBottom: 20 }}>
          <h1
            style={{
              fontFamily: '"Noto Serif SC", serif',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: 6,
              margin: 0,
              color: '#1A1815',
            }}
          >
            看山书房 · 使用手册
          </h1>
          <p
            style={{
              marginTop: 10,
              fontSize: 13,
              letterSpacing: 2,
              color: '#7A6F5A',
              fontFamily: '"Noto Serif SC", serif',
            }}
          >
            灵感激发 · 思路梳理 · 内容精加工 — 多智能体工作台的使用指引
          </p>
          <p style={{ marginTop: 12, fontSize: 12 }}>
            <Link
              href="/"
              data-testid="manual-back-link"
              style={{ color: '#7A8B9F', textDecoration: 'none', letterSpacing: 1.5, fontFamily: '"Noto Serif SC", serif' }}
            >
              ← 返回工作台
            </Link>
          </p>
        </header>

        {/* Section 1 — three-stage workflow */}
        <section data-testid="manual-section-1" style={sectionStyle}>
          <h2 style={h2Style}>一、三段工作流</h2>
          <p style={leadStyle}>
            九只狐狸分别守 3 个阶段，对应知乎官方的「灵感激发 → 思路梳理 → 内容精加工」框架。
            按段差遣，单次任务可串行也可并行。
          </p>
          <ul style={ulStyle}>
            {STAGE_GROUPS.map((g) => (
              <li key={g.stage} style={liStyle}>
                <strong style={{ color: '#1A1815', letterSpacing: 2, fontFamily: '"Noto Serif SC", serif' }}>{g.stage}</strong>
                <span style={{ color: '#5A4F3A', marginLeft: 8 }}>
                  {g.foxIds.map((id) => {
                    const f = FOXES.find((x) => x.id === id);
                    return f ? f.name : id;
                  }).join(' · ')}
                </span>
                <div style={{ fontSize: 13, color: '#5A4F3A', marginTop: 4, lineHeight: 1.8 }}>{g.lead}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 2 — nine foxes */}
        <section data-testid="manual-section-2" style={sectionStyle}>
          <h2 style={h2Style}>二、九只狐狸</h2>
          <p style={leadStyle}>
            九狐俱属<strong>刘看山 IP</strong>族系。看山居中编排，余八狐各执一艺。
          </p>
          <table
            data-testid="manual-fox-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: 12,
              fontFamily: '"Noto Serif SC", serif',
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ background: 'rgba(168,155,126,0.12)' }}>
                <th style={thStyle}>名字</th>
                <th style={thStyle}>别称</th>
                <th style={thStyle}>主要工作</th>
                <th style={thStyle}>口头禅</th>
              </tr>
            </thead>
            <tbody>
              {FOXES.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid rgba(168,155,126,0.25)' }}>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: 4,
                        background: f.glow, marginRight: 6, verticalAlign: 'middle',
                      }}
                      aria-hidden
                    />
                    {f.name}
                  </td>
                  <td style={tdStyle}>{f.epithet}</td>
                  <td style={tdStyle}>
                    <span style={{ color: '#7A6F5A', fontSize: 11, letterSpacing: 1.5 }}>{f.verb}</span>
                    <span style={{ display: 'block', color: '#5A4F3A', fontSize: 12 }}>{f.verbSubtitle}</span>
                  </td>
                  <td style={{ ...tdStyle, fontStyle: 'italic', color: '#5A4F3A' }}>{f.catchphrase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Section 3 — keyboard shortcuts */}
        <section data-testid="manual-section-3" style={sectionStyle}>
          <h2 style={h2Style}>三、快捷键</h2>
          <p style={leadStyle}>
            选中正文中的一段话后按下面的组合键，可不开右键菜单直接差遣对应的狐狸。
            IME 输入法状态下不会触发——可以放心打字。
          </p>
          <ul style={ulStyle}>
            {SHORTCUTS.map((s) => (
              <li key={s.chord} style={liStyle}>
                <kbd
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    background: '#2A2724',
                    color: '#E6EFFF',
                    padding: '2px 8px',
                    borderRadius: 3,
                    letterSpacing: 1.2,
                  }}
                >
                  {s.chord}
                </kbd>
                <span style={{ marginLeft: 12, color: '#5A4F3A' }}>{s.action}</span>
              </li>
            ))}
          </ul>
          <p style={{ ...leadStyle, marginTop: 12, fontSize: 12, color: '#7A6F5A' }}>
            右键菜单同样可触发以上三项，并额外提供「召集自定读者（看纹）」「召集辩论（看文 vs 看纹）」等条目。
          </p>
        </section>

        {/* Section 4 — TabbedFloatingWindow */}
        <section data-testid="manual-section-4" style={sectionStyle}>
          <h2 style={h2Style}>四、浮动面板（TabbedFloatingWindow）</h2>
          <p style={leadStyle}>
            所有 agent UI 都挂载于同一个浮动窗口，按 tab 切换。
            <strong>单例 tab</strong> 同时只能开一个，<strong>多实例 tab</strong> 可叠开多个分别针对不同选段。
          </p>
          <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px' }}>
              <h3 style={h3Style}>单例 tab</h3>
              <ul style={ulStyle}>
                {SINGLETON_TABS.map((t) => (
                  <li key={t.key} style={liStyle}>
                    <code style={codeStyle}>{t.key}</code>
                    <span style={{ marginLeft: 10, color: '#5A4F3A' }}>{t.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ flex: '1 1 240px' }}>
              <h3 style={h3Style}>多实例 tab</h3>
              <ul style={ulStyle}>
                {MULTI_TABS.map((t) => (
                  <li key={t.key} style={liStyle}>
                    <code style={codeStyle}>{t.key}</code>
                    <span style={{ marginLeft: 10, color: '#5A4F3A' }}>{t.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Section 5 — compliance */}
        <section data-testid="manual-section-5" style={sectionStyle}>
          <h2 style={h2Style}>五、合规系统</h2>
          <p style={leadStyle}>
            每张 tab 底部的 <strong>ComplianceLine</strong> 文案对应该面板的实际行为约束——文案与架构一致，不做美化包装。
          </p>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: 12,
              fontFamily: '"Noto Serif SC", serif',
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ background: 'rgba(168,155,126,0.12)' }}>
                <th style={thStyle}>面板</th>
                <th style={thStyle}>合规文案（锁定）</th>
              </tr>
            </thead>
            <tbody>
              {COMPLIANCE_SURFACES.map((c) => (
                <tr key={c.kind} style={{ borderBottom: '1px solid rgba(168,155,126,0.25)' }}>
                  <td style={tdStyle}>
                    <code style={codeStyle}>{c.kind}</code>
                  </td>
                  <td style={{ ...tdStyle, color: '#5A4F3A' }}>{c.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ ...leadStyle, marginTop: 12, fontSize: 12, color: '#7A6F5A' }}>
            编辑器页脚的 <strong>看心 · 已审 · N 处声明软化 · M 处出处待补</strong> 计数由 ProvenanceStore 实时统计——
            每次看墨润色 / 看心审议 / 看水补出处都会落账。
          </p>
        </section>

        {/* Section 6 — settings */}
        <section data-testid="manual-section-6" style={sectionStyle}>
          <h2 style={h2Style}>六、设置面板</h2>
          <p style={leadStyle}>
            标题栏右侧齿轮图标打开「看山书房 · 设置」单例 tab。设置仅本地保存（localStorage），不同步至云。
          </p>
          <ul style={ulStyle}>
            <li style={liStyle}>
              <strong style={kStyle}>API Keys</strong>
              <span style={vStyle}>Kimi（Moonshot K2，默认）/ DeepSeek V3 / R1（BYO secondary）。明文展示按掩码处理。</span>
            </li>
            <li style={liStyle}>
              <strong style={kStyle}>九狐狸活动池</strong>
              <span style={vStyle}>多选，至少保留一只。默认 <code style={codeStyle}>{`['mo']`}</code>。选择持久化到 <code style={codeStyle}>kanshan-active-foxes</code>。</span>
            </li>
            <li style={liStyle}>
              <strong style={kStyle}>账号切换</strong>
              <span style={vStyle}>右上「我 / 顾婉昔」profile chip 切换。双账号草稿独立保存，不会互相清空。</span>
            </li>
            <li style={liStyle}>
              <strong style={kStyle}>知乎登录（可选）</strong>
              <span style={vStyle}>不登录也能用全部本地功能；登录后可发布 Pin 到知乎主页。</span>
            </li>
          </ul>
        </section>

        {/* Section 7 — easter egg */}
        <section data-testid="manual-section-7" style={sectionStyle}>
          <h2 style={h2Style}>七、彩蛋 · 信封</h2>
          <p style={leadStyle}>
            标题栏右上角有一枚<strong>蜡封信封</strong>。点开即进入 lore portal —— 北极小镇 · 九重书房 · 雪夜中的看山。
            读完最后三句，你会发现：
          </p>
          <blockquote
            data-testid="manual-lore-closing"
            style={{
              margin: '18px 0 0 0',
              padding: '18px 22px',
              borderLeft: '3px solid #A89B7E',
              background: 'rgba(168,155,126,0.08)',
              fontFamily: '"Noto Serif SC", serif',
              fontSize: 15,
              color: '#1A1815',
              lineHeight: 2.2,
              letterSpacing: 2,
            }}
          >
            {LORE_CLOSING.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </blockquote>
        </section>

        <footer style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid rgba(168,155,126,0.35)', fontSize: 11, color: '#7A6F5A', letterSpacing: 1.5, textAlign: 'center', fontFamily: '"Noto Serif SC", serif' }}>
          看山书房 · 知乎黑客松 2026 · 刘看山 IP 经官方授权使用
        </footer>
      </article>
    </main>
  );
}

const sectionStyle: React.CSSProperties = {
  marginTop: 36,
  paddingTop: 8,
};

const h2Style: React.CSSProperties = {
  fontFamily: '"Noto Serif SC", serif',
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: 4,
  color: '#1A1815',
  margin: '0 0 12px 0',
};

const h3Style: React.CSSProperties = {
  fontFamily: '"Noto Serif SC", serif',
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 2,
  color: '#1A1815',
  margin: '0 0 8px 0',
};

const leadStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.9,
  color: '#3A322A',
  margin: '0 0 6px 0',
};

const ulStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: '8px 0 0 0',
  padding: 0,
};

const liStyle: React.CSSProperties = {
  padding: '8px 0',
  borderBottom: '1px dotted rgba(168,155,126,0.3)',
  fontSize: 13,
  lineHeight: 1.8,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontWeight: 600,
  letterSpacing: 1.5,
  color: '#1A1815',
  borderBottom: '1px solid rgba(168,155,126,0.4)',
  fontSize: 12,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'top',
  color: '#3A322A',
};

const codeStyle: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11,
  background: 'rgba(168,155,126,0.15)',
  padding: '1px 6px',
  borderRadius: 2,
  color: '#5A4F3A',
};

const kStyle: React.CSSProperties = {
  color: '#1A1815',
  letterSpacing: 1.5,
  fontFamily: '"Noto Serif SC", serif',
  marginRight: 8,
};

const vStyle: React.CSSProperties = {
  color: '#5A4F3A',
};
