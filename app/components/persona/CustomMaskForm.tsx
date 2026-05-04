'use client';

import { useState } from 'react';

export interface CustomMaskFormProps {
  onAdd: (mask: {
    id: string;
    label: string;
    description: string;
    fox: 'wen2';
  }) => void;
  onCancel: () => void;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function CustomMaskForm({ onAdd, onCancel }: CustomMaskFormProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const trimmedLabel = label.trim();
  const trimmedDescription = description.trim();
  const submitDisabled = trimmedLabel.length === 0;

  const reset = () => {
    setLabel('');
    setDescription('');
  };

  const handleSubmit = () => {
    if (submitDisabled) return;
    onAdd({
      id: makeId(),
      label: trimmedLabel,
      description: trimmedDescription,
      fox: 'wen2',
    });
    reset();
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <div
      data-testid="custom-mask-form"
      style={{
        background: '#FAFBFD',
        border: '1px solid rgba(23,114,246,0.18)',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: '"Noto Sans SC", sans-serif',
      }}
    >
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="面具名 · 例：诊室助理"
        aria-label="面具名"
        style={{
          border: '1px solid rgba(23,114,246,0.18)',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
          color: '#1A1F2A',
          background: '#fff',
          outline: 'none',
          fontFamily: '"Noto Sans SC", sans-serif',
        }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="请描述这位读者的视角…"
        aria-label="读者视角描述"
        rows={3}
        style={{
          border: '1px solid rgba(23,114,246,0.18)',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
          color: '#1A1F2A',
          background: '#fff',
          outline: 'none',
          resize: 'vertical',
          fontFamily: '"Noto Sans SC", sans-serif',
          lineHeight: 1.5,
        }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleCancel}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: '1px solid rgba(0,0,0,0.10)',
            background: 'transparent',
            color: '#5A6270',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitDisabled}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: 'none',
            background: submitDisabled ? 'rgba(23,114,246,0.30)' : '#1772F6',
            color: '#fff',
            fontSize: 12,
            cursor: submitDisabled ? 'not-allowed' : 'pointer',
            fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >
          提交
        </button>
      </div>
    </div>
  );
}
