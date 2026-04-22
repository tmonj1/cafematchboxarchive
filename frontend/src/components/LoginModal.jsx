import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginModal({ onClose, theme }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!username.trim() || !password.trim()) {
      setError('ユーザー名とパスワードを入力してください');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
      onClose();
    } catch (e) {
      setError(e.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 6, boxSizing: 'border-box',
    background: theme.panel, border: `0.5px solid ${theme.line}`,
    fontFamily: '"Noto Sans JP", sans-serif', fontSize: 13,
    color: theme.ink, outline: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: theme.bg, borderRadius: 12, padding: 28, width: 320,
        boxShadow: '0 16px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ fontFamily: '"Work Sans", sans-serif', fontSize: 10,
          color: theme.accent, letterSpacing: '0.3em', marginBottom: 16 }}>
          {mode === 'login' ? 'LOGIN' : 'REGISTER'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={username} onChange={e => setUsername(e.target.value)}
            placeholder="ユーザー名" style={inputStyle} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="パスワード" onKeyDown={e => e.key === 'Enter' && handle()}
            style={inputStyle} />
        </div>

        {error && (
          <div style={{ fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
            color: theme.accent, marginTop: 10 }}>{error}</div>
        )}

        <button onClick={handle} disabled={loading} style={{
          marginTop: 16, width: '100%', padding: '12px',
          borderRadius: 8, border: 'none', background: theme.ink,
          fontFamily: '"Noto Sans JP", sans-serif', fontSize: 13,
          color: theme.bg, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500,
          opacity: loading ? 0.7 : 1,
        }}>{loading ? '...' : (mode === 'login' ? 'ログイン' : '登録する')}</button>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: '"Noto Sans JP", sans-serif', fontSize: 11,
              color: theme.sub, textDecoration: 'underline' }}>
            {mode === 'login' ? '新規登録はこちら' : 'ログインはこちら'}
          </button>
        </div>
      </div>
    </div>
  );
}
