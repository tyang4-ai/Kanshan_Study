import type { Metadata } from 'next';
import { Noto_Serif_SC, Noto_Sans_SC, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const notoSerif = Noto_Serif_SC({
  variable: '--font-noto-serif-sc',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const notoSans = Noto_Sans_SC({
  variable: '--font-noto-sans-sc',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: '看山书房 · Workspace',
  description: '助力答主完成「灵感激发 · 思路梳理 · 内容精加工」的多智能体工作台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSerif.variable} ${notoSans.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ background: '#2A2724', fontFamily: '"Noto Sans SC", sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
