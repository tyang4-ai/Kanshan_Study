'use client';

import { useActiveFoxesStore } from '@/lib/store/active-foxes';
import { DockInner } from './DockInner';

export function DockSection() {
  const activeIds = useActiveFoxesStore((s) => s.activeIds);
  const toggle = useActiveFoxesStore((s) => s.toggle);

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
      background: 'linear-gradient(180deg, transparent 0%, rgba(232,238,245,0.4) 40%, rgba(220,232,245,0.7) 100%)',
      borderTop: '1px dashed rgba(26,31,42,0.15)',
      zIndex: 20
    }}>
      {/* Wood batten between cork and dock */}
      <div style={{
        position: 'absolute', top: -1, left: 12, right: 12, height: 3,
        background: 'linear-gradient(180deg, #8B6440 0%, #5C3F22 100%)',
        opacity: 0.4
      }} />

      <DockInner activeArr={activeIds} onToggleFox={toggle} />
    </div>
  );
}
