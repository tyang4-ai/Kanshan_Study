import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DiffColumn } from '@/components/voice/DiffColumn';

describe('DiffColumn', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders label + subtitle', () => {
    render(
      <DiffColumn label="GENERIC · X" subtitle="无记忆" accent="#7A6655" accentBg="rgba(0,0,0,0)">
        body
      </DiffColumn>
    );
    expect(screen.getByText('GENERIC · X')).toBeInTheDocument();
    expect(screen.getByText('无记忆')).toBeInTheDocument();
  });

  it('promptTooltip hover renders body verbatim', () => {
    const tip = {
      title: '系统提示',
      body: '你是一个普通的 AI 写作助手。',
      footnote: 'DeepSeek-V3',
    };
    render(
      <DiffColumn
        label="L"
        subtitle="S"
        accent="#1F8B66"
        accentBg="rgba(0,0,0,0)"
        promptTooltip={tip}
      >x</DiffColumn>
    );
    expect(screen.queryByText(tip.body)).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByTestId('diff-column-prompt-icon'));
    expect(screen.getByText(tip.body)).toBeInTheDocument();
    expect(screen.getByText(tip.title)).toBeInTheDocument();
    expect(screen.getByText(tip.footnote)).toBeInTheDocument();
  });

  it('accepted=true applies accentBg styling', () => {
    const { container } = render(
      <DiffColumn
        label="L"
        subtitle="S"
        accent="#1F8B66"
        accentBg="rgba(31,139,102,0.07)"
        accepted
      >x</DiffColumn>
    );
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('style')).toMatch(/rgba\(31,\s*139,\s*102,\s*0?\.07\)/);
  });

  it('recommended=true shows the 看墨推荐 badge', () => {
    render(
      <DiffColumn
        label="L"
        subtitle="S"
        accent="#1F8B66"
        accentBg="rgba(0,0,0,0)"
        recommended
      >x</DiffColumn>
    );
    expect(screen.getByText('看墨推荐')).toBeInTheDocument();
  });

  it('onAccept fires when 选这一稿 clicked', () => {
    const onAccept = vi.fn();
    render(
      <DiffColumn
        label="L"
        subtitle="S"
        accent="#1F8B66"
        accentBg="rgba(0,0,0,0)"
        onAccept={onAccept}
      >x</DiffColumn>
    );
    fireEvent.click(screen.getByText('选这一稿'));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
