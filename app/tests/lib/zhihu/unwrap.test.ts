import { describe, it, expect } from 'vitest';
import { unwrapZhihu } from '@/lib/zhihu';

describe('unwrapZhihu', () => {
  it('Shape A: {status:0, msg, data} returns data', () => {
    const res = unwrapZhihu<{ x: number }>({ status: 0, msg: 'success', data: { x: 42 } });
    expect(res).toEqual({ x: 42 });
  });

  it('Shape B: {code:0, msg, data} returns data (comment_create inconsistency)', () => {
    const res = unwrapZhihu<{ id: string }>({ code: 0, msg: 'ok', data: { id: 'c-1' } });
    expect(res).toEqual({ id: 'c-1' });
  });

  it('Shape C: top-level array passes through unchanged (story_list)', () => {
    const arr = [{ work_id: '1' }, { work_id: '2' }];
    expect(unwrapZhihu(arr)).toBe(arr);
  });

  it('non-zero status throws with msg as error message', () => {
    expect(() =>
      unwrapZhihu({ status: 10001, msg: '签名验证失败', data: null }),
    ).toThrow('签名验证失败');
  });

  it('non-zero code (Shape B) also throws (data field required to enter unwrap path)', () => {
    expect(() => unwrapZhihu({ code: 4001, msg: 'rate limited', data: null })).toThrow('rate limited');
  });

  it('non-object input passes through (string, number, null)', () => {
    expect(unwrapZhihu('hello')).toBe('hello');
    expect(unwrapZhihu(42)).toBe(42);
    expect(unwrapZhihu(null)).toBe(null);
  });

  it('object without data field passes through (defensive — for not-yet-unwrapped shapes)', () => {
    const obj = { foo: 'bar' };
    expect(unwrapZhihu(obj)).toBe(obj);
  });

  it('object with only status (no data) does not enter unwrap path', () => {
    const obj = { status: 0 };
    expect(unwrapZhihu(obj)).toBe(obj);
  });
});
