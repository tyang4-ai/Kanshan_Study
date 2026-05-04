'use client';
import { useState } from 'react';
import { LeftRail } from '@/components/rail/LeftRail';
import { LoreEnvelope } from '@/components/rail/LoreEnvelope';
import { WritingSurface } from '@/components/editor/WritingSurface';
import { ContextMenu } from '@/components/menu/ContextMenu';
import { TabbedFloatingWindow } from '@/components/floating/TabbedFloatingWindow';
import { LorePortal } from '@/components/lore/LorePortal';

export default function Page() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [loreOpen, setLoreOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen flex-col" style={{ background: '#2A2724' }}>
      <div className="flex min-h-0 flex-1" style={{ background: '#FAF8F3' }}>
        <LeftRail />
        <WritingSurface
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY });
          }}
          onSelectionChange={setSelection}
          floatingToolbarSelection={selection}
        />
      </div>

      <LoreEnvelope onClick={() => setLoreOpen(true)} />

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          hasSelection={!!selection}
          selection={selection}
          onClose={() => setMenu(null)}
        />
      )}

      {loreOpen && <LorePortal onClose={() => setLoreOpen(false)} />}

      <TabbedFloatingWindow />
    </div>
  );
}
