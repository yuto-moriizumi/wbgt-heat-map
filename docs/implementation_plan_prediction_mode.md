### 実装計画

1.  **予測データ取得機能の追加**
    *   `src/lib/csv-fetcher.ts` に、予測データをダウンロードするための新しい関数 `fetchPredictionCsv` を作成します。
    *   この関数は、指定されたURL (`https://www.wbgt.env.go.jp/prev15WG/dl/yohou_all.csv`) からCSVデータを取得します。

2.  **予測データ変換処理の実装**
    *   予測データのCSVは、実測値データと形式が異なります（時間データが横持ちになっています）。
    *   この特殊な形式を、アプリケーション全体で使われている縦持ちのデータ形式（`WbgtDataItem` 配列）に変換するための新しい関数 `parsePredictionCsv` を `src/lib/create-geo-json.ts` に作成します。
    *   このパーサーは、CSVのヘッダーから日時情報を読み取り、各地点のデータ行と組み合わせて、地点・日時・WBGT値のリストを生成します。

3.  **データ統合処理の更新**
    *   `src/lib/fetch-wbgt-data.ts` の `fetchWbgtData` 関数を修正します。
    *   既存の実測値データ取得に加え、`fetchPredictionCsv` を呼び出して予測データを取得します。
    *   取得した予測CSVを `parsePredictionCsv` を使して変換します。
    *   実測値データと変換後の予測値データを結合し、単一のデータセットとして返却するようにします。

4.  **UIの更新**
    *   `src/components/DisplayModeSelector.tsx` を修正し、表示モードに「予測 (最大値)」を追加します。これにより、ユーザーが予測データを地図上で確認できるようになります。
    *   予測モードが選択された際に、凡例やポップアップの表示が適切に更新されることを確認します。
