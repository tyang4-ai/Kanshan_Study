'use client';

// R5 (P0 2026-05-13): "9-fox lore louder than orchestration product" was the
// 3rd P0 from the R4 judge review (李笛 / 张荣乐 / emmett). This strip
// promotes 看山's调度 → 狐狸协作 → 共享 vault 工作流 to a permanent on-screen
// surface that updates in real time. Judges no longer have to "feel" that
// orchestration is happening — they see the trail above the editor on every
// fox event.
//
// Subscribes to:
//  - `useOrchestrationStore` for per-fox status snippets (set by each panel
//    on key milestones — search complete, vault load done, xin scan finished).
//  - `useFloatingWindowStore` for the list of currently open foxes (so a fox
//    panel that no one's interacted with yet still shows up as "已打开").
//  - `useProvenanceStore.getProvenanceSummary()` for the 看心 / 看墨 / 看水
//    cross-fox count chips at the right edge of the strip.

import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useOrchestrationStore } from '@/lib/store/orchestration';
import { useProvenanceStore, getProvenanceSummary } from '@/lib/store/provenance';
import { useRelMemStore } from '@/lib/store/relmem';
import { useLastVisitStore } from '@/lib/store/last-visit';
import { FOX_BY_ID, type FoxId } from '@/lib/foxes/registry';

const TAB_KIND_TO_FOX: Record<string, FoxId> = {
  'kanshan-chat': 'shan',
  'voice-diff': 'mo',
  persona: 'wen',
  debate: 'wen2',
  research: 'shui',
  vault: 'dian',
  trends: 'shi',
  stats: 'jing',
  // 看心 has no dedicated tab kind — surfaced via provenance summary instead.
};

