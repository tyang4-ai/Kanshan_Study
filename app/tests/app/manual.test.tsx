import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ManualPage from '@/app/manual/page';
import { FOXES } from '@/lib/foxes/registry';

describe('/manual page', () => {
  it('renders the root container', () => {
    const { getByTestId } = render(<ManualPage />);
    expect(getByTestId('manual-page-root')).toBeTruthy();
  });

  it('renders all 7 section ids', () => {
    const { getByTestId } = render(<ManualPage />);
    for (let i = 1; i <= 7; i++) {
      expect(getByTestId(`manual-section-${i}`)).toBeTruthy();
    }
  });

  it('lists every fox in the 九狐 table', () => {
    const { getByTestId } = render(<ManualPage />);
    const table = getByTestId('manual-fox-table');
    const html = table.innerHTML;
    for (const f of FOXES) {
      expect(html).toContain(f.name);
      expect(html).toContain(f.epithet);
      expect(html).toContain(f.catchphrase);
    }
  });

  it('shows the locked Ctrl+Shift chord triplet', () => {
    const { getByTestId } = render(<ManualPage />);
    const sect3 = getByTestId('manual-section-3');
    expect(sect3.textContent).toContain('Ctrl+Shift+M');
    expect(sect3.textContent).toContain('Ctrl+Shift+R');
    expect(sect3.textContent).toContain('Ctrl+Shift+F');
  });

  it('renders the locked closing 三句 from lore', () => {
    const { getByTestId } = render(<ManualPage />);
    const closing = getByTestId('manual-lore-closing');
    expect(closing.textContent).toContain('九重书房之门');
    expect(closing.textContent).toContain('看山从未抬头');
    expect(closing.textContent).toContain('也许有一天');
  });

  it('lists all 8 locked compliance surface strings in section 5', () => {
    const { getByTestId } = render(<ManualPage />);
    const sect5 = getByTestId('manual-section-5');
    const text = sect5.textContent ?? '';
    expect(text).toContain('仿真读者 · 非真人 · 不可作为审稿依据');
    expect(text).toContain('辩论由模型扮演 · 不代表真实立场');
    expect(text).toContain('GB 45438');
    expect(text).toContain('档案不入第三方训练集 · 仅你可见');
    expect(text).toContain('引用全部实时检索 · 不入训练集');
    expect(text).toContain('看势仅供选题灵感 · 不做热点自动扩写');
    expect(text).toContain('数据仅来自你已发布作品 · 不读私信');
    expect(text).toContain('设置仅本地保存 · 不同步至云');
  });
});
