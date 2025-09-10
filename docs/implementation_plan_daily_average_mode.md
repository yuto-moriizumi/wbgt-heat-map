# 日平均モード実装計画

## 概要
WBGTヒートマップに新しい表示モード「日平均」を追加する実装計画です。現在の「時刻別」と「日最高」に加えて、各地点の1日のWBGT値の平均を表示できるようにします。

## 実装ステップ

### 1. UIコンポーネントの刷新 (`DailyMaxToggle` -> `DisplayModeSelector`)
- **対象ファイル**: `src/components/DailyMaxToggle.tsx` → 新規 `src/components/DisplayModeSelector.tsx`
- **変更内容**:
  - 現在の `DailyMaxToggle.tsx` は「時刻別」と「日最高」の2つの状態しか扱えません
  - これを3つのモード（時刻別、日最高、日平均）を切り替えられるように、ラジオボタングループを使用した新しいコンポーネントに置き換えます
  - `wbgt-config.ts` から `DISPLAY_MODES` をインポートし、選択肢を動的に生成します

### 2. 状態管理の更新 (`PageClientComponent.tsx`)
- **対象ファイル**: `src/app/[locale]/page.tsx` (PageClientComponent)
- **変更内容**:
  - 現在の `isDailyMax` (boolean) という状態管理を、新しい表示モードに対応できるように `displayMode` (string) に変更します
  - `useState` の初期値は `'HOURLY'` とし、`DISPLAY_MODES` のキー（`HOURLY`, `DAILY_MAX`, `DAILY_AVERAGE`）を値として管理します

### 3. データ処理ロジックの追加 (`PageClientComponent.tsx`)
- **対象ファイル**: `src/app/[locale]/page.tsx` (PageClientComponent)
- **変更内容**:
  - `displayMode` の値に応じて、マップに表示するWBGTデータを動的に切り替えるロジックを実装します
  - `'HOURLY'`: 従来通り、タイムスライダーで選択された時刻のデータを表示します
  - `'DAILY_MAX'`: 従来通り、各地点の日最高値を計算して表示します
  - `'DAILY_AVERAGE'`: **（新規）** 各地点の1日のWBGT値の平均を計算するロジックを追加します。データが存在しない時間は計算から除外します

### 4. コンポーネントの差し替え
- **対象ファイル**: `src/app/[locale]/page.tsx` (PageClientComponent)
- **変更内容**:
  - 古い `DailyMaxToggle` を新しい `DisplayModeSelector` コンポーネントに差し替えます

## 必要な変更点の詳細

### DISPLAY_MODES の活用
- `src/lib/wbgt-config.ts` で定義された `DISPLAY_MODES` を活用して、モードの追加・変更を容易にします
- 現在の形式:
  ```typescript
  export const DISPLAY_MODES = {
    HOURLY: "時刻別",
    DAILY_MAX: "日最高",
    DAILY_AVERAGE: "日平均",
  };
  ```

### データ処理の考慮点
- 日平均計算時には、データが存在しない時間帯（例: 夜間など）を除外して平均を計算します
- 計算式: `(有効データの合計) / (有効データ数)`
- データが存在しない地点は、従来通り「データなし」として扱います

## 実装後のテスト項目
1. 各モード（時刻別、日最高、日平均）の切り替えが正常に動作すること
2. 日平均モードで正しい平均値が計算・表示されること
3. データが存在しない地点の扱いが適切であること
4. UIのレスポンシブネスとアクセシビリティが維持されていること

## リスクと考慮点
- 日平均計算の性能影響: 大量のデータを処理する場合のメモリ使用量と計算時間を考慮
- データの整合性: 異なるモード間でのデータ表示の一貫性を確保
- ユーザビリティ: 新しいモードの追加が既存ユーザーの操作性を損なわないこと