export function OrchestrationStrip() {
  const tabs = useFloatingWindowStore((s) => s.tabs);
  const open = useFloatingWindowStore((s) => s.open);
  const orchestration = useOrchestrationStore((s) => s.active);
  // Subscribe to provenance so the strip re-renders when entries change.
  useProvenanceStore((s) => s.entries);
  const summary = getProvenanceSummary();
  // r5 TASK I (李笛 P2): subscribe to relational-memory annotations so the
  // OrchestrationStrip surfaces echo/contradict chips inline with the fox row.
  const relmem = useRelMemStore((s) => s.annotations);
  // r5 TASK L (吴伟 P1): cross-fox events counter chip (右侧). Reads from
  // useLastVisitStore.crossFoxEventCount which ticks every time one fox's
  // action triggers a relatedTo annotation on another fox's prior entry.
  const crossFoxEvents = useLastVisitStore((s) => s.crossFoxEventCount);

  // Determine which foxes are visibly active right now:
  //  - any fox whose floating window is open
  //  - any fox with a recent orchestration status (last 60s)
  //  - the orchestrator (看山) is ALWAYS shown
  const activeFoxIds = new Set<FoxId>(['shan']);
  if (open) {
    for (const t of tabs) {
      const f = TAB_KIND_TO_FOX[t.kind];
      if (f) activeFoxIds.add(f);
    }
  }
  // Entries are cleared explicitly by callers on panel close or status reset;
  // we trust the store to be reasonably fresh and don't gate on wall-clock
  // recency (calling Date.now() in render is impure).
  for (const e of Object.values(orchestration)) activeFoxIds.add(e.foxId);
  // 看心 lights up whenever there are flagged entries even if no tab is open
  if (summary.xinFlags > 0) activeFoxIds.add('xin');
  // 看墨 lights up after at least one avoid event
  if (summary.moAvoided > 0) activeFoxIds.add('mo');
  // 看水 lights up after at least one sourced event
  if (summary.shuiSourced > 0) activeFoxIds.add('shui');

  // Order foxes in a stable visual cadence: shan first, then daily-4
  // (shui/dian/shi/mo), then advanced (wen/wen2/xin/jing).
  const ORDER: FoxId[] = ['shan', 'shui', 'dian', 'shi', 'mo', 'wen', 'wen2', 'xin', 'jing'];
  const ordered = ORDER.filter((f) => activeFoxIds.has(f));

  const statusFor = (foxId: FoxId): string => {
    const entry = orchestration[foxId];
    if (entry) return entry.status;
    // Fall back to a generic "已打开" for foxes whose panel is up but who
    // haven't emitted a milestone yet.
    if (foxId === 'xin' && summary.xinFlags > 0) return `${summary.xinFlags} 处待软化`;
    if (foxId === 'mo' && summary.moAvoided > 0) return `已绕开 ${summary.moAvoided} 处`;
    if (foxId === 'shui' && summary.shuiSourced > 0) return `已补 ${summary.shuiSourced} 处出处`;
    if (foxId === 'shan') {
      const others = ordered.filter((f) => f !== 'shan').length;
      return others > 0 ? `调度中 · 已派 ${others} 只` : '待命中';
    }
    return '已打开';
  };

  // Always render — empty state is "看山 · 待命中" in muted grey.
  return (
    <div
      data-testid="orchestration-strip"
      role="status"
      aria-live="polite"
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        background: 'linear-gradient(180deg, rgba(26,31,42,0.94) 0%, rgba(31,38,52,0.92) 100%)',
        borderBottom: '1px solid rgba(168,155,126,0.22)',
        fontFamily: '"Noto Serif SC", serif',
        fontSize: 11.5,
        color: 'rgba(232,220,196,0.92)',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{
          fontSize: 10,
          letterSpacing: 2,
          color: 'rgba(192,178,148,0.78)',
          fontFamily: 'JetBrains Mono, monospace',
          flexShrink: 0,
        }}
      >
        ORCH · 共一篇 · 共一档
      </span>
      <span style={{ flexShrink: 0, color: 'rgba(168,155,126,0.55)' }}>·</span>
      {ordered.map((foxId, i) => {
        const meta = FOX_BY_ID[foxId];
        const status = statusFor(foxId);
        const isShan = foxId === 'shan';
        return (
          <span key={foxId} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {i > 0 && <span style={{ opacity: 0.45, marginRight: 4 }}>{isShan ? '·' : '→'}</span>}
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                background: meta.glow,
                boxShadow: `0 0 8px ${meta.glow}aa`,
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 600, color: meta.glow }}>{meta.name.replace('刘', '')}</span>
            <span style={{ color: 'rgba(232,220,196,0.65)' }}>·</span>
            <span style={{ fontSize: 10.5, color: 'rgba(232,220,196,0.72)' }}>{status}</span>
          </span>
        );
      })}

      {/* r5 TASK I: 看典 关系记忆 chips. Each annotation reads as
          "看典 注意到这一句和《X》第 N 段呼应/相反 →" */}
      {relmem.length > 0 && (
        <>
          <span style={{ flexShrink: 0, color: 'rgba(168,155,126,0.55)' }}>·</span>
          {relmem.slice(0, 3).map((a) => (
            <span
              key={a.id}
              data-testid="orchestration-relmem-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                fontSize: 10.5,
                color: a.kind === 'contradict' ? '#E89B7E' : '#A8D9C2',
                fontStyle: 'italic',
              }}
              title={`${a.refExcerpt}（cos ${a.similarity.toFixed(2)}）`}
            >
              <span aria-hidden style={{ opacity: 0.6 }}>📎</span>
              看典 {a.kind === 'contradict' ? '注意到这句与' : '注意到这句呼应'}《{a.refTitle.slice(0, 14)}{a.refTitle.length > 14 ? '…' : ''}》
            </span>
          ))}
        </>
      )}

      {/* r5 TASK L: cross-fox events counter chip. Right-edge persistent count
          of times one fox triggered a relatedTo annotation on another fox. */}
      {crossFoxEvents > 0 && (
        <span
          data-testid="orchestration-crossfox-counter"
          style={{
            marginLeft: 'auto',
            flexShrink: 0,
            fontSize: 10,
            color: '#A8D9C2',
            border: '1px solid rgba(168,217,194,0.45)',
            borderRadius: 10,
            padding: '1px 8px',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 0.3,
          }}
          title="本演示中已发生的跨狐协作次数（一只狐狸的动作触发了另一只的关联记录）"
        >
          跨狐 ×{crossFoxEvents}
        </span>
      )}
    </div>
  );
}
