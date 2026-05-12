'use client';
import { useCallback, useState, type DragEvent } from 'react';
import { useAccountStore } from '@/lib/store/account';

interface ChunkPreview {
  id: string;
  text: string;
  charCount: number;
  position: number;
}

interface ChunksResponse {
  articleId: string;
  chunks: ChunkPreview[];
  inMemoryFallback?: boolean;
}

export interface VaultEntryData {
  id: string;
  title: string;
  snippet: string;
  year: string;
  date: string;
  words: number;
  borrows: number;
  draft?: boolean;
  tags: string[];
  spine?: string;
}

interface VaultEntryProps {
  entry: VaultEntryData;
  onOpen: (entry: VaultEntryData) => void;
  onExportMd: (entry: VaultEntryData) => void;
  onExportDocx: (entry: VaultEntryData) => void;
  onDelete: (entry: VaultEntryData) => void;
}

const VAULT_DRAG_MIME = 'application/kanshan-vault';

export function VaultEntry({ entry, onOpen, onExportMd, onExportDocx, onDelete }: VaultEntryProps) {
  const [hover, setHover] = useState(false);
  const [chunksOpen, setChunksOpen] = useState(false);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksError, setChunksError] = useState<string | null>(null);
  const [chunks, setChunks] = useState<ChunkPreview[] | null>(null);
  const accountId = useAccountStore((s) => s.active);

  const fetchChunks = useCallback(async () => {
    setChunksLoading(true);
    setChunksError(null);
    try {
      const res = await fetch(`/api/vault/articles/${encodeURIComponent(entry.id)}/chunks`, {
        headers: { 'x-kanshan-account': accountId },
      });
      if (!res.ok) {
        throw new Error(`http ${res.status}`);
      }
      const data = (await res.json()) as ChunksResponse;
      setChunks(data.chunks);
    } catch {
      setChunksError('无法读取分块');
    } finally {
      setChunksLoading(false);
    }
  }, [accountId, entry.id]);

  const toggleChunks = useCallback(() => {
    setChunksOpen((prev) => {
      const next = !prev;
      if (next && chunks === null && !chunksLoading) {
        void fetchChunks();
      }
      return next;
    });
  }, [chunks, chunksLoading, fetchChunks]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    const payload = {
      id: entry.id,
      title: entry.title,
      snippet: entry.snippet,
      year: entry.year,
      tags: entry.tags,
      spine: entry.spine,
    };
    e.dataTransfer.setData(VAULT_DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      data-testid={`vault-entry-${entry.id}`}
      data-article-id={entry.id}
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        gap: 12,
        padding: '10px 8px',
        background: hover ? 'rgba(255,250,235,0.7)' : 'transparent',
        borderRadius: 2,
        marginBottom: 2,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      {/* book-spine color tag */}
      <div
        style={{
          width: 4,
          alignSelf: 'stretch',
          borderRadius: 1,
          background: entry.spine || '#1772F6',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#1A1815',
              fontFamily: '"Noto Serif SC", serif',
              letterSpacing: 0.5,
            }}
          >
            {entry.title}
          </span>
          {entry.draft && (
            <span
              style={{
                fontSize: 9,
                color: '#B85543',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: 0.5,
                padding: '0 4px',
                border: '1px solid #B8554355',
                borderRadius: 2,
              }}
            >
              未发表
            </span>
          )}
        </div>
        {/* Snippet — bumps to 14px on hover for 腾讯会议 share readability
            (persona-review 2026-05-10 林青 polish note: 12px Songti is
            unreadable at 3-sec projector pace). */}
        <div
          className="vault-entry-snippet"
          style={{
            fontSize: 12,
            color: '#3A3633',
            fontFamily: '"Noto Serif SC", serif',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 5,
            transition: 'font-size 0.18s ease, line-height 0.18s ease',
          }}
        >
          {entry.snippet}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 9.5,
            color: '#1772F6',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 0.5,
          }}
        >
          <span>{entry.date}</span>
          <span>·</span>
          <span>{entry.words} 字</span>
          <span>·</span>
          <span style={{ color: '#1A1F2A' }}>借阅 {entry.borrows} 次</span>
          <span style={{ flex: 1 }} />
          {entry.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              style={{
                padding: '0 5px',
                background: 'rgba(23,114,246,0.08)',
                borderRadius: 1,
                fontFamily: '"Noto Serif SC", serif',
                letterSpacing: 0.5,
              }}
            >
              {t}
            </span>
          ))}
        </div>
        {/* Per-entry action chips (phase #15.9 Track 2). Hover-revealed so the
            row stays tidy at rest; click handlers stop propagation so the
            parent row's click-to-open doesn't double-fire. */}
        <div
          data-testid={`vault-entry-actions-${entry.id}`}
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 6,
            opacity: hover ? 1 : 0,
            transition: 'opacity 0.15s',
            pointerEvents: hover ? 'auto' : 'none',
          }}
        >
          <button
            type="button"
            data-testid={`vault-entry-open-${entry.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(entry);
            }}
            style={{
              padding: '2px 8px',
              fontSize: 10.5,
              fontFamily: '"Noto Serif SC", serif',
              letterSpacing: 1,
              background: '#1772F6',
              color: '#F4EAD0',
              border: '1px solid #1772F6',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            打开
          </button>
          <button
            type="button"
            data-testid={`vault-entry-export-md-${entry.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onExportMd(entry);
            }}
            style={{
              padding: '2px 8px',
              fontSize: 10.5,
              fontFamily: '"Noto Serif SC", serif',
              letterSpacing: 1,
              background: 'transparent',
              color: '#1772F6',
              border: '1px solid #1772F6',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            导出 .md
          </button>
          <button
            type="button"
            data-testid={`vault-entry-export-docx-${entry.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onExportDocx(entry);
            }}
            style={{
              padding: '2px 8px',
              fontSize: 10.5,
              fontFamily: '"Noto Serif SC", serif',
              letterSpacing: 1,
              background: 'transparent',
              color: '#1772F6',
              border: '1px solid #1772F6',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            导出 .docx
          </button>
          <button
            type="button"
            data-testid={`vault-entry-delete-${entry.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry);
            }}
            style={{
              padding: '2px 8px',
              fontSize: 10.5,
              fontFamily: '"Noto Serif SC", serif',
              letterSpacing: 1,
              background: 'transparent',
              color: '#B85543',
              border: '1px solid #B8554355',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            删除
          </button>
        </div>
        {/* phase #15.9 Track 4 — chunk introspection toggle. Sits on its own
            row below the action chips so it doesn't fight the hover-revealed
            row above. Visible at rest because users explicitly want
            transparency, not just on hover. */}
        <div
          style={{
            display: 'flex',
            marginTop: 6,
          }}
        >
          <button
            type="button"
            data-testid={`vault-entry-chunks-toggle-${entry.id}`}
            aria-expanded={chunksOpen}
            onClick={(e) => {
              e.stopPropagation();
              toggleChunks();
            }}
            style={{
              padding: '2px 8px',
              fontSize: 10.5,
              fontFamily: '"Noto Serif SC", serif',
              letterSpacing: 1,
              background: chunksOpen ? 'rgba(23,114,246,0.08)' : 'transparent',
              color: '#1772F6',
              border: '1px dashed #1772F655',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            {chunksOpen ? '收起分块' : '查看分块'}
          </button>
        </div>
        {chunksOpen && (
          <div
            data-testid={`vault-entry-chunks-panel-${entry.id}`}
            style={{
              marginTop: 6,
              marginLeft: 6,
              padding: '8px 10px',
              borderLeft: '2px solid #1772F655',
              background: 'rgba(244,234,208,0.4)',
              fontFamily: '"Noto Serif SC", serif',
              fontSize: 11,
              color: '#3A3633',
              lineHeight: 1.6,
            }}
          >
            {chunksLoading && <div>读取分块中...</div>}
            {!chunksLoading && chunksError && (
              <div style={{ color: '#B85543' }}>{chunksError}</div>
            )}
            {!chunksLoading && !chunksError && chunks && (
              <>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#1772F6',
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  共 {chunks.length} 块
                </div>
                {chunks.length === 0 ? (
                  <div style={{ color: '#8A8680', fontSize: 10.5 }}>
                    暂无分块数据 (内存模式 fallback)
                  </div>
                ) : (
                  chunks.map((c) => (
                    <div
                      key={c.id}
                      data-testid={`vault-entry-chunk-row-${c.id}`}
                      style={{
                        display: 'flex',
                        gap: 6,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 9.5,
                          color: '#1772F6',
                          flexShrink: 0,
                        }}
                      >
                        [{c.position}]
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        {c.text.slice(0, 80)}
                        {c.text.length > 80 ? '...' : ''}
                      </span>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 9.5,
                          color: '#8A8680',
                          flexShrink: 0,
                        }}
                      >
                        {c.charCount} 字
                      </span>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
      {/* hover-only "展卷" button */}
      <button
        aria-label={`展卷 ${entry.title}`}
        style={{
          alignSelf: 'center',
          flexShrink: 0,
          padding: '4px 10px',
          background: hover ? '#1772F6' : 'transparent',
          color: hover ? '#F4EAD0' : 'transparent',
          border: hover ? '1px solid #1772F6' : '1px solid transparent',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 11,
          letterSpacing: 2,
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(entry);
        }}
      >
        展卷
      </button>
    </div>
  );
}
