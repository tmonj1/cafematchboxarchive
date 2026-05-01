import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
import { TagBar } from '../components/TagBar.jsx';
import { SearchBox } from '../components/SearchBox.jsx';
import { MatchGrid } from '../components/MatchGrid.jsx';
import { LoginModal } from '../components/LoginModal.jsx';
import { UserMenu } from '../components/UserMenu.jsx';

export function PublicGallery({ nav, theme, layout, isDesktop }) {
  const { user } = useAuth();
  const [matchboxes, setMatchboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selTag, setSelTag] = useState(null);
  const [query, setQuery] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState('login');

  useEffect(() => {
    api.listMatchboxes().then(setMatchboxes).finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => {
    const q = query.trim();
    return matchboxes.filter(c => {
      if (selTag && !c.tags?.includes(selTag)) return false;
      if (q) {
        if (q.startsWith('#')) {
          const tagQuery = q.slice(1).trim().toLowerCase();
          if (tagQuery && !c.tags?.some(t => t.toLowerCase().includes(tagQuery))) return false;
        } else {
          const ql = q.toLowerCase();
          if (!(c.name?.toLowerCase().includes(ql) || c.loc?.toLowerCase().includes(ql) || c.roman?.toLowerCase().includes(ql))) return false;
        }
      }
      return true;
    });
  }, [matchboxes, selTag, query]);

  return (
    <div style={{ background: theme.bg, minHeight: isDesktop ? '100vh' : '100%' }}>
      <TopBar title="CAFE MATCHBOX ARCHIVE" theme={theme}
        right={user ? (
          <UserMenu nav={nav} theme={theme} />
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            {isDesktop && (
              <button onClick={() => { setLoginMode('register'); setShowLogin(true); }} style={{
                padding: '6px 12px', borderRadius: 100,
                border: `0.5px solid ${theme.ink}`, background: 'transparent',
                fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
                color: theme.ink, cursor: 'pointer', fontWeight: 500
              }}>新規登録</button>
            )}
            <button onClick={() => { setLoginMode('login'); setShowLogin(true); }} style={{
              padding: '6px 12px', borderRadius: 100,
              border: `0.5px solid ${theme.ink}`, background: 'transparent',
              fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
              color: theme.ink, cursor: 'pointer', fontWeight: 500
            }}>ログイン</button>
          </div>
        )}
      />

      <div style={{ padding: '28px 16px 8px' }}>
        <div style={{
          fontFamily: '"Work Sans", sans-serif', fontSize: 10,
          color: theme.accent, letterSpacing: '0.3em', marginBottom: 8
        }}>
          A COLLECTION OF CAFE MATCHBOXES
        </div>
        <div style={{
          fontFamily: '"Noto Serif JP", serif', fontSize: 22, lineHeight: 1.5,
          color: theme.ink, fontWeight: 500
        }}>カフェマッチボックスコレクション</div>
        <div style={{
          fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
          color: theme.sub, marginTop: 12, lineHeight: 1.7
        }}>消えゆく街の記憶を、小さな箱のなかに。</div>
      </div>

      <SearchBox value={query} onChange={setQuery} theme={theme} />
      <TagBar selected={selTag} onSelect={setSelTag} theme={theme} />

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '4px 20px 16px', fontFamily: '"Work Sans", sans-serif',
        fontSize: 10, color: theme.sub, letterSpacing: '0.1em'
      }}>
        <span>{loading ? '...' : `${items.length} ITEMS`}</span>
        <span>{layout === 'mosaic' ? 'MOSAIC' : 'GRID'}</span>
      </div>

      {loading ? (
        <div style={{
          padding: '40px 16px', textAlign: 'center',
          fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12, color: theme.sub
        }}>
          読み込み中...
        </div>
      ) : (
        <MatchGrid items={items} onItemClick={c => nav('detail', { cafe: c })}
          layout={layout} theme={theme} isDesktop={isDesktop} />
      )}

      <div style={{
        padding: '40px 16px 80px', textAlign: 'center',
        borderTop: `0.5px solid ${theme.line}`, marginTop: 40
      }}>
        <a onClick={() => nav('about')} style={{
          fontFamily: '"Noto Sans JP", sans-serif',
          fontSize: 12, color: theme.sub, textDecoration: 'underline',
          cursor: 'pointer', textUnderlineOffset: 4
        }}>このサイトについて</a>
      </div>

      {showLogin && (
        <LoginModal theme={theme} initialMode={loginMode} onClose={() => {
          setShowLogin(false);
          if (localStorage.getItem('cma_token')) nav('mygallery');
        }} />
      )}
    </div>
  );
}
