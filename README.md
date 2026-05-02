# Cafe Matchbox Archive

喫茶店のマッチ箱コレクションを管理・公開するためのWebアプリケーションです。コレクションした喫茶店のマッチ箱を写真付きで登録し、タグや検索で整理できます。

## 機能

- **パブリックギャラリー**: 登録されたマッチ箱を誰でも閲覧可能
- **マイギャラリー**: 自分のコレクションを管理
- **マッチ箱の登録・編集**: 画像アップロード、タグ付け、喫茶店情報の入力
- **検索・タグフィルタ**: キーワードやタグで絞り込み
- **地図表示**: 喫茶店の所在地住所を Nominatim API でジオコーディングし、OpenStreetMap で地図を表示
- **ユーザー認証**: アカウント登録・ログイン（パスワード認証 / OIDC ソーシャルログイン）

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React 18 + Vite |
| バックエンド | FastAPI (Python) |
| データベース | Amazon DynamoDB (ローカル開発: DynamoDB Local) |
| ストレージ | Amazon S3 (ローカル開発: MinIO) |
| 地図表示 | Leaflet + OpenStreetMap |
| ジオコーディング | [Nominatim API](https://nominatim.org/) (OpenStreetMap) |
| 開発環境 | Docker Compose |

## 前提条件

- Docker / Docker Compose
- Node.js 20以上 (フロントエンド開発時)
- Python 3.11以上 (バックエンド開発時)

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/tmonj1/cafematchboxarchive.git
cd cafematchboxarchive
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` ファイルをプロジェクトルートに作成します。

```bash
cp .env.example .env
```

主な設定項目は以下のとおりです。

```bash
# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRE_MINUTES=1440

# DynamoDB
DYNAMODB_ENDPOINT=http://dynamodb:8001
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_DEFAULT_REGION=ap-northeast-1

# S3 / MinIO
S3_ENDPOINT=http://minio:9000
S3_BUCKET=cafematchbox-images
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# MinIO console (ローカル開発のみ)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# OIDC (省略可。有効化する場合は下記を参照)
# OIDC_PROVIDERS={"keycloak":{...}}
```

### OIDC ソーシャルログインを有効化する場合

OIDC は省略可能な機能です。Keycloak などの IdP を使う場合のみ設定してください。

**バックエンド（`.env`）**

`OIDC_PROVIDERS` に JSON 形式でプロバイダーを設定します。Keycloak をローカルで使う例:

```bash
OIDC_PROVIDERS={"keycloak":{"client_id":"cma-frontend","client_secret":"","issuer":"http://localhost:8080/realms/cma","discovery_url":"http://keycloak:8080/realms/cma","allowed_redirect_uris":["http://localhost:5173/oidc-callback"]}}
```

> **重要**: `issuer` と Keycloak 管理画面の **Realm settings → Frontend URL** を一致させてください。`discovery_url` はバックエンドが Docker ネットワーク内から OIDC 設定を取得するための URL です。

**フロントエンド（`frontend/.env.local`）**

```bash
VITE_OIDC_PROVIDERS=[{"name":"keycloak","label":"Keycloakでログイン","clientId":"cma-frontend","issuer":"http://localhost:8080/realms/cma","authorizationEndpoint":"http://localhost:8080/realms/cma/protocol/openid-connect/auth","redirectUri":"http://localhost:5173/oidc-callback"}]
```

## 実行方法

### バックエンド + インフラ (Docker Compose)

```bash
docker compose up -d
```

起動後に以下のサービスが利用可能になります。

| サービス | URL |
|----------|-----|
| API | http://localhost:8000 |
| API ドキュメント (Swagger UI) | http://localhost:8000/docs |
| DynamoDB Local | http://localhost:8001 |
| MinIO コンソール | http://localhost:9001 |
| Keycloak 管理コンソール（OIDC 使用時） | http://localhost:8080 |

### フロントエンド (開発サーバー)

```bash
cd frontend
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

### フロントエンドのビルド

```bash
cd frontend
npm run build
```

## テスト方法

### バックエンドのテスト

```bash
cd backend
pip install -r requirements.txt
pytest
```

テストは [moto](https://github.com/getmoto/moto) を使ってDynamoDBとS3をモック化するため、Dockerなしで実行できます。

### フロントエンドのテスト

```bash
cd frontend
npm test
```

## API エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/api/health` | ヘルスチェック |
| `POST` | `/api/auth/register` | ユーザー登録 |
| `POST` | `/api/auth/login` | ログイン（パスワード認証） |
| `POST` | `/api/auth/oidc/callback` | OIDCコールバック（ソーシャルログイン） |
| `GET` | `/api/matchboxes` | マッチ箱一覧取得 |
| `POST` | `/api/matchboxes` | マッチ箱登録 |
| `GET` | `/api/matchboxes/{id}` | マッチ箱詳細取得 |
| `PUT` | `/api/matchboxes/{id}` | マッチ箱更新 |
| `DELETE` | `/api/matchboxes/{id}` | マッチ箱削除 |
| `POST` | `/api/matchboxes/{id}/images` | 画像アップロード |

詳細は http://localhost:8000/docs (起動後) を参照してください。

## マッチ箱写真処理スクリプト

`scripts/process_matchbox_photos.py` は、Apple Photos のアルバムからマッチ箱の写真を取得し、中央トリミング・メタデータ削除・WebP変換（ロスレス）を一括で行うユーティリティです（macOS 専用）。

### 前提条件

- macOS（Apple Photos ライブラリへのアクセスが必要）
- [uv](https://docs.astral.sh/uv/) がインストール済みであること（Python 3.11 以上は uv が自動で管理）

### 使い方

依存ライブラリのインストールは不要です。`uv run` が初回実行時に自動でセットアップします。

```bash
# 基本的な使い方（アルバム「マッチ箱」から全件処理）
uv run scripts/process_matchbox_photos.py

# アルバム名・出力先・トリミング比率を指定する
uv run scripts/process_matchbox_photos.py \
  --album "マッチ箱" \
  --output ./output \
  --ratio 4:3

# 処理対象を確認するだけで保存しない（dry-run）
uv run scripts/process_matchbox_photos.py --dry-run

# 最大 10 枚だけ処理する
uv run scripts/process_matchbox_photos.py --max-count 10
```

### オプション

| オプション | デフォルト | 説明 |
|-----------|-----------|------|
| `--album` | `マッチ箱` | Apple Photos のアルバム名 |
| `--output` | `scripts/images/` | 出力先ディレクトリ |
| `--ratio W:H` | （省略時は縦横50%） | トリミング比率（例: `1:1`, `4:3`） |
| `--max-count N` | 全件 | 処理する最大枚数 |
| `--dry-run` | — | 保存せず処理対象のみ表示 |

出力ファイル名は `YYYYMMDD_HHMMSS_<拡張子を除いた元ファイル名>_<幅>x<高さ>_<UUID8桁>.webp` 形式で、既存ファイルは上書きせずスキップします。同名の `.png` が残っている場合は注意メッセージを表示します。

## 外部サービス

### Nominatim (ジオコーディング)

喫茶店の所在地住所を緯度・経度に変換するために [Nominatim API](https://nominatim.openstreetmap.org/) を使用しています。詳細画面の「所在地」フィールドに住所が入力されていると、その直下に地図が表示されます。

- 日本国内の住所はズームレベル 13、海外はズームレベル 6 で表示
- ジオコーディングに失敗した場合は地図を非表示にして静かに処理
- Nominatim は [利用ポリシー](https://operations.osmfoundation.org/policies/nominatim/) により **1秒に1リクエスト以下** のレート制限があります。大量の住所を一括変換する用途には向いていません

## ライセンス

[MIT License](LICENSE)
