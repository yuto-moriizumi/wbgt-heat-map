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
- [x] 時刻はスライダーで調節できると望ましい
- [x] 毎時の WBGT が見られること
- [x] i18n
- [x] マーカークリック時のちらつきを抑える
- [x] 日最高の WBGT が見られること
  - [x] PageClientComponent に UT を追加
  - [x] 日付の順序を直す
- [x] 危険度別の色を東京暑さ MAP に揃える
- [x] 面白そうな Control を追加する
- [x] 日平均の WBGT が見られること
- [x] 天気が表示できること → かなり難しそうなのであきらめる
- [ ] 数日後、できれば一週間後までの予測が見れること
- [ ] SEO 対策とアクセス解析
  - [ ] TwitterOGP、シェアボタンなど

# 天気について

無料・少額で利用できる天気 API は https://weather.tsukumijima.net/ のみ。他に全世界対象の API などあるが精度低い。
気象庁のエリア区分 → https://www.jma.go.jp/bosai/common/const/area.json
奥多摩や東京西部とかでの取得はできない。東京地方のみ。
これはツクミジマが悪いのではなく、元にしている気象庁非公式 API が奥多摩とかを提供していないため。https://www.jma.go.jp/bosai/forecast/data/forecast/130014.json

https://zenn.dev/obaba/scraps/3a4102065174d2
