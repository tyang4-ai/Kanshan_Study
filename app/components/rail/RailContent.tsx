import { RelCard } from './RelCard';
import { BulletinTrendCard } from './BulletinTrendCard';

// Width-responsive card layout. Cards center on the rail's available
// width; rotations and small horizontal offsets stay constant so the
// "pinned by hand" feel survives any width.
export function RailContent() {
  return (
    <div style={{
      position: 'absolute', top: 32, left: 0, right: 0, bottom: 280,
      padding: '20px 12px 0',
      display: 'flex', flexDirection: 'column', alignItems: 'stretch',
      gap: 18
    }}>
      {/* Hot trends card */}
      <BulletinTrendCard
        title="AI 写作工具是否会让答主声音同质化？"
        meta="热度 8.2万 · 2 小时前"
      />

      {/* Old work card with sticky note attached to its corner */}
      <div style={{ position: 'relative' }}>
        <RelCard rotate={1.8} pinColor="#1772F6" offsetX={4}>
          <div style={{ fontFamily: '"Noto Sans SC", sans-serif', fontSize: 9.5, fontWeight: 600,
            color: '#1772F6', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            看典 · 旧作
          </div>
          <div style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 12.5, color: '#1A1F2A', lineHeight: 1.45, fontWeight: 500 }}>
            基因组学方法在影像组学中的应用
          </div>
          <div style={{ fontSize: 9.5, color: '#7A6655', marginTop: 6, fontFamily: '"Noto Sans SC", sans-serif' }}>
            2025-11 · 1.2k 赞
          </div>
        </RelCard>

        {/* Sticky note overlapping bottom-right */}
        <div style={{
          position: 'absolute', bottom: -28, right: 4, width: 110,
          transform: 'rotate(-3deg)',
          background: '#FEF4A8', padding: '8px 10px',
          fontFamily: '"Caveat", "Marker Felt", cursive',
          fontSize: 13, color: '#5a4a2a', lineHeight: 1.3,
          boxShadow: '0 3px 6px rgba(0,0,0,.15)',
          zIndex: 5
        }}>射频组学切入点？</div>
      </div>

      {/* Spacer for the sticky note overhang */}
      <div style={{ height: 18, flexShrink: 0 }} />

      {/* Lit card */}
      <RelCard rotate={-1.2} pinColor="#1772F6" offsetX={-4}>
        {/* TODO plan #10/#11 — replace with real <CardCornerBadge kind="sourced" position="bottom-right"/> */}
        <span data-card-corner-badge="sourced" data-position="bottom-right" />
        <div style={{ fontFamily: '"Noto Sans SC", sans-serif', fontSize: 9.5, fontWeight: 600,
          color: '#1772F6', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          看水 · 文献剪报
        </div>
        <div style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 11, color: '#1A1F2A', lineHeight: 1.5 }}>
          &quot;Radiogenomics: A revolutionary approach…&quot;
          {/* TODO plan #10/#11 — replace with real <CiteBadge kind="web" n={12} title="Nature · 2024 · Radiogenomics review"/> */}
          <span data-cite-kind="web" data-n={12} title="Nature · 2024 · Radiogenomics review" />
        </div>
        <div style={{ fontSize: 9, color: '#7A6655', marginTop: 6, fontFamily: '"Noto Sans SC", sans-serif' }}>
          Nature · 2024
        </div>
      </RelCard>
    </div>
  );
}
