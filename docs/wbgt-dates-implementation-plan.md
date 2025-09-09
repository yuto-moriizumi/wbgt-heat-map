# WbgtDataResult に dates プロパティを追加する実装計画

## 背景
日最大WBGT値の表示機能において、利用可能なデータの日付一覧が必要。現在の `WbgtDataResult` には時刻ベースの `timePoints` はあるが、日付のみの配列がない。

## 目的
`WbgtDataResult` インターフェースに `dates: string[]` プロパティを追加し、2025-09-11のような形式で利用可能なデータの日付一覧を提供する。

## 実装手順

### 1. 型定義の更新 (`src/lib/types.ts`)
- `WbgtDataResult` インターフェースに `dates: string[]` プロパティを追加
- JSDocコメントで目的を説明（2025-09-11形式の日付配列であることを明記）

```typescript
export interface WbgtDataResult {
  geojson: WbgtGeoJSON;
  /**
   * WBGTデータが存在する時刻のISO文字列配列。
   * JST（日本標準時）として扱われます。
   * @example ["2025-09-04T17:00:00.000Z", "2025-09-04T18:00:00.000Z"]
   */
  timePoints: string[];
  /**
   * WBGTデータが存在する日付の文字列配列。
   * YYYY-MM-DD形式で昇順にソートされます。
   * @example ["2025-09-09", "2025-09-10", "2025-09-11"]
   */
  dates: string[];
}
```

### 2. データ生成ロジックの修正 (`src/lib/create-geo-json.ts`)
- `createGeoJSON` 関数内で、既存の日付処理ロジック（100-112行目）を参考に、ユニークな日付を抽出
- 日付を昇順でソートして配列を作成
- 関数の戻り値に `dates` プロパティを追加

実装箇所：
- Line 100-112: 既存の `maxWbgtByDate` ロジックから日付を抽出
- Line 143: 戻り値に `dates` プロパティを追加

### 3. データフェッチロジックの更新 (`src/lib/fetch-wbgt-data.ts`)
- `fetchWbgtData` 関数が新しい `dates` プロパティを含む `WbgtDataResult` を返すことを確認
- `createWbgtGeoJSONFromCsv` からの戻り値に `dates` が含まれることを確認

### 4. 検証
- 型チェック (`npm run typecheck`)
- テスト実行 (`npm run test -- --run`)
- リントチェック (`npm run lint`)
- 未使用エクスポートチェック (`npm run unused`)
- ブラウザテスト（Playwright MCP）で機能確認

## 期待される結果
- `WbgtDataResult.dates` に ["2025-09-09", "2025-09-10", "2025-09-11"] のような形式で利用可能な日付一覧が含まれる
- 日最大WBGT値表示機能で使用可能
- 既存機能への影響なし

## 影響範囲
- `src/lib/types.ts` - 型定義追加
- `src/lib/create-geo-json.ts` - データ生成ロジック修正
- `src/lib/fetch-wbgt-data.ts` - 確認のみ（修正不要の予定）
- `src/app/[locale]/page.tsx` - 型チェックで確認

## リスク
- 既存の `WbgtDataResult` を使用している箇所でのTypeScriptエラー
- パフォーマンスへの影響（日付抽出処理の追加）

## 完了条件
- すべての型チェックが通る
- すべてのテストがパスする
- リントエラーがない
- 未使用エクスポートがない
- ブラウザで正常に動作する
