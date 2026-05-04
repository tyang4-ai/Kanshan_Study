'use client';

import { useState } from 'react';

export interface MaskChipRowProps {
  fixed: Array<{ id: string; label: string; hint: string; fox: 'wen' }>;
  custom: Array<{ id: string; label: string; description: string; fox: 'wen2' }>;
  selectedFixedIds: Set<string>;
  selectedCustomIds: Set<string>;
  onToggleFixed: (id: string) => void;
  onToggleCustom: (id: string) => void;
  onAddCustom: () => void;
  onDeleteCustom: (id: string) => void;
}

function chipStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11.5,
    fontFamily: '"Noto Sans SC", sans-serif',
    border: 'none',
    cursor: 'pointer',
    background: selected ? 'rgba(23,114,246,0.15)' : 'rgba(0,0,0,0.06)',
    color: selected ? '#1772F6' : '#5A6270',
    transition: 'background 120ms ease, color 120ms ease',
  };
}

export function MaskChipRow({
  fixed,
  custom,
  selectedFixedIds,
  selectedCustomIds,
  onToggleFixed,
  onToggleCustom,
  onAddCustom,
  onDeleteCustom,
}: MaskChipRowProps) {
  const [hoveredCustomId, setHoveredCustomId] = useState<string | null>(null);

  return (
    <div
      data-testid="mask-chip-row"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
      }}
    >
      {fixed.map((m) => {
        const selected = selectedFixedIds.has(m.id);
        return (
          <button
            key={m.id}
            type="button"
            title={m.hint}
            aria-pressed={selected}
            onClick={() => onToggleFixed(m.id)}
            style={chipStyle(selected)}
          >
            {m.label}
          </button>
        );
      })}
      {custom.map((m) => {
        const selected = selectedCustomIds.has(m.id);
        const hovered = hoveredCustomId === m.id;
        return (
          <span
            key={m.id}
            onMouseEnter={() => setHoveredCustomId(m.id)}
            onMouseLeave={() =>
              setHoveredCustomId((curr) => (curr === m.id ? null : curr))
            }
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <button
              type="button"
              title={m.description}
              aria-pressed={selected}
              onClick={() => onToggleCustom(m.id)}
              style={chipStyle(selected)}
            >
              {m.label}
              {hovered && (
                <span
                  role="button"
                  aria-label={`删除 ${m.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustom(m.id);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    background: 'rgba(0,0,0,0.10)',
                    color: '#5A6270',
                    fontSize: 10,
                    lineHeight: 1,
                    cursor: 'pointer',
                    marginLeft: 2,
                  }}
                >
                  ×
                </span>
              )}
            </button>
          </span>
        );
      })}
      <button
        type="button"
        aria-label="添加自定义面具"
        title="添加自定义面具"
        onClick={onAddCustom}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: 12,
          fontFamily: '"Noto Sans SC", sans-serif',
          border: '1px dashed rgba(23,114,246,0.45)',
          background: 'transparent',
          color: '#1772F6',
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        +
      </button>
    </div>
  );
}
