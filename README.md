# WBGT Heat Map

## playwrightmcp設定

このプロジェクトではplaywrightmcpを使用してブラウザ自動化を行います。

### 設定手順

1. `opencode.jsonc`にplaywrightmcp設定を追加：
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "playwrightmcp": {
      "type": "local",
      "command": ["npx", "@playwright/mcp@latest"],
      "enabled": true
    }
  }
}
```

2. 日本語フォント表示のためのパッケージインストール：
```bash
sudo apt update
sudo apt install fonts-noto-cjk
```

### 使用例

playwrightmcpを使ってブラウザ操作を自動化できます：
- Webページの自動ナビゲーション
- フォーム入力
- スクリーンショット取得
- 要素の検索とクリック

正常に設定されていれば、日本語サイトも文字化けせずに操作できます。