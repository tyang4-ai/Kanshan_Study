'use client';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';

export function TrendsTab() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="p-4 text-sm text-slate-500">
        TODO: trends — see plan #11
      </div>
      <ComplianceLine>看势仅供选题灵感 · 不做热点自动扩写</ComplianceLine>
    </div>
  );
}
