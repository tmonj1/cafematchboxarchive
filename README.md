# Cafe Matchbox Archive

喫茶店のマッチ箱コレクションを管理・公開するためのWebアプリケーションです。コレクションした喫茶店のマッチ箱を写真付きで登録し、タグや検索で整理できます。

## 機能

- **パブリックギャラリー**: 登録されたマッチ箱を誰でも閲覧可能
- **マイギャラリー**: 自分のコレクションを管理
- **マッチ箱の登録・編集**: 画像アップロード、タグ付け、喫茶店情報の入力
- **検索・タグフィルタ**: キーワードやタグで絞り込み
- **ユーザー認証**: アカウント登録・ログイン

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React 18 + Vite |
| バックエンド | FastAPI (Python) |
| データベース | Amazon DynamoDB (ローカル開発: DynamoDB Local) |
| ストレージ | Amazon S3 (ローカル開発: MinIO) |
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

`.env` ファイルをプロジェクトルートに作成します。

```bash
# DynamoDB
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_DEFAULT_REGION=ap-northeast-1
DYNAMODB_ENDPOINT_URL=http://localhost:8001

# MinIO (S3互換)
S3_ENDPOINT_URL=http://localhost:9000
S3_BUCKET=cafematchbox-images
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# JWT認証
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
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
| `POST` | `/api/auth/login` | ログイン |
| `GET` | `/api/matchboxes` | マッチ箱一覧取得 |
| `POST` | `/api/matchboxes` | マッチ箱登録 |
| `GET` | `/api/matchboxes/{id}` | マッチ箱詳細取得 |
| `PUT` | `/api/matchboxes/{id}` | マッチ箱更新 |
| `DELETE` | `/api/matchboxes/{id}` | マッチ箱削除 |
| `POST` | `/api/matchboxes/{id}/images` | 画像アップロード |

詳細は http://localhost:8000/docs (起動後) を参照してください。

## ライセンス

[MIT License](LICENSE)
