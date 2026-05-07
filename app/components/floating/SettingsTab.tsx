'use client';
// 5/12 TODO: provider-aware model dropdown — see plan #13.6 Step 6.C
// Default options: Kimi-K2 (默认), 本地 Qwen3-72B
// Conditionally show DeepSeek-V3 (BYO) / DeepSeek-R1 (BYO) when localStorage
// 'kanshan-onboarding'.provider === 'deepseek'
import { ComplianceLine } from '@/components/compliance/ComplianceLine';

export function SettingsTab() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="p-4 text-sm text-slate-500">
        TODO: settings — see plan #4 task 3 (registry shipped this phase, UI in plan #11)
      </div>
      <ComplianceLine>设置仅本地保存 · 不同步至云</ComplianceLine>
    </div>
  );
}
