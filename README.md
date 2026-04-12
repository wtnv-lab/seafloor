# Strait of Hormuz Seafloor Explorer / ホルムズ海峡 海底地形ビューア

## Overview / 概要

日本語:
CesiumJS を用いて、ホルムズ海峡の海底地形を立体的に分かりやすく表示する Web ビューアです。海底の深浅を色分けと等高線で可視化し、既定視点・ズーム・地形強調・オートローテーション操作を備えています。

English:
This is a CesiumJS-based web viewer that presents the seafloor topography of the Strait of Hormuz in an easy-to-read 3D form. It visualizes bathymetry with color ramps and contour lines, and includes a default camera view, zoom controls, terrain exaggeration, and auto-rotation.

## Features / 主な機能

- 日本語: ホルムズ海峡を初期視点から即時表示
  English: Starts directly from a predefined Strait of Hormuz camera view
- 日本語: 海底の深浅と陸上標高を色分け表示
  English: Displays seafloor depth and land elevation with a custom color ramp
- 日本語: 等高線・等深線のオーバーレイ表示
  English: Overlays contour lines for terrain readability
- 日本語: 地形強調スライダー
  English: Includes a terrain exaggeration slider
- 日本語: デフォルト視点復帰、オートローテーション、ズームUI
  English: Includes home, auto-rotate, and zoom controls
- 日本語: OGP / Twitter Card 向けメタタグ対応
  English: Includes Open Graph and Twitter Card metadata

## Files / ファイル構成

- [index.html](/Users/wtnv/Repositories/seafloor/index.html): 日本語・英語併記のメタタグを含むメインHTML
- [app.js](/Users/wtnv/Repositories/seafloor/app.js): Cesium 初期化、カメラ制御、UIロジック
- [styles.css](/Users/wtnv/Repositories/seafloor/styles.css): ガラス風UIとナビゲータのスタイル
- [og-image.png](/Users/wtnv/Repositories/seafloor/og-image.png): SNSシェア用画像

## Local Run / ローカル実行

日本語:
静的ファイルとして配信できます。たとえば以下のようにローカルサーバーを起動してください。

English:
This project can be served as a static site. For example, start a local server like this:

```bash
python3 -m http.server 8080
```

日本語:
その後、`http://127.0.0.1:8080` を開いてください。

English:
Then open `http://127.0.0.1:8080`.

## Publish Settings / 公開設定

- 日本語: 公開URLは `https://horumuz.mapping.jp/` を想定しています。
  English: The intended public URL is `https://horumuz.mapping.jp/`.
- 日本語: OGP 画像パスは `https://horumuz.mapping.jp/og-image.png` を参照します。
  English: The OGP image path is `https://horumuz.mapping.jp/og-image.png`.

## Cesium Token Notice / Cesium トークンに関する注意

日本語:
現在の実装には `Cesium ion` アクセストークンが埋め込まれていますが、このトークンには URL 制限が設定されています。そのため、別ドメインやローカル環境では利用できない場合があります。実運用や再配布を行う場合は、利用者または運用者が独自の `Cesium ion` トークンを取得し、差し替えてください。

English:
The current implementation contains an embedded `Cesium ion` access token, but that token is restricted by allowed URLs. Because of that, it may not work on other domains or in local environments. For production use or redistribution, the user or site operator should obtain their own `Cesium ion` token and replace it.

## Notes / 備考

- 日本語: Bathymetry タイルと CesiumJS 本体はネットワーク越しに読み込まれます。
  English: CesiumJS and bathymetry tiles are loaded over the network.
- 日本語: 描画負荷を抑えるため、`requestRenderMode` を有効化しています。
  English: `requestRenderMode` is enabled to reduce rendering load.
