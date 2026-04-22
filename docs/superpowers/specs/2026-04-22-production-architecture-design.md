# Cafe Matchbox Archive — 本番アーキテクチャ設計

_作成日: 2026-04-22_

## 概要

現在のプロトタイプ（React + Babel standalone + モックデータ）を、DynamoDB・S3を使った本番構成に置き換える。バックエンドはPython FastAPI、フロントエンドはVite + React（SPA）。開発時はDockerでローカル環境を構築し、将来的にAWSへデプロイする。

AWSデプロイ設定（Phase 4）は本スペックのスコープ外とし、別途設計する。

---

## リポジトリ構成（モノレポ）

```
cafematchboxarchive/
├── docker-compose.yml          # 開発環境一括起動
├── .env.example                # 環境変数のサンプル（コミット対象）
├── .env                        # 実際の環境変数（.gitignore対象）
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPIアプリ本体
│   │   ├── api/
│   │   │   ├── auth.py         # 登録・ログイン・アカウント削除
│   │   │   ├── matchboxes.py   # マッチ箱CRUD
│   │   │   └── images.py       # 画像アップロード・削除
│   │   ├── models/
│   │   │   ├── user.py         # Pydanticモデル（User）
│   │   │   └── matchbox.py     # Pydanticモデル（Matchbox）
│   │   ├── db/
│   │   │   ├── client.py       # DynamoDBクライアント初期化
│   │   │   ├── users.py        # usersテーブル操作
│   │   │   └── matchboxes.py   # matchboxesテーブル操作
│   │   ├── storage/
│   │   │   └── s3.py           # S3/MinIOクライアント・操作
│   │   └── auth/
│   │       └── jwt.py          # JWT生成・検証・依存関係
│   ├── requirements.txt
│   ├── Dockerfile
│   └── init_tables.py          # DynamoDBテーブル初期化スクリプト
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js       # fetch wrapper（JWT付与・エラーハンドリング）
│   │   ├── context/
│   │   │   └── AuthContext.jsx # JWT管理・ログイン状態
│   │   ├── components/         # 共通コンポーネント（Matchbox, Identicon等）
│   │   ├── screens/            # 6画面（プロトタイプから移植）
│   │   └── main.jsx            # エントリーポイント・ルーティング
│   ├── index.html
│   ├── vite.config.js          # APIプロキシ設定含む
│   └── package.json
└── docs/
    ├── ui_design_summary.md
    └── superpowers/specs/
        └── 2026-04-22-production-architecture-design.md
```

---

## Phase 1: Docker Compose 開発環境

### サービス構成

| サービス | イメージ | ポート | 役割 |
|---|---|---|---|
| `api` | ローカルビルド | 8000 | FastAPI（ホットリロード） |
| `dynamodb` | `amazon/dynamodb-local` | 8001 | DynamoDBローカル |
| `dynamodb-setup` | `amazon/aws-cli` | — | テーブル作成（one-shot） |
| `minio` | `minio/minio` | 9000, 9001 | S3互換ストレージ |
| `minio-setup` | `minio/mc` | — | バケット作成（one-shot） |

- フロントエンドはDockerに含めず、`npm run dev`（Vite dev server: localhost:5173）でホスト側で動かす
- フロントエンドの`/api/*`リクエストはViteのproxyで`localhost:8000`に転送（CORS設定不要）

### 環境変数（.env.example）

```env
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

# MinIO console用（ローカルのみ）
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

---

## Phase 2: バックエンドAPI（FastAPI）

### エンドポイント一覧

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/auth/register` | 不要 | ユーザー登録 |
| POST | `/api/auth/login` | 不要 | ログイン（JWTを返す） |
| DELETE | `/api/auth/account` | 必要 | アカウント削除（関連マッチ箱・画像も全削除） |
| GET | `/api/matchboxes` | 不要 | 全マッチ箱一覧（公開）。`?tag=`・`?q=`でフィルタ可 |
| GET | `/api/matchboxes/mine` | 必要 | 自分のマッチ箱一覧（マイギャラリー用） |
| GET | `/api/matchboxes/{id}` | 不要 | マッチ箱詳細 |
| POST | `/api/matchboxes` | 必要 | マッチ箱新規作成 |
| PUT | `/api/matchboxes/{id}` | 必要 | マッチ箱更新（自分のもののみ） |
| DELETE | `/api/matchboxes/{id}` | 必要 | マッチ箱削除（自分のもののみ） |
| POST | `/api/matchboxes/{id}/images` | 必要 | 画像アップロード（最大9枚） |
| DELETE | `/api/matchboxes/{id}/images/{key}` | 必要 | 画像削除 |

