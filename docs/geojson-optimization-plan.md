# GeoJSONデータ構造最適化計画

## 1. 背景

現在の実装では、`fetchWbgtData` 関数（`src/lib/wbgt-data.ts`）がWBGTデータをGeoJSON形式に変換する際、各観測地点の時系列データ (`timeSeriesData`) に `wbgt` 値だけでなく、そこから派生する `riskLevel` と `riskColor` も含めている。

フロントエンドの `WbgtMapCore.tsx` コンポーネントは `feature state` を使用しているが、この事前計算された `riskColor` を状態として設定しているだけであり、`feature state` のパフォーマンス上の利点を最大限に活用できていない。

このアプローチには以下の問題点がある。

-   **データサイズの肥大化**: 冗長なデータ (`riskLevel`, `riskColor`) を含めることで、クライアントに送信されるGeoJSONのファイルサイズが不必要に大きくなっている。
-   **柔軟性の欠如**: リスクレベルの閾値や色分けのルールを変更する場合、データ生成ロジック (`wbgt-data.ts`) と表示ロジック (`WbgtMapCore.tsx` のポップアップ部分など) の両方を修正する必要があり、メンテナンス性が低い。
-   **非効率な `feature state` の利用**: `feature state` の真価は、少量のデータ（例: `wbgt` 値）を動的に更新し、スタイル側でその値を解釈して表示を切り替える点にある。現在の実装はその利点を活かせていない。

## 2. 目的

-   GeoJSONのデータサイズを削減し、アプリケーションのロードパフォーマンスを向上させる。
-   `feature state` とMapboxのスタイル `expression` を最大限に活用し、フロントエンドの描画パフォーマンスとコードの効率性を高める。
-   データ構造を正規化し、色分けやリスクレベルの定義を一元管理することで、メンテナンス性を向上させる。

## 3. リファクタリング計画

### Task 1: データ生成処理の最適化 (`src/lib/wbgt-data.ts`)

1.  **`TimeSeriesData` interface の変更**:
    -   `riskLevel` と `riskColor` プロパティを削除し、`wbgt` 値のみを保持するように定義を修正する。

    ```typescript
    // 変更前
    export interface TimeSeriesData {
      time: string;
      wbgt: number;
      riskLevel: string;
      riskColor: string;
    }

    // 変更後
    export interface TimeSeriesData {
      time: string;
      wbgt: number;
    }
    ```

2.  **`fetchWbgtData` 関数の修正**:
    -   `timeSeriesData` 配列を構築するループ内で `getRiskLevel` の呼び出しを削除し、`wbgt` 値のみを格納するようにロジックを簡略化する。

### Task 2: マップコンポーネントの最適化 (`src/components/WbgtMapCore.tsx`)

1.  **レイヤースタイルの変更**:
    -   `wbgtLayer` の `paint.circle-color` プロパティを、`["feature-state", "riskColor"]` を参照する現在の実装から、`["feature-state", "wbgt"]` を参照する `step` expression に変更する。
    -   `getRiskLevel` 関数（`wbgt-data.ts`）で定義されている閾値と色を `step` expression で再現する。

    ```typescript
    // 変更後の circle-color の例
    "circle-color": [
      "step",
      ["feature-state", "wbgt"],
      "#0000FF", // デフォルト (ほぼ安全)
      21, "#00FFFF", // 21以上 (注意)
      25, "#FFFF00", // 25以上 (警戒)
      28, "#FFA500", // 28以上 (厳重警戒)
      31, "#FF4500", // 31以上 (危険)
      33, "#FF0000", // 33以上 (極めて危険)
      35, "#800080"  // 35以上 (災害級の危険)
    ]
    ```

2.  **`feature state` 更新ロジックの修正**:
    -   `applyFeatureState` 関数内で `map.setFeatureState` を呼び出す際、`wbgt` と `time` のみを含むようにペイロードを修正する。`riskColor` と `riskLevel` の設定は不要になる。
    -   これに伴い、`timeSeriesLookup` の型定義も Task 1 で変更した `TimeSeriesData` interface に合わせる。

3.  **ポップアップ表示ロジックの維持**:
    -   `handleMapClick` 関数内で `getTranslatedRiskLevel` を呼び出して `wbgt` 値から動的にリスクレベルの文字列を生成している部分は、多言語対応のために引き続き有効であるため、現状を維持する。

### Task 3: 動作確認

1.  アプリケーションを起動し、地図が正常に表示されることを確認する。
2.  時間スライダーを操作した際に、各観測地点の色が `wbgt` 値に応じて正しく変化することを検証する。
3.  観測地点をクリックした際に表示されるポップアップの内容（WBGT値、リスクレベル、時刻）が正確であることを確認する。

以上の計画に基づき、コードの可読性、パフォーマンス、メンテナンス性の向上を目指す。
