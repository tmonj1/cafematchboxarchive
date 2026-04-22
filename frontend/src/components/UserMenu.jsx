import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Identicon } from './Identicon.jsx';

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

export function UserMenu({ nav, theme, size = 30 }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setMenuOpen(o => !o)} style={{ cursor: 'pointer' }}>
        <Identicon seed={user.username} size={size} />
      </div>
      {menuOpen && (
        <>
          {/* オーバーレイ: メニュー外クリックで閉じる */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 19 }}
            onClick={() => setMenuOpen(false)}
          />
          <div style={{
            position: 'absolute', top: size + 8, right: 0,
            background: theme.bg, border: `0.5px solid ${theme.line}`,
            borderRadius: 8, padding: 4, minWidth: 140,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20
          }}>
            <MenuBtn theme={theme} onClick={() => { setMenuOpen(false); nav('mygallery'); }}>マイギャラリー</MenuBtn>
            <MenuBtn theme={theme} onClick={() => { setMenuOpen(false); nav('account'); }}>アカウント</MenuBtn>
            <MenuBtn theme={theme} onClick={() => { setMenuOpen(false); logout(); }}>ログアウト</MenuBtn>
          </div>
        </>
      )}
    </div>
  );
}
