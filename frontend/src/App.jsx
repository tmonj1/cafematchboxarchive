import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { PublicGallery } from './screens/PublicGallery.jsx';
import { MyGallery } from './screens/MyGallery.jsx';
import { CafeDetail } from './screens/CafeDetail.jsx';
import { EditScreen } from './screens/EditScreen.jsx';
import { AccountScreen } from './screens/AccountScreen.jsx';
import { AboutScreen } from './screens/AboutScreen.jsx';

const PALETTES = {
  stone: {
    bg: '#fafaf7', ink: '#2c2c2c', sub: '#6b7066',
    accent: '#8b4a3a', panel: '#f1efe8', line: 'rgba(60,60,67,0.14)',
  },
  cream: {
    bg: '#f5f0e6', ink: '#3a3530', sub: '#8b7a5c',
    accent: '#8b2d1a', panel: '#eee6d4', line: 'rgba(60,40,30,0.15)',
  },
};

function AppInner() {
  const { user } = useAuth();
  const [stack, setStack] = useState([{ screen: 'public' }]);
  const [theme] = useState(PALETTES.stone);
  const [layout] = useState('mosaic');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 680);

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth > 680);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const nav = (screen, params = {}) => {
    if (screen === 'back') {
      setStack(s => s.length > 1 ? s.slice(0, -1) : s);
      return;
    }
    // ログイン後にマイギャラリーに来た場合は public を置き換える
    if (screen === 'mygallery') {
      setStack([{ screen: 'public' }, { screen: 'mygallery', ...params }]);
      return;
    }
    // 同じ画面への重複遷移はスキップ
    setStack(s => {
      const cur = s[s.length - 1];
      if (cur.screen === screen) return s;
      return [...s, { screen, ...params }];
    });
  };

  const current = stack[stack.length - 1];
  const shared = { nav, theme, isDesktop };

  let screenEl;
  switch (current.screen) {
    case 'public':
      screenEl = <PublicGallery {...shared} layout={layout} />;
      break;
    case 'mygallery':
      if (!user) { nav('public'); return null; }
      screenEl = <MyGallery {...shared} layout={layout} />;
      break;
    case 'detail':
      screenEl = <CafeDetail {...shared} cafeId={current.cafeId || current.cafe?.matchboxId} />;
      break;
    case 'edit':
      if (!user) { nav('public'); return null; }
      screenEl = <EditScreen {...shared} cafe={current.cafe || null} />;
      break;
    case 'account':
      if (!user) { nav('public'); return null; }
      screenEl = <AccountScreen {...shared} />;
      break;
    case 'about':
      screenEl = <AboutScreen {...shared} />;
      break;
    default:
      screenEl = <div style={{ padding: 40 }}>404</div>;
  }

  if (isDesktop) {
    return (
      <div style={{ background: theme.bg, minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>{screenEl}</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: theme.bg }}>
      {screenEl}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
