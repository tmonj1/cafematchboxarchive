import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

// JWT ペイロードを手動デコード（検証なし。検証はサーバー側で行う）
// base64url → base64 変換 + UTF-8 デコードで日本語ニックネームにも対応
function parseToken(token) {
  try {
    const [, payload] = token.split('.');
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('cma_token');
    return token ? parseToken(token) : null;
  });

  const login = useCallback(async (username, password) => {
    const { access_token } = await api.login(username, password);
    localStorage.setItem('cma_token', access_token);
    setUser(parseToken(access_token));
  }, []);

  const register = useCallback(async (username, password) => {
    await api.register(username, password);
    await login(username, password);
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('cma_token');
    setUser(null);
  }, []);

  const loginWithOidc = useCallback(async (code, codeVerifier, redirectUri, provider) => {
    const { access_token } = await api.oidcCallback(code, codeVerifier, redirectUri, provider);
    localStorage.setItem('cma_token', access_token);
    setUser(parseToken(access_token));
  }, []);

  const updateProfile = useCallback(async (data) => {
    const { access_token } = await api.updateProfile(data);
    localStorage.setItem('cma_token', access_token);
    setUser(parseToken(access_token));
  }, []);

  // displayName クレームがない古いトークンをサイレントに更新する
  useEffect(() => {
    const token = localStorage.getItem('cma_token');
    if (!token) return;
    const payload = parseToken(token);
    if (payload && !('displayName' in payload)) {
      api.updateProfile({}).then(({ access_token }) => {
        localStorage.setItem('cma_token', access_token);
        setUser(parseToken(access_token));
      }).catch(() => {});
    }
  }, []);

  // 401 レスポンス時に自動ログアウト
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('cma:logout', handler);
    return () => window.removeEventListener('cma:logout', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loginWithOidc, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
