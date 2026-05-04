import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MaskChipRow } from '@/components/persona/MaskChipRow';

afterEach(() => cleanup());

const FIXED = [
  { id: 'passerby', label: '路人读者', hint: '没医学背景', fox: 'wen' as const },
  { id: 'expert', label: '业内行家', hint: '挑技术错误', fox: 'wen' as const },
  { id: 'salaryman', label: '社畜读者', hint: '想要 takeaway', fox: 'wen' as const },
  { id: 'boundary', label: '边界关注者', hint: '盯医学声明', fox: 'wen' as const },
];

const CUSTOM = [
  { id: 'c1', label: '诊室助理', description: '基层护士视角', fox: 'wen2' as const },
];

function makeProps(overrides: Partial<React.ComponentProps<typeof MaskChipRow>> = {}) {
  return {
    fixed: FIXED,
    custom: CUSTOM,
    selectedFixedIds: new Set<string>(),
    selectedCustomIds: new Set<string>(),
    onToggleFixed: vi.fn(),
    onToggleCustom: vi.fn(),
    onAddCustom: vi.fn(),
    onDeleteCustom: vi.fn(),
    ...overrides,
  };
}

describe('MaskChipRow', () => {
  it('renders all 4 fixed chips with labels', () => {
    render(<MaskChipRow {...makeProps()} />);
    expect(screen.getByRole('button', { name: '路人读者' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '业内行家' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '社畜读者' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '边界关注者' })).toBeInTheDocument();
  });

  it('clicking a fixed chip calls onToggleFixed with the id', () => {
    const onToggleFixed = vi.fn();
    render(<MaskChipRow {...makeProps({ onToggleFixed })} />);
    fireEvent.click(screen.getByRole('button', { name: '业内行家' }));
    expect(onToggleFixed).toHaveBeenCalledWith('expert');
  });

  it('aria-pressed reflects selectedFixedIds.has(id)', () => {
    render(
      <MaskChipRow
        {...makeProps({ selectedFixedIds: new Set(['passerby']) })}
      />
    );
    const passerby = screen.getByRole('button', { name: '路人读者' });
    const expert = screen.getByRole('button', { name: '业内行家' });
    expect(passerby).toHaveAttribute('aria-pressed', 'true');
    expect(expert).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a custom chip calls onToggleCustom with the id', () => {
    const onToggleCustom = vi.fn();
    render(<MaskChipRow {...makeProps({ onToggleCustom })} />);
    fireEvent.click(screen.getByRole('button', { name: /诊室助理/ }));
    expect(onToggleCustom).toHaveBeenCalledWith('c1');
  });

  it('hovering custom chip reveals × that calls onDeleteCustom on click', () => {
    const onDeleteCustom = vi.fn();
    const onToggleCustom = vi.fn();
    render(
      <MaskChipRow {...makeProps({ onDeleteCustom, onToggleCustom })} />
    );
    const customChip = screen.getByRole('button', { name: /诊室助理/ });
    // hover the parent span
    fireEvent.mouseEnter(customChip.parentElement!);
    const del = screen.getByRole('button', { name: /删除 诊室助理/ });
    fireEvent.click(del);
    expect(onDeleteCustom).toHaveBeenCalledWith('c1');
    // click on × should not bubble to toggle
    expect(onToggleCustom).not.toHaveBeenCalled();
  });

  it('+ chip calls onAddCustom', () => {
    const onAddCustom = vi.fn();
    render(<MaskChipRow {...makeProps({ onAddCustom })} />);
    fireEvent.click(screen.getByRole('button', { name: '添加自定义面具' }));
    expect(onAddCustom).toHaveBeenCalledTimes(1);
  });
});
