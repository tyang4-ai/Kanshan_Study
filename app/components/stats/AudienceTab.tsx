'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { SectionTitle } from './SectionTitle';
import audienceSeed from '@/content/seed/stats-audience.json';

interface StatsAudience {
  sample: number;
  readerTypes: { label: string; ratio: number }[];
  wordCloud: { term: string; weight: number }[];
}

interface ZhihuUserBrief {
  uid: string;
  fullname: string;
  avatarPath: string | null;
  hashId?: string;
  url?: string;
  headline?: string;
}

interface FollowersResponse {
  followers: ZhihuUserBrief[];
  followed: ZhihuUserBrief[];
  followerCount: number;
  followedCount: number;
  source: 'live' | 'mock';
}

export function AudienceTab() {
  const data = audienceSeed as StatsAudience;
  const [zhihu, setZhihu] = useState<FollowersResponse | null>(null);
  const [zhihuLoading, setZhihuLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/zhihu/followers?per_page=20');
        if (!res.ok) {
          if (!cancelled) setZhihuLoading(false);
          return;
        }
        const data = (await res.json()) as FollowersResponse;
        if (!cancelled) {
          setZhihu(data);
          setZhihuLoading(false);
        }
      } catch {
        if (!cancelled) setZhihuLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const showZhihu =
    zhihu &&
    zhihu.source === 'live' &&
    (zhihu.followers.length > 0 || zhihu.followed.length > 0);

  return (
    <div data-testid="stats-audience">
      {showZhihu && zhihu && (
        <ZhihuFollowersSection data={zhihu} />
      )}

      <SectionTitle>读者画像 · 加权样本 {data.sample.toLocaleString()}</SectionTitle>
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(23,114,246,0.18)',
          borderRadius: 4,
          padding: 14,
          marginBottom: 14,
        }}
      >
        {data.readerTypes.map((r) => (
          <div key={r.label} style={{ marginBottom: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11.5,
                marginBottom: 3,
                fontFamily: '"Noto Sans SC", sans-serif',
              }}
            >
              <span>{r.label}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#5A6270' }}>
                {(r.ratio * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 5, background: 'rgba(0,0,0,0.05)', borderRadius: 3 }}>
              <div style={{ width: `${r.ratio * 100}%`, height: '100%', background: '#1772F6', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>读者关心的关键词 · 词云</SectionTitle>
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(23,114,246,0.18)',
          borderRadius: 4,
          padding: 18,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {data.wordCloud.map((w, i) => (
          <span
            key={i}
            style={{
              fontSize: w.weight,
              color: i % 2 === 0 ? '#1772F6' : '#1F8B66',
              fontFamily: '"Noto Serif SC", serif',
              fontWeight: w.weight > 18 ? 600 : 400,
              opacity: 0.5 + w.weight / 50,
            }}
          >
            {w.term}
          </span>
        ))}
      </div>

      {!showZhihu && !zhihuLoading && (
        <div
          data-testid="stats-audience-zhihu-empty"
          style={{
            marginTop: 14,
            padding: '10px 14px',
            fontSize: 11,
            color: '#5A6270',
            background: '#F4F7FB',
            border: '1px dashed rgba(23,114,246,0.20)',
            borderRadius: 4,
            fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >
          连接知乎账号后，这里会显示你在知乎上的真实粉丝 / 关注列表（看镜 · 调用 /user/followers + /user/followed）。
        </div>
      )}
    </div>
  );
}

function ZhihuFollowersSection({ data }: { data: FollowersResponse }) {
  const [tab, setTab] = useState<'followers' | 'followed'>('followers');
  const list = tab === 'followers' ? data.followers : data.followed;

  const tabBtn = (id: 'followers' | 'followed', label: string, count: number): CSSProperties => ({
    padding: '6px 12px',
    border: 'none',
    background: 'transparent',
    color: tab === id ? '#1772F6' : '#5A6270',
    fontSize: 11.5,
    cursor: 'pointer',
    borderBottom: tab === id ? '2px solid #1772F6' : '2px solid transparent',
    fontWeight: tab === id ? 600 : 400,
    fontFamily: '"Noto Sans SC", sans-serif',
  });

  return (
    <div style={{ marginBottom: 18 }} data-testid="stats-audience-zhihu-real">
      <SectionTitle>
        知乎真实数据 · {data.followers.length} 粉丝 · {data.followed.length} 关注
      </SectionTitle>
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(23,114,246,0.18)',
          borderRadius: 4,
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(23,114,246,0.10)' }}>
          <button type="button" onClick={() => setTab('followers')} style={tabBtn('followers', '粉丝', data.followers.length)}>
            粉丝 · {data.followers.length}
          </button>
          <button type="button" onClick={() => setTab('followed')} style={tabBtn('followed', '关注', data.followed.length)}>
            关注 · {data.followed.length}
          </button>
          <div style={{ flex: 1 }} />
          <div
            style={{
              padding: '6px 10px',
              fontSize: 9.5,
              color: '#1F8B66',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 0.5,
              alignSelf: 'center',
            }}
          >
            ● LIVE · 知乎 /user/{tab}
          </div>
        </div>
        {list.length === 0 ? (
          <div style={{ padding: 18, fontSize: 11, color: '#7A8B9F', fontFamily: '"Noto Sans SC", sans-serif' }}>
            {tab === 'followers' ? '尚无粉丝。' : '尚未关注任何人。'}
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {list.map((u) => (
              <li key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px' }}>
                <span
                  style={{
                    width: 28, height: 28, borderRadius: 14,
                    background: u.avatarPath ? '#fff' : '#1772F6',
                    color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"Noto Serif SC", serif',
                    fontSize: 12,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {u.avatarPath
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={u.avatarPath} alt="" width={28} height={28} style={{ display: 'block', objectFit: 'cover' }} />
                    : u.fullname.slice(0, 1)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {u.url ? (
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1A1F2A', fontSize: 12.5, textDecoration: 'none', fontFamily: '"Noto Sans SC", sans-serif' }}
                    >
                      {u.fullname}
                    </a>
                  ) : (
                    <span style={{ color: '#1A1F2A', fontSize: 12.5, fontFamily: '"Noto Sans SC", sans-serif' }}>{u.fullname}</span>
                  )}
                  {u.headline && (
                    <div style={{ color: '#5A6270', fontSize: 10.5, marginTop: 2, fontFamily: '"Noto Sans SC", sans-serif' }}>
                      {u.headline}
                    </div>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
