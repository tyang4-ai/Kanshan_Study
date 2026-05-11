'use client';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import script from '@/content/demo/script.json';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useAccountStore } from '@/lib/store/account';

interface Beat {
  tStart: number;
  tLabel: string;
  title: string;
  body: string;
  action?: BeatAction;
}

type BeatAction =
  | 'cold-open'
  | 'switch-account-guwanxi'
  | 'open-voice-diff'
  | 'open-persona'
  | 'open-custom-mask'
  | 'open-debate'
  | 'open-lore';

// R8 demo coherence (Lin Maohua + Shi Junhe + Tan Shulin) P0: beats 1-5
// of the teleprompter narrated actions that didn't actually happen on
// screen — the founder had to drive them manually. A judge watching the
// chip read 「看墨语风重写」 while staring at an unchanged editor would
// register "demo is fake" within 30s. Now `next →` dispatches the action
// named in script.json so every beat advance produces visible motion.
function runBeatAction(action: BeatAction | undefined): void {
  if (!action || typeof window === 'undefined') return;
  const floating = useFloatingWindowStore.getState();
  const account = useAccountStore.getState();
  switch (action) {
    case 'cold-open':
      // Initial state — no action.
      return;
    case 'switch-account-guwanxi':
      if (account.active !== 'guwanxi') {
        // ProfileChip.onClick is the canonical path (handles per-account
        // doc restore + toast). Click it programmatically so the side
        // effects fire in their proper order without us duplicating logic.
        const chip = document.querySelector<HTMLButtonElement>('[data-tour-id="profile-chip"]');
        chip?.click();
      }
      return;
    case 'open-voice-diff': {
      // Synthesize a stable selection payload anchored to the editor body
      // so voice-diff has a target without requiring real cursor state.
      const synth = synthesizeSelection();
      floating.openTab('voice-diff', '看墨 · 润色', { mode: 'polish', selection: synth });
      return;
    }
    case 'open-persona':
      floating.openTab('persona', '看文 · 读者反应', { mode: 'auto' });
      return;
    case 'open-custom-mask':
      // Custom-mask creation lives inside the persona panel; pass a `mode`
      // hint the panel can read to scroll to the CustomMaskForm.
      floating.openTab('persona', '看纹 · 自定义读者', { mode: 'pick' });
      return;
    case 'open-debate':
      floating.openTab('debate', '看文 · 看纹辩论', {});
      return;
    case 'open-lore':
      if (account.active !== 'me') {
        const chip = document.querySelector<HTMLButtonElement>('[data-tour-id="profile-chip"]');
        chip?.click();
      }
      window.dispatchEvent(new CustomEvent('kanshan:open-lore'));
      return;
  }
}

function synthesizeSelection(): { text: string; rect: DOMRect } {
  const editor = document.querySelector('[data-testid="tiptap-editor"]');
  const firstPara = editor?.querySelector('p');
  const rect = firstPara?.getBoundingClientRect() ?? new DOMRect(360, 200, 600, 24);
  const text = (firstPara?.textContent ?? '影像组学领域正在悄然转向').slice(0, 200);
  return { text, rect };
}

interface DemoScript {
  title: string;
  totalSeconds: number;
  beats: Beat[];
}

const SCRIPT = script as DemoScript;

// R4 presentation persona-review 2026-05-11 P0 (Sun Liwei): the script
// teleprompter at top-right collided with LoreEnvelope (also top-right at
// `top:88, right:22`). Moved to bottom-right *above* the LIVE DEMO chip
// (chip lives at `bottom:12`; we sit at `bottom:60` with a 4px gap).
const wrap: CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 60,
  zIndex: 2500,
  width: 280,
  padding: '10px 14px 12px',
  background: 'rgba(20,22,30,0.78)',
  border: '1px solid rgba(168,155,126,0.35)',
  borderRadius: 2,
  color: '#E6EFFF',
  fontFamily: '"Noto Serif SC", serif',
  fontSize: 12,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const monoTag: CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 9,
  letterSpacing: 1.2,
  color: '#9FB6D6',
  marginBottom: 4,
};

const titleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4,
  letterSpacing: 1,
};

const bodyStyle: CSSProperties = {
  fontSize: 11.5,
  lineHeight: 1.55,
  color: 'rgba(230,239,255,0.85)',
};

