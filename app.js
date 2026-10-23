const CESIUM_ION_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImZJbnpNc2hIaDFhS3YzSlAiLCJqdGkiOiI2MWQxZDNlZC0xNzY1LTRmYzctYmY2Zi05YjZlYmI2YjI2ZGUiLCJpZCI6ODM3NDEsInN1YiI6Imh3dG52MjAyMiIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiJBcmNoaXZlcyBTZXJpZXMiLCJpYXQiOjE3OTI3NDA3MDd9._022zY-PytdQeN3CyEHm1enSIN3j59s-_u9FVGmYiE8";

const BATHYMETRY_ASSET_ID = 2426648;
const minHeight = -250.0;
const maxHeight = 480.0;
const contourLineSpacing = 20.0;
const initialExaggeration = 10.0;
const cropRectangle = Cesium.Rectangle.fromDegrees(
  45.2507544701355,
  16.57902010817656,
  69.28237866196051,
  33.61096284000259,
);
const defaultLookAtTarget = Cesium.Cartesian3.fromDegrees(56.318238, 26.630442, 0.0);
const loadingFallbackDelayMs = 400;
const loadingOverlayDismissDelayMs = 180;
const tileQueueNormalizationCount = 24;

const presets = {
  hormuz: {
    destination: Cesium.Cartesian3.fromDegrees(56.499208, 25.70103, 92728.55),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-40.94443),
      roll: Cesium.Math.toRadians(359.58587),
    },
  },
};

const statusMessage = document.getElementById("statusMessage");
const exaggerationSlider = document.getElementById("exaggerationSlider");
const exaggerationValue = document.getElementById("exaggerationValue");
const cameraReadout = document.getElementById("cameraReadout");
const navButtons = document.querySelectorAll("[data-nav]");
const zoomSlider = document.getElementById("zoomSlider");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingBarFill = document.getElementById("loadingBarFill");
const loadingLabel = document.getElementById("loadingLabel");
const legendRamp = document.getElementById("legendRamp");
const legendSeaLevel = document.getElementById("legendSeaLevel");
const legendMarkers = document.querySelectorAll(".legend-marker");
const legendMinDepth = minHeight;
const legendMaxDepth = 0.0;
const targetFrameRate = 60;

Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
updateAppHeight();

// Shared UI helper for transient status text.
function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function normalizeHeight(height) {
  return (height - minHeight) / (maxHeight - minHeight);
}

function normalizeLegendDepth(depth) {
  return (depth - legendMinDepth) / (legendMaxDepth - legendMinDepth);
}

const bathymetrySteps = [
  { height: maxHeight, color: "#cf7650" },
  { height: 410.0, color: "#d58356" },
  { height: 330.0, color: "#dc945e" },
  { height: 250.0, color: "#e5aa6c" },
  { height: 180.0, color: "#ecbf7d" },
  { height: 118.0, color: "#f3d293" },
  { height: 70.0, color: "#f8dfaa" },
  { height: 28.0, color: "#fcedd0" },
  { height: 12.0, color: "#fff2d8" },
  { height: 6.0, color: "#fff5e2" },
  { height: 2.0, color: "#fff9ee" },
  { height: 0.0, color: "#fffaf1" },
  { height: -2.0, color: "#f7f7e2" },
  { height: -6.0, color: "#e8f1c5" },
  { height: -10.0, color: "#d7ef9f" },
  { height: -25.0, color: "#9fdf95" },
  { height: -40.0, color: "#63c7a3" },
  { height: -60.0, color: "#32b6b0" },
  { height: -90.0, color: "#1f9ac0" },
  { height: -130.0, color: "#2a78b8" },
  { height: -180.0, color: "#31539b" },
  { height: minHeight, color: "#2d356c" },
];

const legendSteps = bathymetrySteps.filter((step) => step.height <= 0.0);