### 認証フロー

1. `/api/auth/login` にusername/passwordをPOST
2. 成功時にJWT（有効期限24時間）を返す
3. フロントエンドはJWTを`localStorage`に保存
4. 認証が必要なエンドポイントには`Authorization: Bearer <token>`ヘッダーを付与
5. FastAPIのDepends機構でJWT検証を共通化

### DynamoDBテーブル設計

**usersテーブル**

| 属性 | 型 | 説明 |
|---|---|---|
| `userId` | String (PK) | UUID |
| `username` | String | ログイン名（一意） |
| `passwordHash` | String | bcryptハッシュ |
| `bio` | String | 自己紹介（オプション） |
| `createdAt` | String | ISO8601 |

- GSI: `username-index`（PK: `username`）— ログイン時の検索用

**matchboxesテーブル**

| 属性 | 型 | 説明 |
|---|---|---|
| `matchboxId` | String (PK) | UUID |
| `userId` | String | 登録ユーザーのID |
| `name` | String | 店名（必須） |
| `roman` | String | ローマ字店名（オプション） |
| `est` | String | 創業年（オプション） |
| `loc` | String | 所在地（オプション） |
| `desc` | String | 説明（オプション） |
| `tags` | List[String] | タグ一覧 |
| `acquired` | String | 取得時期（オプション） |
| `closed` | String | 閉店時期（オプション、nullは未閉店） |
| `imageKeys` | List[String] | S3オブジェクトキーのリスト（最大9件） |
| `createdAt` | String | ISO8601 |
| `updatedAt` | String | ISO8601 |

- GSI: `userId-index`（PK: `userId`）— マイギャラリー取得用

### 画像管理

- S3キーの形式: `{userId}/{matchboxId}/{uuid}.{ext}`
- アップロード時: multipart/form-dataで受け取り、S3に保存後キーをDynamoDBに追加
- 削除時: S3からオブジェクト削除後、DynamoDBの`imageKeys`リストから除去
- 画像URLは都度S3の署名付きURLを生成（有効期限1時間）

---

## Phase 3: フロントエンド（Vite + React）

### 画像とCSSマッチ箱の扱い

プロトタイプではCSSで描画した架空のマッチ箱をサムネイルとして使用していた。本番では実際の写真を使用するが、画像が1枚もアップロードされていないマッチ箱にはCSSマッチ箱をフォールバックとして引き続き使用する（`imageKeys`が空のとき）。`style`属性（0〜9）はDynamoDBに保存し、新規作成時はランダムに割り当てる。

### 移植方針

- 既存プロトタイプのUIコンポーネント（`screens.jsx`, `matchbox.jsx`, `ios-frame.jsx`）を`frontend/src/`に移植
- モックデータ（`data.jsx`の`CAFES`配列、`TAGS`等）を削除し、APIクライアント経由のデータ取得に置き換える
- TypeScriptへの移行は今回スコープ外（JavaScriptのまま）

### APIクライアント（src/api/client.js）

```javascript
// JWTをAuthorizationヘッダーに自動付与し、
// 401エラー時はログアウト処理を行うfetch wrapper
```

### AuthContext（src/context/AuthContext.jsx）

- JWTをlocalStorageに保存・読み込み
- `user`（ログイン中ユーザー情報）、`login()`、`logout()`をContextで提供
- アプリ全体でログイン状態を参照可能にする

### 画面とAPIの対応

| 画面 | APIコール |
|---|---|
| パブリックギャラリー | GET `/api/matchboxes`（タグ・検索クエリパラメータ） |
| マイギャラリー | GET `/api/matchboxes/mine`（JWT必須、自分のものだけ返す） |
| カフェマッチ詳細 | GET `/api/matchboxes/{id}` |
| カフェマッチ編集 | PUT `/api/matchboxes/{id}`, POST/DELETE `/api/matchboxes/{id}/images` |
| 新規作成 | POST `/api/matchboxes` |
| アカウント | DELETE `/api/auth/account` |
| ログイン | POST `/api/auth/login` |

---

## スコープ外（Phase 4 で別途設計）

- AWSへのデプロイ設定（ECS Fargate / Lambda + API Gateway等）
- CloudFrontによるフロントエンド配信
- Route 53 / SSL証明書
- CI/CDパイプライン
