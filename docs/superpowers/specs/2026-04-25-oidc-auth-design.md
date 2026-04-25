# OIDC認証対応 設計仕様

**日付:** 2026-04-25
**対象:** cafematchboxarchive フロントエンド・バックエンド

## 概要

既存のusername/password認証を維持しつつ、OIDCプロバイダー（Google等）経由のログイン・新規登録を追加する。本番ではAWS Cognitoを通じて各OPを束ねる。ローカル開発ではKeycloakをDockerで実行してテストする。

## 要件

| 項目 | 内容 |
|---|---|
| OIDCプロバイダー | 複数対応（Google等）。本番はAWS Cognito経由、ローカルはKeycloak |
| フロー | フロントエンド主導 Authorization Code Flow（PKCE） |
| 既存認証 | username/password認証をそのまま維持 |
| 新規登録 | OPから取得したemail=username、name=displayNameで自動登録 |
| アカウント連携 | emailが一致する既存ローカルユーザーへ自動紐付け |

## アーキテクチャ全体像

```
[Browser]
  1. "Googleでログイン"クリック
  2. code_verifier生成(PKCE)、stateをsessionStorageに保存
  3. OP認可URLへリダイレクト
          ↓
[Cognito / Keycloak]
  4. 認証完了 → コールバックURL + code
          ↓
[Browser: /oidc-callback ルート]
  5. code + code_verifier + provider を
     POST /api/auth/oidc/callback へ送信
          ↓
[Backend: /api/auth/oidc/callback]
  6. OPのtoken_endpointでIDトークン取得
  7. IDトークン検証（署名・iss・aud・exp）
  8. emailでDynamoDB検索
     - 既存ユーザー(email一致) → oidcProvidersに追記して紐付け
     - 新規 → email=username, displayName=nameクレームで作成
  9. 自前JWTを返す
          ↓
[Browser]
  10. JWTをlocalStorageに保存 → 既存フローと同一
```

既存の `/api/auth/login`・`/api/auth/register` は変更しない。

## データモデル変更

### DynamoDB `users` テーブル

既存フィールドはそのまま。以下を追加：

| フィールド | 型 | 説明 |
|---|---|---|
| `displayName` | String (optional) | OPから取得した表示名（nameクレーム） |
| `email` | String (optional) | OIDCで取得したメール。ローカルユーザーはnull |
| `oidcProviders` | List (optional) | 連携済みプロバイダー情報の配列 |

`oidcProviders` の形式（Map: provider名 → sub）:
```json
{ "google": "1234567890", "keycloak": "sub-abc" }
```

※ リスト of Map ではなく Map 形式を採用。DynamoDB の `contains` 関数がリスト内の Map 要素に対して正しく動作しないため、`attribute_not_exists(oidcProviders.#p)` による原子的な重複防止が可能な Map 形式とした。

### 新規GSI

`email-index`: `email` をハッシュキーとしたGSI。OIDCコールバック時のユーザー検索に使用。

### アカウント連携ロジック

1. IDトークンの `email` で `email-index` を検索
2. ヒット（OIDCユーザーまたはemailを保持する既存ユーザー） → `oidcProviders` に `{provider, sub}` を追記（重複はスキップ）
3. ミス → `username=email`, `displayName=name`, `oidcProviders=[{provider, sub}]`, `passwordHash=null` で新規作成

**注意**: `create_user`（username/passwordで作成したローカルユーザー）は `email` 属性を保存しないため、`email-index` にヒットせず自動連携されない。これはセキュリティ上の意図的な設計（fail-closed）であり、第三者が同名のusernameを事前登録してアカウントを乗っ取るリスクを防ぐ。ローカルユーザーとOIDCユーザーを連携させたい場合は別途メール検証済みemailフィールドの導入が必要。

## バックエンド実装

### 新規ファイル

**`app/auth/oidc.py`**
- OPの `/.well-known/openid-configuration` からJWKSを取得
- IDトークンの署名（RS256）・iss・aud・expを検証
- `provider` 名をキーに設定を切り替える
- JWKSはメモリキャッシュ（TTL付き）して過剰なHTTPリクエストを防ぐ

**`app/api/auth_oidc.py`**
```
POST /api/auth/oidc/callback
  body: { code, code_verifier, redirect_uri, provider }
  response: { access_token, token_type }
```

### 変更ファイル

**`app/db/users.py`**
- `get_user_by_email(email: str) -> Optional[dict]` 追加
- `create_oidc_user(email, display_name, provider, sub) -> dict` 追加
- `link_oidc_provider(user_id, provider, sub) -> None` 追加

**`app/config.py`**
```python
OIDC_PROVIDERS = lambda: json.loads(get("OIDC_PROVIDERS", "{}"))
# キー=provider名, 値={client_id, client_secret, issuer}
```

**`app/main.py`**
- `auth_oidc.router` を `/api/auth` プレフィックスで追加

**`docker-compose.yml`**
- Keycloakサービスを追加

**`dynamodb-setup`**
- `email-index` GSIをusersテーブルに追加

### 依存追加（`requirements.txt`）

- `httpx` — OPのtoken_endpoint・JWKSへのHTTPクライアント
- `python-jose[cryptography]` — RS256検証のためcryptography extras明示（既存パッケージのextras追加）

