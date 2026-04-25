// JWT をヘッダーに自動付与し、401 時に localStorage をクリアする fetch wrapper
const BASE = '/api';

function getToken() {
  return localStorage.getItem('cma_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // multipart/form-data の場合は Content-Type を削除（ブラウザが自動設定する）
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const resp = await fetch(`${BASE}${path}`, { ...options, headers });

  if (resp.status === 401) {
    localStorage.removeItem('cma_token');
    window.dispatchEvent(new Event('cma:logout'));
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || 'Request failed');
  }

  if (resp.status === 204) return null;
  return resp.json();
}

export const api = {
  // 認証
  register: (username, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  deleteAccount: () =>
    request('/auth/account', { method: 'DELETE' }),
  oidcCallback: (code, codeVerifier, redirectUri, provider) =>
    request('/auth/oidc/callback', {
      method: 'POST',
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        provider,
      }),
    }),

  // マッチ箱
  listMatchboxes: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString();
    return request(`/matchboxes${qs ? '?' + qs : ''}`);
  },
  listMyMatchboxes: () => request('/matchboxes/mine'),
  getMatchbox: (id) => request(`/matchboxes/${id}`),
  createMatchbox: (data) =>
    request('/matchboxes', { method: 'POST', body: JSON.stringify(data) }),
  updateMatchbox: (id, data) =>
    request(`/matchboxes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMatchbox: (id) =>
    request(`/matchboxes/${id}`, { method: 'DELETE' }),

  // 画像
  uploadImage: (matchboxId, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/matchboxes/${matchboxId}/images`, { method: 'POST', body: form });
  },
  deleteImage: (matchboxId, key) => {
    const encoded = encodeURIComponent(key);
    return request(`/matchboxes/${matchboxId}/images/${encoded}`, { method: 'DELETE' });
  },
};
