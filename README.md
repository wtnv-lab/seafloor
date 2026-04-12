# Seafloor Explorer

CesiumJS を使って海底地形を表示するシンプルな Web アプリです。

## できること

- Cesium World Bathymetry を使った海底地形の 3D 表示
- Sandcastle bathymetry サンプル風の色分けと等深線表示
- 日本海溝、マリアナ海溝、沖縄トラフへの視点移動
- 固定済み `Cesium ion` トークンによる自動初期化

## 使い方

1. ローカルサーバーを起動します。
2. ブラウザで `index.html` を開きます。
3. ページ表示後、自動で海底地形を読み込みます。

例:

```bash
python3 -m http.server 8080
```

その後、ブラウザで `http://127.0.0.1:8080` を開いてください。

## 注意

- `Cesium ion` トークンは現在アプリ内に固定されています。
- CesiumJS 本体と bathymetry terrain はネットワーク越しに読み込まれます。