function fillSmoothRamp(context, width, height, steps, normalizer, isVertical = false) {
  const gradient = isVertical
    ? context.createLinearGradient(0, height, 0, 0)
    : context.createLinearGradient(0, 0, width, 0);

  for (const step of steps) {
    gradient.addColorStop(normalizer(step.height), step.color);
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function buildColorRamp() {
  const ramp = document.createElement("canvas");
  ramp.width = 256;
  ramp.height = 16;

  const context = ramp.getContext("2d");
  fillSmoothRamp(context, ramp.width, ramp.height, bathymetrySteps, normalizeHeight, false);

  return ramp;
}

function buildLegendRamp() {
  const ramp = document.createElement("canvas");
  ramp.width = 18;
  ramp.height = 180;

  const context = ramp.getContext("2d");
  fillSmoothRamp(context, ramp.width, ramp.height, legendSteps, normalizeLegendDepth, true);

  return ramp;
}

const colorRampImage = buildColorRamp();
const legendRampImage = buildLegendRamp();
const legendRampDataUrl = legendRampImage.toDataURL("image/png");

function syncLegend() {
  legendRamp.style.backgroundImage = `url(${legendRampDataUrl})`;

  const rampHeight = legendRamp.clientHeight;
  const placeMarker = (depth) => `${(1 - normalizeLegendDepth(depth)) * rampHeight}px`;

  legendSeaLevel.style.top = placeMarker(0);

  for (const marker of legendMarkers) {
    marker.style.top = placeMarker(Number(marker.dataset.depth));
  }
}

syncLegend();
window.addEventListener("resize", syncLegend);

// Mobile in-app browsers often report a visual viewport shorter than 100vh.
function updateAppHeight() {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${viewportHeight}px`);
}

function installViewportSync(viewer) {
  let resizeFrameId = null;

  const sync = () => {
    updateAppHeight();
    syncLegend();
    viewer.resize();
    viewer.scene.requestRender();
  };

  const requestSync = () => {
    if (resizeFrameId !== null) {
      window.cancelAnimationFrame(resizeFrameId);
    }

    resizeFrameId = window.requestAnimationFrame(() => {
      resizeFrameId = null;
      sync();
    });
  };

  requestSync();
  window.addEventListener("resize", requestSync);
  window.visualViewport?.addEventListener("resize", requestSync);
  window.visualViewport?.addEventListener("scroll", requestSync);
}

// Combine elevation ramp shading with contour lines on the globe surface.
function buildBathymetryMaterial(viewer) {
  const material = new Cesium.Material({
    fabric: {
      type: "ElevationColorContour",
      materials: {
        contourMaterial: {
          type: "ElevationContour",
        },
        elevationRampMaterial: {
          type: "ElevationRamp",
        },
      },
      components: {
        diffuse:
          "(1.0 - contourMaterial.alpha) * elevationRampMaterial.diffuse + contourMaterial.alpha * contourMaterial.diffuse",
        alpha: "max(contourMaterial.alpha, elevationRampMaterial.alpha)",
      },
    },
    translucent: false,
  });

  return material;
}

function updateBathymetryMaterial(material, viewer) {
  let uniforms = material.materials.elevationRampMaterial.uniforms;
  uniforms.image = colorRampImage;
  uniforms.minimumHeight = minHeight * viewer.scene.verticalExaggeration;
  uniforms.maximumHeight = maxHeight * viewer.scene.verticalExaggeration;

  uniforms = material.materials.contourMaterial.uniforms;
  uniforms.width = 1.0;
  uniforms.spacing = contourLineSpacing * viewer.scene.verticalExaggeration;
  uniforms.color = Cesium.Color.fromCssColorString("#23303d").withAlpha(0.42);
}

function formatNumber(value) {
  return value.toFixed(6);
}

function updateLoadingProgress(progress, label) {
  loadingBarFill.style.width = `${Math.max(8, Math.min(100, progress))}%`;
  if (label) {
    loadingLabel.textContent = label;
  }
}

function hideLoadingOverlay() {
  loadingOverlay.classList.add("is-hidden");
}

function updateCameraReadout(viewer) {
  const cartographic = Cesium.Cartographic.fromCartesian(viewer.camera.positionWC);
  const longitude = Cesium.Math.toDegrees(cartographic.longitude);
  const latitude = Cesium.Math.toDegrees(cartographic.latitude);
  const height = cartographic.height;
  const heading = Cesium.Math.toDegrees(viewer.camera.heading);
  const pitch = Cesium.Math.toDegrees(viewer.camera.pitch);
  const roll = Cesium.Math.toDegrees(viewer.camera.roll);

  cameraReadout.textContent =
    `lon: ${formatNumber(longitude)}\n` +
    `lat: ${formatNumber(latitude)}\n` +
    `height: ${height.toFixed(2)}\n` +
    `heading: ${formatNumber(heading)}\n` +
    `pitch: ${formatNumber(pitch)}\n` +
    `roll: ${formatNumber(roll)}`;
}

// Terrain exaggeration affects both geometry and the contour spacing.
function applyExaggeration(viewer, value, showingSatellite, bathymetryMaterial) {
  viewer.scene.verticalExaggeration = value;
  exaggerationValue.textContent = String(value);

  if (!showingSatellite) {
    updateBathymetryMaterial(bathymetryMaterial, viewer);
  }
}

function flyToPreset(viewer, presetKey) {
  const preset = presets[presetKey];
  if (!preset) {
    return;
  }

  viewer.camera.flyTo({
    destination: preset.destination,
    orientation: preset.orientation,
    duration: 1.8,
  });
}

function setPresetView(viewer, presetKey) {
  const preset = presets[presetKey];
  if (!preset) {
    return;
  }

  viewer.camera.setView({
    destination: preset.destination,
    orientation: preset.orientation,
  });
}

function getCurrentLookAtTarget(viewer) {
  const scene = viewer.scene;
  const canvas = scene.canvas;
  const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
  const ray = viewer.camera.getPickRay(center);
  return scene.globe.pick(ray, scene) ?? defaultLookAtTarget;
}

// Depth probe uses terrain sampling instead of rendered height so labels stay accurate
// even when vertical exaggeration is increased.
function installDepthProbe(viewer) {
  const probeEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(56.318238, 26.630442, 0.0),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString("#a8ecff").withAlpha(0.96),
      outlineColor: Cesium.Color.fromCssColorString("#0d2332").withAlpha(0.95),
      outlineWidth: 3,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: "",
      font: '700 13px "Space Grotesk", "Noto Sans JP", sans-serif',
      fillColor: Cesium.Color.fromCssColorString("#dff8ff"),
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString("#0b2030").withAlpha(0.88),
      pixelOffset: new Cesium.Cartesian2(0, -28),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineColor: Cesium.Color.fromCssColorString("#07131c").withAlpha(0.9),
      outlineWidth: 2,
      eyeOffset: new Cesium.Cartesian3(0, 0, -10),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    show: false,
  });

  viewer.screenSpaceEventHandler.setInputAction(async (event) => {
    const picked = viewer.scene.pick(event.position);
    if (Cesium.defined(picked) && picked.id === probeEntity) {
      probeEntity.show = false;
      viewer.selectedEntity = undefined;
      viewer.trackedEntity = undefined;
      setStatus("");
      viewer.scene.requestRender();
      return;
    }

    const ray = viewer.camera.getPickRay(event.position);
    if (!ray) {
      return;
    }

    const position = viewer.scene.globe.pick(ray, viewer.scene);
    if (!position) {
      return;
    }

    const cartographic = Cesium.Cartographic.fromCartesian(position);
    const [sampled] = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [
      new Cesium.Cartographic(cartographic.longitude, cartographic.latitude),
    ]);
    const sampledHeight = sampled?.height;

    if (!Number.isFinite(sampledHeight)) {
      setStatus("The depth probe could not read terrain height at this point.", true);
      return;
    }

    if (sampledHeight >= 0) {
      probeEntity.show = false;
      setStatus("");
      viewer.scene.requestRender();
      return;
    }

    setStatus("");

    const headline = `- ${Math.abs(sampledHeight).toFixed(1)} m`;

    probeEntity.position = position;
    probeEntity.label.text = headline;
    probeEntity.show = true;
    viewer.selectedEntity = undefined;
    viewer.trackedEntity = undefined;
    viewer.scene.requestRender();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// Auto-rotation orbits around the current look-at target so it works from any user-picked view.
function createAutoRotateController(viewer) {
  const scratchCurrentOffset = new Cesium.Cartesian3();
  let isRotating = false;
  let rotateCenter = defaultLookAtTarget;
  let radius = 140000.0;
  let heading = Cesium.Math.toRadians(14.428275);
  let pitch = Cesium.Math.toRadians(-52.54815);
  let animationFrameId = null;
  let lastTimestamp = null;
  const radiansPerSecond = Cesium.Math.toRadians(9.0);

  function syncFromCamera() {
    rotateCenter = getCurrentLookAtTarget(viewer);
    const offset = Cesium.Cartesian3.subtract(
      viewer.camera.positionWC,
      rotateCenter,
      scratchCurrentOffset,
    );
    radius = Cesium.Cartesian3.magnitude(offset);
    heading = viewer.camera.heading;
    pitch = viewer.camera.pitch;
  }

  function step(timestamp) {
    if (!isRotating) {
      animationFrameId = null;
      lastTimestamp = null;
      return;
    }

    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
    }

    const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;
    heading += radiansPerSecond * deltaSeconds;
    const range = Math.max(radius, 1000.0);

    viewer.camera.lookAt(rotateCenter, new Cesium.HeadingPitchRange(heading, pitch, range));
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    viewer.scene.requestRender();
    animationFrameId = window.requestAnimationFrame(step);
  }

  return {
    toggle() {
      syncFromCamera();
      isRotating = !isRotating;
      if (isRotating && animationFrameId === null) {
        animationFrameId = window.requestAnimationFrame(step);
      }
      viewer.scene.requestRender();
    },
    stop() {
      if (!isRotating) {
        return;
      }
      isRotating = false;
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      lastTimestamp = null;
      viewer.scene.requestRender();
    },
    isActive() {
      return isRotating;
    },
  };
}

// The zoom control is inverted intentionally so the top of the slider means zoom in.
function installNavigator(viewer, autoRotateController) {
  const zoomAmount = 12000.0;
  const minZoomHeight = 20000.0;
  const maxZoomHeight = 180000.0;

  function syncZoomSlider() {
    const height = viewer.camera.positionCartographic.height;
    const clamped = Cesium.Math.clamp(height, minZoomHeight, maxZoomHeight);
    zoomSlider.value = String(maxZoomHeight - clamped + minZoomHeight);
  }

  function act(action) {
    switch (action) {
      case "home":
        autoRotateController.stop();
        flyToPreset(viewer, "hormuz");
        break;
      case "toggleRotate":
        autoRotateController.toggle();
        return;
      case "zoomIn":
        viewer.camera.zoomIn(zoomAmount);
        syncZoomSlider();
        break;
      case "zoomOut":
        viewer.camera.zoomOut(zoomAmount);
        syncZoomSlider();
        break;
      default:
        return;
    }

    viewer.scene.requestRender();
  }

  for (const button of navButtons) {
    button.addEventListener("click", () => {
      act(button.dataset.nav);
    });
  }

  zoomSlider.addEventListener("input", () => {
    const targetHeight = maxZoomHeight - Number(zoomSlider.value) + minZoomHeight;
    const currentHeight = viewer.camera.positionCartographic.height;
    const delta = targetHeight - currentHeight;
    if (delta > 0) {
      viewer.camera.zoomOut(delta);
    } else {
      viewer.camera.zoomIn(-delta);
    }
    viewer.scene.requestRender();
  });

  viewer.camera.changed.addEventListener(() => {
    syncZoomSlider();
  });

  syncZoomSlider();
}

function applySceneAppearance(viewer, bathymetryMaterial, bathymetryBaseColor) {
  viewer.scene.backgroundColor = Cesium.Color.BLACK;
  viewer.scene.fog.enabled = true;
  viewer.scene.fog.density = 0.00028;
  viewer.scene.fog.minimumBrightness = 0.2;
  viewer.scene.skyAtmosphere.show = false;
  viewer.scene.skyBox.show = false;
  viewer.scene.sun.show = false;
  viewer.scene.moon.show = false;
  viewer.scene.globe.showGroundAtmosphere = false;
  viewer.scene.globe.enableLighting = false;
  viewer.scene.globe.maximumScreenSpaceError = 0.45;
  viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
  viewer.scene.globe.baseColor = bathymetryBaseColor;
  viewer.scene.globe.material = bathymetryMaterial;
  viewer.scene.globe.cartographicLimitRectangle = cropRectangle;
  viewer.targetFrameRate = targetFrameRate;
  viewer.useBrowserRecommendedResolution = true;
  viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1);
}

async function createViewer() {
  try {
    updateLoadingProgress(10, "Initializing terrain...");
    const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(BATHYMETRY_ASSET_ID);
    updateLoadingProgress(28, "Creating viewer...");

    const viewer = new Cesium.Viewer("cesiumContainer", {
      terrainProvider,
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
    });

    const bathymetryBaseColor = Cesium.Color.fromCssColorString("#102532");
    const bathymetryMaterial = buildBathymetryMaterial(viewer);
    setPresetView(viewer, "hormuz");
    applySceneAppearance(viewer, bathymetryMaterial, bathymetryBaseColor);
    updateLoadingProgress(34, "Applying crop extent...");

    let sawPendingTiles = false;
    viewer.scene.globe.tileLoadProgressEvent.addEventListener((queuedTileCount) => {
      if (queuedTileCount > 0) {
        sawPendingTiles = true;
        const normalized = Math.max(
          0,
          1 - Math.min(queuedTileCount, tileQueueNormalizationCount) / tileQueueNormalizationCount,
        );
        updateLoadingProgress(30 + normalized * 60, `Loading terrain tiles... ${queuedTileCount}`);
      } else if (sawPendingTiles) {
        updateLoadingProgress(100, "Ready");
        window.setTimeout(() => {
          hideLoadingOverlay();
        }, loadingOverlayDismissDelayMs);
      }
    });

    exaggerationSlider.value = String(initialExaggeration);
    applyExaggeration(viewer, initialExaggeration, false, bathymetryMaterial);
    exaggerationSlider.addEventListener("input", () => {
      applyExaggeration(viewer, Number(exaggerationSlider.value), false, bathymetryMaterial);
      viewer.scene.requestRender();
    });

    viewer.camera.changed.addEventListener(() => {
      updateCameraReadout(viewer);
    });

    installViewportSync(viewer);
    installDepthProbe(viewer);

    const autoRotateController = createAutoRotateController(viewer);
    installNavigator(viewer, autoRotateController);

    const stopRotationOnUserInput = () => {
      autoRotateController.stop();
    };
    viewer.scene.canvas.addEventListener("pointerdown", stopRotationOnUserInput);
    viewer.scene.canvas.addEventListener("wheel", stopRotationOnUserInput, { passive: true });

    updateCameraReadout(viewer);
    viewer.scene.requestRender();

    window.setTimeout(() => {
      if (!sawPendingTiles) {
        updateLoadingProgress(100, "Ready");
        hideLoadingOverlay();
      }
    }, loadingFallbackDelayMs);

    return viewer;
  } catch (error) {
    console.error(error);
    setStatus("Failed to initialize bathymetry. Check the Cesium load and token settings.", true);
    throw error;
  }
}

void createViewer();
