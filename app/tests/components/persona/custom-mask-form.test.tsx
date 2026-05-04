import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CustomMaskForm } from '@/components/persona/CustomMaskForm';

afterEach(() => cleanup());

describe('CustomMaskForm', () => {
  it('submit button disabled when label is empty', () => {
    const onAdd = vi.fn();
    const onCancel = vi.fn();
    render(<CustomMaskForm onAdd={onAdd} onCancel={onCancel} />);
    const submit = screen.getByRole('button', { name: /提交/ });
    expect(submit).toBeDisabled();
  });

  it('submit button disabled when label is whitespace only', () => {
    render(<CustomMaskForm onAdd={vi.fn()} onCancel={vi.fn()} />);
    const labelInput = screen.getByLabelText('面具名');
    fireEvent.change(labelInput, { target: { value: '   ' } });
    const submit = screen.getByRole('button', { name: /提交/ });
    expect(submit).toBeDisabled();
  });

  it('typing label enables submit', () => {
    render(<CustomMaskForm onAdd={vi.fn()} onCancel={vi.fn()} />);
    const labelInput = screen.getByLabelText('面具名');
    fireEvent.change(labelInput, { target: { value: '诊室助理' } });
    const submit = screen.getByRole('button', { name: /提交/ });
    expect(submit).not.toBeDisabled();
  });

  it('submitting valid form calls onAdd with trimmed values + fox=wen2', () => {
    const onAdd = vi.fn();
    render(<CustomMaskForm onAdd={onAdd} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('面具名'), {
      target: { value: '  诊室助理  ' },
    });
    fireEvent.change(screen.getByLabelText('读者视角描述'), {
      target: { value: '  来自基层医院的护士视角  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /提交/ }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith({
      id: expect.any(String),
      label: '诊室助理',
      description: '来自基层医院的护士视角',
      fox: 'wen2',
    });
  });

  it('cancel calls onCancel and clears state', () => {
    const onCancel = vi.fn();
    render(<CustomMaskForm onAdd={vi.fn()} onCancel={onCancel} />);
    const labelInput = screen.getByLabelText('面具名') as HTMLInputElement;
    fireEvent.change(labelInput, { target: { value: '某面具' } });
    fireEvent.click(screen.getByRole('button', { name: /取消/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(labelInput.value).toBe('');
  });

  it('submit then form resets', () => {
    render(<CustomMaskForm onAdd={vi.fn()} onCancel={vi.fn()} />);
    const labelInput = screen.getByLabelText('面具名') as HTMLInputElement;
    fireEvent.change(labelInput, { target: { value: '某面具' } });
    fireEvent.click(screen.getByRole('button', { name: /提交/ }));
    expect(labelInput.value).toBe('');
  });
});
