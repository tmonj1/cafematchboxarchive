import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Identicon } from './Identicon.jsx';

function MenuBtn({ children, onClick, theme }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block', width: '100%', padding: '8px 12px',
        cursor: 'pointer', textAlign: 'left', border: 'none', borderRadius: 4,
        fontFamily: '"Noto Sans JP", sans-serif', fontSize: 12,
        color: theme.ink, background: 'transparent',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = theme.panel)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      onFocus={e => (e.currentTarget.style.background = theme.panel)}
      onBlur={e => (e.currentTarget.style.background = 'transparent')}
    >{children}</button>
  );
}

export function UserMenu({ nav, theme, size = 30 }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="ユーザーメニュー"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(o => !o)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
      >
        <Identicon seed={user.username} size={size} />
      </button>
      {menuOpen && (
        <>
          {/* オーバーレイ: メニュー外クリックで閉じる */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            style={{
              position: 'absolute', top: size + 8, right: 0,
              background: theme.bg, border: `0.5px solid ${theme.line}`,
              borderRadius: 8, padding: 4, minWidth: 140,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 41
            }}
          >
            <MenuBtn theme={theme} onClick={() => { setMenuOpen(false); nav('mygallery'); }}>マイギャラリー</MenuBtn>
            <MenuBtn theme={theme} onClick={() => { setMenuOpen(false); nav('account'); }}>アカウント</MenuBtn>
            <MenuBtn theme={theme} onClick={() => { setMenuOpen(false); logout(); nav('public'); }}>ログアウト</MenuBtn>
          </div>
        </>
      )}
    </div>
  );
}
