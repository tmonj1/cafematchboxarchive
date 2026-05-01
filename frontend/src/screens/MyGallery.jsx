import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { TopBar, IconBtn, icons } from '../components/TopBar.jsx';
import { TagBar } from '../components/TagBar.jsx';
import { SearchBox } from '../components/SearchBox.jsx';
import { MatchGrid } from '../components/MatchGrid.jsx';
import { UserMenu } from '../components/UserMenu.jsx';

export function MyGallery({ nav, theme, layout, isDesktop }) {
  const { user } = useAuth();
  const [matchboxes, setMatchboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selTag, setSelTag] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.listMyMatchboxes().then(setMatchboxes).finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => matchboxes.filter(c => {
    if (selTag && !c.tags?.includes(selTag)) return false;
    if (query) {
      if (query.startsWith('#')) {
        const tagQuery = query.slice(1).toLowerCase();
        if (tagQuery && !c.tags?.some(t => t.toLowerCase().includes(tagQuery))) return false;
      } else {
        if (!(c.name?.includes(query) || c.loc?.includes(query))) return false;
      }
    }
    return true;
  }), [matchboxes, selTag, query]);

  return (
    <div style={{ background: theme.bg, minHeight: isDesktop ? '100vh' : '100%' }}>
      <TopBar title="MY GALLERY" theme={theme}
        left={<IconBtn theme={theme} onClick={() => nav('public')}>{icons.back(theme.ink)}</IconBtn>}
        right={<UserMenu nav={nav} theme={theme} size={28} />}
      />

      <div style={{ padding: '24px 16px 12px' }}>
        <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 10,
          color: theme.accent, letterSpacing: '0.3em', marginBottom: 6 }}>MY COLLECTION</div>
        <div style={{ fontFamily: '"Noto Serif JP", serif', fontSize: 20,
          color: theme.ink, fontWeight: 500 }}>{user?.username} の蒐集</div>
        <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 10,
          color: theme.sub, marginTop: 6, letterSpacing: '0.1em' }}>
          {loading ? '...' : `${items.length} MATCHES COLLECTED`}
        </div>
      </div>

      <SearchBox value={query} onChange={setQuery} theme={theme} />
      <TagBar selected={selTag} onSelect={setSelTag} theme={theme} />

      {loading ? (
        <div style={{ padding: '40px 16px', textAlign: 'center',
          fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12, color: theme.sub }}>読み込み中...</div>
      ) : items.length > 0 ? (
        <MatchGrid items={items} onItemClick={c => nav('edit', { cafe: c })}
          layout={layout} theme={theme} isDesktop={isDesktop} />
      ) : (
        <div style={{ padding: '40px 16px', textAlign: 'center',
          fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12, color: theme.sub }}>
          まだマッチ箱がありません
        </div>
      )}

      <button onClick={() => nav('edit', { cafe: null })} style={{
        position: isDesktop ? 'fixed' : 'absolute',
        bottom: isDesktop ? 40 : 50, right: isDesktop ? 40 : 20,
        width: 56, height: 56, borderRadius: 28,
        background: theme.ink, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 30 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke={theme.bg} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <div style={{ height: 80 }} />
    </div>
  );
}