### エラーハンドリング

| 状況 | レスポンス |
|---|---|
| OPのtoken_endpoint呼び出し失敗 | 502 Bad Gateway |
| IDトークン検証失敗 | 401 Unauthorized |
| emailクレームなし | 400 Bad Request |

※ state検証はフロントエンドで実施（sessionStorageと照合）。バックエンドはstateを受け取らない。

## フロントエンド実装

### 新規ファイル

**`src/auth/oidc.js`**
- `generatePKCE()` — Web Crypto APIで `code_verifier`・`code_challenge` を生成
- `buildAuthUrl(providerName, config)` — 認可URLを組み立て（state付き）
- `saveOidcState(state, codeVerifier, providerName)` — sessionStorageに保存
- `loadOidcState()` — sessionStorageから `{state, codeVerifier, providerName}` を取得・削除

**`src/screens/OidcCallbackScreen.jsx`**
- URLから `code`・`state` を取得
- sessionStorageのstateと照合（CSRF防止。不一致なら即エラー）
- `loginWithOidc()` を呼び出し
- 成功 → `nav('public')` でトップ画面へ
- 失敗 → エラーメッセージ表示

### 変更ファイル

**`src/api/client.js`**
- `oidcCallback(code, codeVerifier, redirectUri, provider)` を追加

**`src/context/AuthContext.jsx`**
- `loginWithOidc(code, codeVerifier, redirectUri, provider)` を追加

**`src/components/LoginModal.jsx`**
- 既存フォームの下に区切り線 + OIDCプロバイダーボタンを追加
- プロバイダー一覧は `VITE_OIDC_PROVIDERS` 環境変数（JSON配列）から取得
- ボタンクリック → `buildAuthUrl()` → `window.location.href` でリダイレクト

**`src/App.jsx`**
- ページロード時にURLパスが `/oidc-callback` なら `OidcCallbackScreen` を表示（stackに依存しないダイレクト表示）

### 環境変数（フロントエンド）

```
# .env.local（ローカル開発）
VITE_OIDC_PROVIDERS=[{"name":"keycloak","label":"Keycloakでログイン","clientId":"cma-frontend","issuer":"http://localhost:8080/realms/cma","authorizationEndpoint":"http://localhost:8080/realms/cma/protocol/openid-connect/auth","redirectUri":"http://localhost:5173/oidc-callback"}]
```

## ローカル開発環境（Keycloak）

### docker-compose.yml への追加

```yaml
keycloak:
  image: quay.io/keycloak/keycloak:24.0
  ports:
    - "8080:8080"
  environment:
    KEYCLOAK_ADMIN: admin
    KEYCLOAK_ADMIN_PASSWORD: admin
  command: start-dev
  volumes:
    - keycloak_data:/opt/keycloak/data
```

### Keycloak初期設定（初回のみ手動）

1. `http://localhost:8080` → admin/admin でログイン
2. Realm `cma` を作成
3. Client `cma-frontend` を作成
   - Client authentication: **OFF**（パブリッククライアント、PKCEのみ）
   - Valid redirect URIs: `http://localhost:5173/oidc-callback`
   - Web origins: `http://localhost:5173`
4. テストユーザーを作成（email必須）

### Keycloak Frontend URL の設定（重要）

Keycloak が Docker 内で動作する場合、デフォルトでは `iss` クレームが内部ホスト名（`keycloak:8080`）ではなくリクエスト元のURL（`localhost:8080`）ベースになる。バックエンドの `issuer` はこの `iss` と一致させる必要がある。

- Keycloak 管理画面 → Realm settings → Frontend URL を `http://localhost:8080` に設定する
- これにより `iss=http://localhost:8080/realms/cma` となり、バックエンドの設定と一致する

### バックエンド環境変数（`.env`）

```
# issuer: Keycloakが発行するトークンのiss（ブラウザからアクセスするURL）
# discovery_url: バックエンドがDockerネットワーク内からopenid-configを取得するURL
OIDC_PROVIDERS={"keycloak":{"client_id":"cma-frontend","client_secret":"","issuer":"http://localhost:8080/realms/cma","discovery_url":"http://keycloak:8080/realms/cma","allowed_redirect_uris":["http://localhost:5173/oidc-callback"]}}
```

※ パブリッククライアントのため `client_secret` は空文字でよい。

## テスト方針

### バックエンド

- `pytest-httpx` でOPへのHTTPリクエスト（token_endpoint・JWKS）をモック
- 正常系（新規登録・既存ユーザー連携）、異常系（無効トークン・emailなし）を網羅

### フロントエンド

- PKCEフローはブラウザで手動テスト（Keycloak使用）
- `OidcCallbackScreen` のstate検証ロジックはVitest + jsdomでユニットテスト可能

## 環境切り替え一覧

| 環境 | フロント `VITE_OIDC_PROVIDERS` | バックエンド `OIDC_PROVIDERS` |
|---|---|---|
| ローカル | Keycloak (localhost:8080) | Keycloak (keycloak:8080) |
| 本番 | AWS Cognito User Pool URL | AWS Cognito User Pool URL |