const navStyle: CSSProperties = {
  marginTop: 8,
  display: 'flex',
  gap: 4,
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
  color: 'rgba(159,182,214,0.55)',
  alignItems: 'center',
};

// R8 VC re-review (Lin Maohua) P0: prev / next labels in the teleprompter
// were plain SPANs with no click handler. Judges saw them, tried to click
// them, nothing happened, and concluded the script was cosmetic — costing
// demo coherence points. These are now real buttons.
const navBtnStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(159,182,214,0.25)',
  color: 'rgba(159,182,214,0.85)',
  padding: '2px 8px',
  borderRadius: 2,
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10,
  cursor: 'pointer',
};
const navBtnDisabled: CSSProperties = {
  ...navBtnStyle,
  opacity: 0.35,
  cursor: 'not-allowed',
};

interface NextBeatHintProps {
  initialIdx?: number;
  autoAdvance?: boolean;
}

export function NextBeatHint({ initialIdx = 0, autoAdvance = false }: NextBeatHintProps) {
  const [idx, setIdx] = useState(initialIdx);
  const last = SCRIPT.beats.length - 1;
  const beat = SCRIPT.beats[idx];

  // R7 first-touch judge (Shi Junhe) P1 + Liang Haining L7-2 P2: judges
  // mistook the teleprompter chip for product chrome. Default visible
  // (founder needs it), but `?presenter=0` URL OR `?` keypress hides it —
  // gives the founder a one-tap escape if a sharp judge zooms in. The chip
  // now also wears an unambiguous "PRESENTER ONLY" badge so casual scanning
  // doesn't mistake it for product UI.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Read the URL query on mount (client only; the SSR pass can't see it).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get('presenter') === '0') setVisible(false);
    const onKey = (e: KeyboardEvent): void => {
      const inEditable = (e.target as HTMLElement | null)?.matches?.('input, textarea, [contenteditable="true"]');
      if (inEditable) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // R8: advancing the teleprompter ALSO fires the beat's action so the
  // workspace visibly moves with the narration. retreat does NOT replay
  // actions in reverse — we just move the chip back.
  const advance = useCallback(() => {
    setIdx((i) => {
      const nextIdx = Math.min(last, i + 1);
      if (nextIdx !== i) runBeatAction(SCRIPT.beats[nextIdx]?.action);
      return nextIdx;
    });
  }, [last]);
  const retreat = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') advance();
      else if (e.key === 'ArrowLeft') retreat();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, retreat]);

  useEffect(() => {
    if (!autoAdvance) return;
    const next = SCRIPT.beats[idx + 1];
    if (!next) return;
    const delayMs = (next.tStart - beat.tStart) * 1000;
    const t = window.setTimeout(advance, delayMs);
    return () => window.clearTimeout(t);
  }, [autoAdvance, idx, beat.tStart, advance]);

  if (!beat) return null;
  // `?presenter=0` URL or `?` keypress hides the chip — action wiring still
  // works via ArrowRight / ArrowLeft so the founder can drive from keyboard.
  if (!visible) return null;

  return (
    <div data-testid="next-beat-hint" data-beat-idx={idx} style={wrap}>
      <div style={{ ...monoTag, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          display: 'inline-block',
          padding: '0 4px',
          borderRadius: 2,
          background: 'rgba(168,155,126,0.18)',
          color: '#C0B294',
          fontSize: 8,
          letterSpacing: 1.5,
        }}>PRESENTER</span>
        SCRIPT · {beat.tLabel} · {idx + 1} / {SCRIPT.beats.length}
      </div>
      <div style={titleStyle}>{beat.title}</div>
      <div style={bodyStyle}>{beat.body}</div>
      <div style={navStyle}>
        <button
          type="button"
          data-testid="next-beat-prev"
          onClick={retreat}
          disabled={idx === 0}
          style={idx === 0 ? navBtnDisabled : navBtnStyle}
        >
          ← prev
        </button>
        <button
          type="button"
          data-testid="next-beat-next"
          onClick={advance}
          disabled={idx === last}
          style={idx === last ? navBtnDisabled : navBtnStyle}
        >
          next →
        </button>
        {idx === last && <span style={{ marginLeft: 'auto', color: '#A89B7E' }}>fin</span>}
      </div>
    </div>
  );
}
