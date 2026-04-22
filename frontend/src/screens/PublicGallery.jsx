import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { TopBar } from '../components/TopBar.jsx';
import { TagBar } from '../components/TagBar.jsx';
import { SearchBox } from '../components/SearchBox.jsx';
import { MatchGrid } from '../components/MatchGrid.jsx';
import { Identicon } from '../components/Identicon.jsx';
import { LoginModal } from '../components/LoginModal.jsx';

function MenuBtn({ children, onClick, theme }) {
  return (
    <div onClick={onClick} style={{
      padding: '8px 12px', cursor: 'pointer',
      fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12, color: theme.ink, borderRadius: 4
    }}
      onMouseEnter={e => (e.currentTarget.style.background = theme.panel)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >{children}</div>
  );
}

export function PublicGallery({ nav, theme, layout, isDesktop }) {
  const { user, logout } = useAuth();
  const [matchboxes, setMatchboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selTag, setSelTag] = useState(null);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    api.listMatchboxes().then(setMatchboxes).finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => {
    return matchboxes.filter(c => {
      if (selTag && !c.tags?.includes(selTag)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(c.name?.toLowerCase().includes(q) || c.loc?.toLowerCase().includes(q) || c.roman?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [matchboxes, selTag, query]);

  return (
    <div style={{ background: theme.bg, minHeight: isDesktop ? '100vh' : '100%' }}>
      <TopBar title="CAFE MATCHBOX ARCHIVE" theme={theme}
        left={<div style={{
          fontFamily: '"Work Sans", sans-serif', fontSize: 10,
          color: theme.sub, letterSpacing: '0.15em'
        }}>蒐集 / 2026</div>}
        right={user ? (
          <div style={{ position: 'relative' }}>
            <div onClick={() => setMenuOpen(!menuOpen)} style={{ cursor: 'pointer' }}>
              <Identicon seed={user.username} size={30} />
            </div>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 38, right: 0,
                background: theme.bg, border: `0.5px solid ${theme.line}`,
                borderRadius: 8, padding: 4, minWidth: 140,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20
              }}>
                <MenuBtn theme={theme} onClick={() => { setMenuOpen(false); nav('mygallery'); }}>マイギャラリー</MenuBtn>
                <MenuBtn theme={theme} onClick={() => { setMenuOpen(false); nav('account'); }}>アカウント</MenuBtn>
                <MenuBtn theme={theme} onClick={() => { setMenuOpen(false); logout(); }}>ログアウト</MenuBtn>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setShowLogin(true)} style={{
            padding: '6px 12px', borderRadius: 100,
            border: `0.5px solid ${theme.ink}`, background: 'transparent',
            fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
            color: theme.ink, cursor: 'pointer', fontWeight: 500
          }}>ログイン</button>
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
        <LoginModal theme={theme} onClose={() => {
          setShowLogin(false);
          if (localStorage.getItem('cma_token')) nav('mygallery');
        }} />
      )}
    </div>
  );
}
