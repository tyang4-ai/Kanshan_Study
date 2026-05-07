import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { AiFailureToast } from '@/components/chrome/AiFailureToast';
import { useAiErrorStore } from '@/lib/store/ai-error';

describe('AiFailureToast', () => {
  beforeEach(() => {
    useAiErrorStore.setState({ current: null });
  });

  afterEach(() => {
    cleanup();
    useAiErrorStore.setState({ current: null });
  });

  it('renders nothing when no error is current', () => {
    render(<AiFailureToast />);
    expect(screen.queryByTestId('ai-failure-toast')).toBeNull();
  });

  it('renders the toast when push() adds an error', () => {
    render(<AiFailureToast />);
    act(() => {
      useAiErrorStore.getState().push({ message: 'LLM 服务暂时不可用，请稍后重试 · 或前往设置自带密钥', status: 500 });
    });
    const toast = screen.getByTestId('ai-failure-toast');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent('LLM 服务暂时不可用');
  });

  it('dismiss button removes the toast', () => {
    render(<AiFailureToast />);
    act(() => {
      useAiErrorStore.getState().push({ message: 'boom', status: 500 });
    });
    expect(screen.getByTestId('ai-failure-toast')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ai-failure-toast-dismiss'));
    expect(screen.queryByTestId('ai-failure-toast')).toBeNull();
  });

  it('replaces (not stacks) when a second push arrives', () => {
    render(<AiFailureToast />);
    act(() => {
      useAiErrorStore.getState().push({ message: 'first error', status: 500 });
    });
    expect(screen.getByTestId('ai-failure-toast')).toHaveTextContent('first error');
    act(() => {
      useAiErrorStore.getState().push({ message: 'second error', status: 429 });
    });
    // Still only ONE toast in the DOM, and it shows the latest message.
    const toasts = screen.getAllByTestId('ai-failure-toast');
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toHaveTextContent('second error');
    expect(toasts[0]).not.toHaveTextContent('first error');
  });
});
