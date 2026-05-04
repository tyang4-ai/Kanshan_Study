import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PersonaMessage } from '@/components/persona/PersonaMessage';

afterEach(() => cleanup());

const baseProps = {
  foxId: 'wen',
  mask: '路人读者',
  text: '这是一条评议。',
  tags: [] as string[],
};

describe('PersonaMessage', () => {
  it('renders text + mask label + 面具 chip', () => {
    render(<PersonaMessage {...baseProps} text="评议正文" mask="路人读者" />);
    expect(screen.getByText('评议正文')).toBeInTheDocument();
    expect(screen.getByText('路人读者')).toBeInTheDocument();
    expect(screen.getByText('面具')).toBeInTheDocument();
  });

  it('renders agree=true reply pill with 附议 + green dot', () => {
    render(
      <PersonaMessage
        {...baseProps}
        replyToMask="业内行家"
        agree={true}
      />
    );
    const pill = screen.getByTestId('persona-message-reply-pill');
    expect(pill).toHaveTextContent('附议');
    expect(pill).toHaveTextContent('「业内行家」');
    const dot = screen.getByTestId('persona-message-reply-dot');
    expect(dot).toHaveStyle({ background: '#2ECC71' });
  });

  it('renders agree=false reply pill with 不同意 + red dot', () => {
    render(
      <PersonaMessage
        {...baseProps}
        replyToMask="路人读者"
        agree={false}
      />
    );
    const pill = screen.getByTestId('persona-message-reply-pill');
    expect(pill).toHaveTextContent('不同意');
    const dot = screen.getByTestId('persona-message-reply-dot');
    expect(dot).toHaveStyle({ background: '#C03028' });
  });

  it('renders agree=null reply pill with 回应 + neutral dot', () => {
    render(
      <PersonaMessage
        {...baseProps}
        replyToMask="边界关注者"
        agree={null}
      />
    );
    const pill = screen.getByTestId('persona-message-reply-pill');
    expect(pill).toHaveTextContent('回应');
    const dot = screen.getByTestId('persona-message-reply-dot');
    expect(dot).toHaveStyle({ background: '#A89B7E' });
  });

  it('replyToMask="你" renders pill addressed to 「你」', () => {
    render(
      <PersonaMessage
        {...baseProps}
        replyToMask="你"
        agree={true}
      />
    );
    const pill = screen.getByTestId('persona-message-reply-pill');
    expect(pill).toHaveTextContent('「你」');
  });

  it('empty tags → no tag chip row', () => {
    render(<PersonaMessage {...baseProps} tags={[]} />);
    expect(screen.queryByTestId('persona-message-tags')).toBeNull();
  });

  it('non-empty tags → tag chip row with each tag', () => {
    render(
      <PersonaMessage {...baseProps} tags={['术语判定', '专业读者']} />
    );
    expect(screen.getByTestId('persona-message-tags')).toBeInTheDocument();
    expect(screen.getByText('术语判定')).toBeInTheDocument();
    expect(screen.getByText('专业读者')).toBeInTheDocument();
  });

  it('time defaults to 刚刚 when undefined', () => {
    render(<PersonaMessage {...baseProps} />);
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('uses provided time when set', () => {
    render(<PersonaMessage {...baseProps} time="8 秒前" />);
    expect(screen.getByText('8 秒前')).toBeInTheDocument();
  });
});
