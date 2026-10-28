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

## Local Run

This project can be served as a static site. For example:

```bash
python3 -m http.server 24208 --bind 127.0.0.1
```

Then open `http://127.0.0.1:24208/`. The configured token permits local ports 24208 and 24209 on `127.0.0.1`.

## Publish Settings

- Intended public URL: `https://horumz.mapping.jp/`
- OGP image path: `https://horumz.mapping.jp/og-image.png`

## Cesium Token Notice

The embedded `Cesium ion` token is a dedicated public-client token with only `assets:read` access to Cesium World Bathymetry (asset 2426648). It is restricted to the production URL and the two local URLs above. For deployment to another domain, obtain a dedicated read-only token with the appropriate URL restrictions and replace it.

## Notes

- CesiumJS and bathymetry terrain are loaded over the network.
- `requestRenderMode` is enabled to reduce rendering load while idle.
- The visible globe region is limited with a crop rectangle defined in the application code.
- The elevation material supplies surface colors, so satellite imagery is not requested.
- Initial terrain uses a screen-space error of 2, then refines to 0.45 once visible. Remaining detail loads with a small, non-blocking indicator. After the viewer is created, the full-screen loading overlay blocks interaction for at most 8 seconds; a timeout does not mark terrain as fully loaded.

## Loading Regression Tests

Run `node --test tests/terrain-loading.test.mjs` (verified with Node.js 25.6.1). The tests cover stalled final tiles, cached terrain, completion races, and cleanup without depending on network timing or a Cesium token.
