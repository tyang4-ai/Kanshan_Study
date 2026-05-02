'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState } from 'react';

type LogEntry = { event: string; payload: string; ts: number };

export default function TiptapImeSpike() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [composing, setComposing] = useState(false);

  const append = (event: string, payload: string) => {
    setLog((l) => [...l.slice(-29), { event, payload, ts: Date.now() }]);
  };

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>测试中文输入法 — type 你好世界 below:</p>',
    immediatelyRender: false,
    editorProps: {
      handleDOMEvents: {
        compositionstart: () => {
          setComposing(true);
          append('compositionstart', '');
          return false;
        },
        compositionupdate: (_view, event) => {
          append('compositionupdate', (event as CompositionEvent).data ?? '');
          return false;
        },
        compositionend: (_view, event) => {
          setComposing(false);
          append('compositionend', (event as CompositionEvent).data ?? '');
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      append('onUpdate', editor.getText().slice(-30));
    },
  });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-2">TipTap Chinese IME spike</h1>
      <p className="text-sm text-slate-600 mb-4">
        Goal: confirm StarterKit doesn&apos;t mangle composition events. Type
        <span className="font-mono mx-1">你好世界</span>
        with Sogou / Microsoft Pinyin / Mac built-in pinyin.
      </p>

      <div className="border rounded-md p-4 mb-4 prose prose-slate min-h-[120px]">
        <EditorContent editor={editor} />
      </div>

      <div className="mb-3 text-xs">
        <span className="font-mono">composing: {String(composing)}</span>
      </div>

      <pre className="text-xs bg-slate-100 p-3 rounded max-h-[320px] overflow-auto">
        {log.map((entry) => `${entry.event.padEnd(20)} ${entry.payload}`).join('\n') ||
          '(no events yet — start typing)'}
      </pre>

      <div className="mt-6 text-sm text-slate-700 space-y-2">
        <p className="font-semibold">PASS criteria (all four must hold):</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>No dropped characters (you typed 你好世界, all 4 chars appear)</li>
          <li>No caret jumps mid-composition</li>
          <li>No double input (each char appears exactly once)</li>
          <li>
            <code>onUpdate</code> fires once per <em>commit</em> (Enter/select), not per
            <code>compositionupdate</code>
          </li>
        </ul>
        <p className="text-xs text-slate-500 pt-2">
          Document outcome in <code>app/app/spikes/tiptap-ime/RESULT.md</code>. If FAIL → run
          plan #1 Task 8 (Lexical fallback).
        </p>
      </div>
    </div>
  );
}
