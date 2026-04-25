import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { loadOidcState, getOidcProviders } from '../auth/oidc.js';

export function OidcCallbackScreen({ nav, theme }) {
  const { loginWithOidc } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const returnedState = params.get('state');

      if (!code || !returnedState) {
        setError('認証パラメータが不正です');
        return;
      }

      const saved = loadOidcState();
      if (!saved || saved.state !== returnedState) {
        setError('stateが一致しません。再度ログインしてください');
        return;
      }

      const { codeVerifier, providerName } = saved;
      const providers = getOidcProviders();
      const providerConfig = providers.find(p => p.name === providerName);
      if (!providerConfig) {
        setError('プロバイダー設定が見つかりません');
        return;
      }

      try {
        await loginWithOidc(code, codeVerifier, providerConfig.redirectUri, providerName);
        window.history.replaceState({}, '', '/');
        nav('public');
      } catch (e) {
        setError(e.message || 'ログインに失敗しました');
      }
    }

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: '"Noto Sans JP", sans-serif', color: theme.ink,
    }}>
      {error ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: theme.accent, marginBottom: 16, fontSize: 13 }}>{error}</div>
          <button
            onClick={() => { window.history.replaceState({}, '', '/'); nav('public'); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme.sub, textDecoration: 'underline', fontSize: 12,
              fontFamily: '"Noto Sans JP", sans-serif',
            }}
          >
            トップへ戻る
          </button>
        </div>
      ) : (
        <div style={{ color: theme.sub, fontSize: 13 }}>認証中...</div>
      )}
    </div>
  );
}
