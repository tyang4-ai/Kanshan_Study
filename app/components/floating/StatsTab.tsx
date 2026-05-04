'use client';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';

export function StatsTab() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="p-4 text-sm text-slate-500">
        TODO: stats — see plan #11
      </div>
      <ComplianceLine>数据仅来自你已发布作品 · 不读私信</ComplianceLine>
    </div>
  );
}
