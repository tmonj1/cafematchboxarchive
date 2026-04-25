/**
 * OIDC PKCE ユーティリティ
 *
 * sessionStorage キー: cma_oidc_state
 * 保存形式: { state, codeVerifier, providerName }
 */

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/** PKCE の code_verifier と code_challenge を生成する。 */
export async function generatePKCE() {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64url(verifierBytes);

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier),
  );
  const codeChallenge = base64url(digest);

  return { codeVerifier, codeChallenge };
}

function generateState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** CSRF 防止用 state・code_verifier・provider 名を sessionStorage に保存する。 */
export function saveOidcState(state, codeVerifier, providerName) {
  sessionStorage.setItem(
    'cma_oidc_state',
    JSON.stringify({ state, codeVerifier, providerName }),
  );
}

/** sessionStorage から state を取得して削除する。失敗時は null を返す。 */
export function loadOidcState() {
  const raw = sessionStorage.getItem('cma_oidc_state');
  sessionStorage.removeItem('cma_oidc_state');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * PKCE 付き認可 URL を構築する。
 * sessionStorage に state・code_verifier・providerName を保存する副作用がある。
 *
 * @param {string} providerName - 環境変数 VITE_OIDC_PROVIDERS 内の name
 * @param {{ clientId: string, authorizationEndpoint: string, redirectUri: string }} config
 */
export async function buildAuthUrl(providerName, config) {
  const { codeVerifier, codeChallenge } = await generatePKCE();
  const state = generateState();
  saveOidcState(state, codeVerifier, providerName);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${config.authorizationEndpoint}?${params}`;
}

/** 環境変数からOIDCプロバイダー設定一覧を取得する。 */
export function getOidcProviders() {
  try {
    return JSON.parse(import.meta.env.VITE_OIDC_PROVIDERS || '[]');
  } catch {
    return [];
  }
}
