import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TrendsConfirmModal } from '@/components/floating/TrendsConfirmModal';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('TrendsConfirmModal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <TrendsConfirmModal open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders heading, locked body text, checkbox and two buttons when open', () => {
    render(<TrendsConfirmModal open={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('稍等一步')).toBeInTheDocument();
    expect(screen.getByTestId('trends-confirm-body').textContent).toBe(
      '看势是看山的小镇，热度是用来选题的，不是用来扩写的。本次只是参考一眼，对吗？',
    );
    expect(screen.getByTestId('trends-confirm-checkbox')).toBeInTheDocument();
    expect(screen.getByTestId('trends-confirm-cancel')).toHaveTextContent('取消');
    expect(screen.getByTestId('trends-confirm-confirm')).toHaveTextContent('确认');
  });

  it('confirm button is disabled until checkbox is checked', () => {
    const onConfirm = vi.fn();
    render(<TrendsConfirmModal open={true} onConfirm={onConfirm} onCancel={vi.fn()} />);
    const confirmBtn = screen.getByTestId('trends-confirm-confirm') as HTMLButtonElement;
    expect(confirmBtn).toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('trends-confirm-checkbox'));
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('clicking cancel calls onCancel', () => {
    const onCancel = vi.fn();
    render(<TrendsConfirmModal open={true} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('trends-confirm-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ESC key calls onCancel', () => {
    const onCancel = vi.fn();
    render(<TrendsConfirmModal open={true} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop calls onCancel; clicking the card does not', () => {
    const onCancel = vi.fn();
    render(<TrendsConfirmModal open={true} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('trends-confirm-backdrop'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    onCancel.mockClear();
    fireEvent.click(screen.getByTestId('trends-confirm-modal'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('resets checkbox state when re-opened', () => {
    const { rerender } = render(
      <TrendsConfirmModal open={true} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    const checkbox = screen.getByTestId('trends-confirm-checkbox') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    rerender(<TrendsConfirmModal open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    rerender(<TrendsConfirmModal open={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(
      (screen.getByTestId('trends-confirm-checkbox') as HTMLInputElement).checked,
    ).toBe(false);
  });
});
