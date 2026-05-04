'use client';
import { CitationLink } from '@/components/citation/CitationLink';
import demoCitationsJson from '@/content/seed/citations-demo.json';
import type { Citation } from '@/lib/citation/types';

const DEMO_CITATIONS = demoCitationsJson as Citation[];

export function ResearchTab() {
  return (
    <>
      {/* Phase #9 demo — citation showcase. Plan #11 will replace with live research. */}
      <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontFamily: '"Noto Serif SC", serif' }}>
        <span>看水查到的来源：</span>
        <CitationLink citation={DEMO_CITATIONS[0]} />
        <CitationLink citation={DEMO_CITATIONS[1]} />
        <CitationLink citation={DEMO_CITATIONS[2]} />
      </div>
      <div className="p-4 text-sm text-slate-500">TODO: research — see plan #11</div>
    </>
  );
}
