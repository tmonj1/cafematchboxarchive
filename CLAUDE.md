# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

カフェマッチ（昔のカフェが配布していたマッチ箱）の写真を収集・公開するアーカイブサイト。

## リポジトリ構成

```
cafematchboxarchive/
├── frontend/        # Vite + React 18 SPA
├── backend/         # FastAPI バックエンド
├── docker-compose.yml
├── .env             # ローカル開発用環境変数（.env.example を参考に作成）
└── docs/
    └── ui_design_summary.md  # 画面仕様
```

## コマンド

### フロントエンド（`frontend/` ディレクトリ）

```bash
npm run dev      # 開発サーバー起動（http://localhost:5173）
npm run build    # 本番ビルド
npm test         # Vitest でテスト実行
```

### バックエンド（`backend/` ディレクトリ）

```bash
# 仮想環境を有効化してから実行
source .venv/bin/activate

uvicorn app.main:app --reload   # 開発サーバー起動（http://localhost:8000）
pytest                          # テスト全体を実行
pytest tests/test_auth.py       # 特定テストファイルのみ実行
```

### インフラ（リポジトリルートで実行）

```bash
docker compose up -d   # DynamoDB Local + MinIO + API を起動
docker compose down    # 停止
```

## アーキテクチャ

### フロントエンド

- **ルーティング**: React Router 等のライブラリは不使用。`App.jsx` で `stack`（配列）を state として持ち、`nav(screen, params)` 関数でスタックを操作するカスタムナビゲーション
- **認証**: `AuthContext.jsx` が JWT を `localStorage`（キー: `cma_token`）で管理。401 レスポンス時は `cma:logout` カスタムイベントを発火して自動ログアウト
- **API通信**: `src/api/client.js` の `api` オブジェクト（fetch wrapper）が全 API 呼び出しを担当。`/api` プレフィックスは Vite の proxy 設定でバックエンドに転送される
- **テーマ**: `App.jsx` の `PALETTES` オブジェクトで色を定義し、`theme` オブジェクトを全画面に props として渡す
- **レスポンシブ**: `isDesktop`（幅 680px 超）を `App.jsx` で判定し props で各画面に渡す

### バックエンド

- **フレームワーク**: FastAPI（`app/main.py`）
- **ルーター**: `/api/auth`、`/api/matchboxes`、`/api/matchboxes/{id}/images` の3つ
- **データベース**: DynamoDB（`users` テーブル、`matchboxes` テーブル）。`userId-index` / `username-index` の GSI を使用
- **ストレージ**: S3 互換（本番は AWS S3、ローカルは MinIO）。画像は `matchboxes/{matchboxId}/{filename}` のキー構造で保存
- **認証**: JWT（`python-jose`）。`app/auth/jwt.py` でトークン生成・検証
- **設定**: `app/config.py` が環境変数をラムダ関数として遅延評価（テスト時の monkeypatch に対応するため）

### テスト（バックエンド）

`moto` で DynamoDB・S3 をモックする。`conftest.py` の `aws_mock` フィクスチャが毎テストでテーブルとバケットを作成。テスト実行時は `.env` は不要（`set_test_env` が `autouse=True` で全テストに適用）。

### ローカル開発環境

`docker-compose.yml` が以下を提供：
- **DynamoDB Local**: ポート 8001（コンテナ内は 8000）
- **MinIO**: ポート 9000（API）/ 9001（管理コンソール）
- **API**: ポート 8000（ホットリロード有効）

`.env` は `.env.example` をコピーして作成。`DYNAMODB_ENDPOINT` は `http://localhost:8001`（フロントから直接ではなく API 経由なので Docker 内アドレスに注意）。

## 画面構成

6画面: パブリックギャラリー（トップ）・マイギャラリー・カフェマッチ詳細・カフェマッチ編集・アカウント・サイト紹介。詳細は `docs/ui_design_summary.md` を参照。
