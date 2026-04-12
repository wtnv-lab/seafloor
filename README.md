# Strait of Hormuz Seafloor Explorer

## Overview

This is a CesiumJS-based web viewer for exploring the seafloor topography of the Strait of Hormuz in 3D. It uses bathymetry terrain, a custom depth-focused color ramp, contour lines, and a constrained viewing extent to make underwater landforms easier to read.

## Features

- Starts directly from a predefined Strait of Hormuz camera view
- Visualizes seafloor depth and land elevation with a custom color ramp
- Overlays contour lines to improve terrain readability
- Includes a terrain exaggeration slider
- Includes home, auto-rotate, and zoom controls
- Supports click-based depth probing for underwater points
- Includes Open Graph and Twitter Card metadata for social sharing

## File Structure

- [index.html](/Users/wtnv/Repositories/seafloor/index.html): Main HTML file with metadata
- [app.js](/Users/wtnv/Repositories/seafloor/app.js): Cesium initialization, rendering logic, camera controls, and UI behavior
- [styles.css](/Users/wtnv/Repositories/seafloor/styles.css): Glass-style UI, mobile layout, and navigator styling
- [og-image.png](/Users/wtnv/Repositories/seafloor/og-image.png): Social sharing image
- [data/crop.kml](/Users/wtnv/Repositories/seafloor/data/crop.kml): Crop extent source used to define the visible region

## Local Run

This project can be served as a static site. For example:

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080`.

## Publish Settings

- Intended public URL: `https://horumuz.mapping.jp/`
- OGP image path: `https://horumz.mapping.jp/og-image.png`

## Cesium Token Notice

The current implementation includes an embedded `Cesium ion` access token, but that token is restricted by allowed URLs. Because of that, it may not work on other domains or in local environments. For production use or redistribution, the user or site operator should obtain their own `Cesium ion` token and replace it.

## Notes

- CesiumJS and bathymetry terrain are loaded over the network.
- `requestRenderMode` is enabled to reduce rendering load while idle.
- The visible globe region is limited with a crop rectangle derived from the project extent.
