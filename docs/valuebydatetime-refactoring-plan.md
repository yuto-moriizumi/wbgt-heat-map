# `valueByDateTime` リファクタリング計画

`WbgtProperties`の`valueByDateTime`プロパティを、時刻情報を含まない単純な数値（または`null`）の配列に変更するための実装計画です。

## 背景

`WbgtDataResult`には、データポイントの時刻情報を持つ`timePoints`配列がすでに存在します。`WbgtProperties`内の`valueByDateTime`配列の各要素に時刻情報を持たせるのは冗長です。`valueByDateTime`を単なる値の配列とし、`timePoints`配列のインデックスと対応させることで、データ構造を簡素化し、GeoJSONファイルのサイズを削減します。

## 影響範囲

- `src/lib/types.ts`
- `src/lib/create-geo-json.ts`
- `src/components/WbgtMapCore.tsx`
- `src/lib/fetch-wbgt-data.test.ts`

## 実装ステップ

1.  **型定義の変更 (`src/lib/types.ts`)**
    - `TimeSeriesData`インターフェースを削除します。
    - `WbgtProperties`インターフェース内の`valueByDateTime`プロパティの型を `TimeSeriesData[]` から `(number | null)[]` に変更します。

2.  **GeoJSON生成ロジックの修正 (`src/lib/create-geo-json.ts`)**
    - `createWbgtGeoJSON`関数を修正し、`valueByDateTime`プロパティに`wbgt`の値のみを含む配列をセットするように変更します。

3.  **地図コンポーネントの修正 (`src/components/WbgtMapCore.tsx`)**
    - 選択された時刻に対応するWBGT値を取得するロジックを変更します。
    - `timePoints`配列から現在の時刻のインデックス (`timeIndex`) を特定します。
    - `feature.properties.valueByDateTime[timeIndex]` を使ってWBGT値を取得するように修正します。

4.  **テストコードの修正 (`src/lib/fetch-wbgt-data.test.ts`)**
    - テスト用のモックデータを新しいデータ構造に合わせて更新します。

5.  **検証**
    - `npm run typecheck` を実行し、型エラーがないことを確認します。
    - `npm run lint` を実行し、コードスタイル違反がないことを確認します。
    - ブラウザで動作確認を行い、ヒートマップの表示とタイムスライダーの連動が正しく機能することを確認します。
