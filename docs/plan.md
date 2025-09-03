# 開発計画

基本的には、東京暑さ MAP (https://micos-sc.jwa.or.jp/tokyo-wbgt/) の全国版を作る。UI や表示方法が最も優れている。

まずは環境省のデータを利用する形で作成する
電子情報提供サービスの説明： https://www.wbgt.env.go.jp/data_service.php

# TODO

- [x] 極めて危険（33 以上）と色による表示に対応する
- [x] 災害級の危険（35 以上）と色による表示に対応する
- [x] それなりにズームできること
- [x] どの自治体か見て分かること
  - [x] 特に鉄道路線や地形の表示があると好ましい
- [ ] 数日後、できれば一週間後までの予測が見れること
- [ ] オーバーレイの濃さを調節できると好ましい
- [x] 時刻はスライダーで調節できると望ましい
  - [x] `wbgt-data.ts` を修正し、最新のデータだけでなく、予報を含む時系列データをすべて取得するようにする
  - [x] 取得した時系列データを GeoJSON の`properties`に格納する
  - [x] 時系列データを扱うための`TimeSlider`コンポーネントを`src/components`に作成する
    - スライダー (`<input type="range">`)
    - 再生・一時停止ボタン
    - 前後への移動ボタン
    - 現在時刻の表示
  - [x] `WbgtMap.tsx` に `TimeSlider` コンポーネントを統合する
  - [x] スライダーの操作に応じて、`map.setPaintProperty` を使用して表示する WBGT データを切り替える
  - [x] 更に再生機能があると望ましい
- [ ] 毎時・日最高・日平均が見られること
- [ ] 天気が表示できること
  - [ ] 暑さ指数が小さくても雨なら旅行行かないので
- [ ] SEO 対策とアクセス解析
  - [ ] TwitterOGP、シェアボタンなど
- [x] i18n

# Map Marker Rendering Optimization Plan (マーカー表示高速化計画)

## 1. Current Issue (現在の課題)

現在、時刻スライダーで時刻を変更すると、`<Source>`コンポーネントに渡される`currentGeoJSON`プロパティが更新される。これにより、MapLibre がデータソース全体を再評価し、すべてのマーカーが再描画される。この処理により、マーカーが数百ミリ秒間消えてから新しいデータで再表示される、目に見えるちらつきが発生している。

## 2. Proposed Solution (提案する解決策): `feature-state`の利用

ちらつきを排除し、パフォーマンスを向上させるため、MapLibre GL JS の`feature-state`機能を活用する。このアプローチにより、データソース全体を置き換えることなく、個々のフィーチャ（マーカー）の視覚的プロパティ（色や値など）を動的に更新できる。マーカーのジオメトリは静的なままで、状態に依存する属性のみが変更される。これは、このタイプのデータ可視化における推奨ベストプラクティスである。

## 3. Implementation Steps (実装ステップ)

### Step 3.1: Data Fetching Logic の修正 (`src/lib/wbgt-data.ts`)

- **目的:** 各 GeoJSON フィーチャがユニークなトップレベル`id`を持つようにする。`feature-state`メカニズムは、特定のフィーチャを対象とした状態更新のためにこの`id`を必要とする。
- **実装:** `fetchWbgtData`関数で、GeoJSON フィーチャを作成する際、ステーション ID（`station.id`）をフィーチャオブジェクトのトップレベル`id`プロパティにコピーする。

### Step 3.2: `WbgtMap.tsx`コンポーネントのリファクタリング

- **目的:** `feature-state`更新ロジックを実装し、非効率なデータソース置換方法を削除する。
- **実装内容:**
  1. **`geoJSONByTime`の削除:** 各時刻ステップの GeoJSON を事前計算する高コストな処理（`geoJSONByTime`の`useMemo`）は不要になるため削除する。
  2. **データ構造の準備:**
     - すべてのステーションポイントを含む静的な`FeatureCollection`を計算する`useMemo`フックを作成。これは`<Source>`コンポーネントに渡され、変更されない。
     - 時系列データへの効率的なアクセスのため、`wbgtData`プロパティからルックアップマップ（`Map<stationId, timeSeriesData[]>`）を構築する別の`useMemo`フックを作成。
  3. **状態更新のための`useEffect`実装:**
     - `currentTimeIndex`が変更されるたびにトリガーする`useEffect`フックを作成。
     - エフェクト内で、`mapRef.current`から現在のマップインスタンスを取得。
     - 全ステーションを反復処理。各ステーションについて、ルックアップマップから`currentTimeIndex`に対応する WBGT データを見つける。
     - `map.setFeatureState()`を使用して、各フィーチャの`riskColor`と`wbgt`値をユニークな`id`で参照して更新。
     - 特定の時刻のデータが欠落している場合の処理を確実に行う。
  4. **レイヤースタイルの更新:**
     - `wbgt-circles`レイヤーの`paint`プロパティを`feature-state`を使用するように修正。`circle-color`は状態から読み取る式によって決定される。状態が設定されていないフィーチャに対してはデフォルト/フォールバック色を提供。
     - 例:
       ```json
       "circle-color": [
         "case",
         ["has", "riskColor", ["feature-state"]],
         ["get", "riskColor", ["feature-state"]],
         "#cccccc"
       ]
       ```
  5. **ポップアップロジックの更新:**
     - `properties`には現在の値が含まれなくなるため、フィーチャの状態から WBGT 値を読み取るようにポップアップロジックを適応させる必要がある。クリックされたフィーチャの現在の WBGT 値を取得するため、`map.getFeatureState()`を使用。

## 4. Expected Outcome (期待される結果)

- 時刻変更時のマーカーのちらつきが完全に排除される。
- アプリケーションが大幅により応答性があり、滑らかに感じられるようになる。
- 複雑な`geoJSONByTime`計算が削除されるため、`WbgtMap.tsx`のコードがより清潔で効率的になる。
