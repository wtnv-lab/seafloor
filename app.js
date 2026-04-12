const CESIUM_ION_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MWQxZDNlZC0xNzY1LTRmYzctYmY2Zi05YjZlYmI2YjI2ZGUiLCJpZCI6ODM3NDEsImlhdCI6MTY4MzkzMjEzNn0.scryF4Q6q6deO3pjfPmCnZ9986voN5H89uXQqGCSPuo";

const BATHYMETRY_ASSET_ID = 2426648;
const minHeight = -250.0;
const maxHeight = 480.0;
const contourLineSpacing = 20.0;
const initialExaggeration = 10.0;

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

function buildColorRamp() {
  const ramp = document.createElement("canvas");
  ramp.width = 100;
  ramp.height = 15;

  const context = ramp.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 100, 0);

  gradient.addColorStop(normalizeHeight(maxHeight), "#cf7650");
  gradient.addColorStop(normalizeHeight(410.0), "#d58356");
  gradient.addColorStop(normalizeHeight(330.0), "#dc945e");
  gradient.addColorStop(normalizeHeight(250.0), "#e5aa6c");
  gradient.addColorStop(normalizeHeight(180.0), "#ecbf7d");
  gradient.addColorStop(normalizeHeight(118.0), "#f3d293");
  gradient.addColorStop(normalizeHeight(70.0), "#f8dfaa");
  gradient.addColorStop(normalizeHeight(28.0), "#fcedd0");
  gradient.addColorStop(normalizeHeight(12.0), "#fff2d8");
  gradient.addColorStop(normalizeHeight(6.0), "#fff5e2");
  gradient.addColorStop(normalizeHeight(2.0), "#fff9ee");
  gradient.addColorStop(normalizeHeight(0.0), "#fffaf1");
  gradient.addColorStop(normalizeHeight(-2.0), "#f7f7e2");
  gradient.addColorStop(normalizeHeight(-6.0), "#e8f1c5");
  gradient.addColorStop(normalizeHeight(-10.0), "#d7ef9f");
  gradient.addColorStop(normalizeHeight(-25.0), "#9fdf95");
  gradient.addColorStop(normalizeHeight(-40.0), "#63c7a3");
  gradient.addColorStop(normalizeHeight(-60.0), "#32b6b0");
  gradient.addColorStop(normalizeHeight(-90.0), "#1f9ac0");
  gradient.addColorStop(normalizeHeight(-130.0), "#2a78b8");
  gradient.addColorStop(normalizeHeight(-180.0), "#31539b");
  gradient.addColorStop(normalizeHeight(minHeight), "#2d356c");

  context.fillStyle = gradient;
  context.fillRect(0, 0, ramp.width, ramp.height);

  return ramp;
}

function buildLegendRamp() {
  const ramp = document.createElement("canvas");
  ramp.width = 18;
  ramp.height = 180;

  const context = ramp.getContext("2d");
  const gradient = context.createLinearGradient(0, ramp.height, 0, 0);

  gradient.addColorStop(normalizeLegendDepth(minHeight), "#2d356c");
  gradient.addColorStop(normalizeLegendDepth(-180.0), "#31539b");
  gradient.addColorStop(normalizeLegendDepth(-130.0), "#2a78b8");
  gradient.addColorStop(normalizeLegendDepth(-90.0), "#1f9ac0");
  gradient.addColorStop(normalizeLegendDepth(-60.0), "#32b6b0");
  gradient.addColorStop(normalizeLegendDepth(-40.0), "#63c7a3");
  gradient.addColorStop(normalizeLegendDepth(-25.0), "#9fdf95");
  gradient.addColorStop(normalizeLegendDepth(-10.0), "#d7ef9f");
  gradient.addColorStop(normalizeLegendDepth(-4.0), "#eef5c8");
  gradient.addColorStop(normalizeLegendDepth(-1.0), "#fffaf1");
  gradient.addColorStop(normalizeLegendDepth(0.0), "#fffaf1");

  context.fillStyle = gradient;
  context.fillRect(0, 0, ramp.width, ramp.height);

  return ramp;
}

const colorRampImage = buildColorRamp();
const legendRampImage = buildLegendRamp();

function syncLegend() {
  const rampDataUrl = legendRampImage.toDataURL("image/png");
  legendRamp.style.backgroundImage = `url(${rampDataUrl})`;

  const rampHeight = legendRamp.clientHeight;
  const placeMarker = (depth) => `${(1 - normalizeLegendDepth(depth)) * rampHeight}px`;

  legendSeaLevel.style.top = placeMarker(0);

  for (const marker of legendMarkers) {
    marker.style.top = placeMarker(Number(marker.dataset.depth));
  }
}

syncLegend();
window.addEventListener("resize", syncLegend);

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

function addAisTracks(viewer) {
  const trackStyle = {
    clampToGround: false,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.18,
      taperPower: 0.75,
      color: Cesium.Color.fromCssColorString("#ffd86b").withAlpha(0.95),
    }),
    width: 8,
  };

  const secondaryTrackStyle = {
    clampToGround: false,
    material: new Cesium.PolylineGlowMaterialProperty({
      glowPower: 0.14,
      taperPower: 0.65,
      color: Cesium.Color.fromCssColorString("#ff9f6b").withAlpha(0.82),
    }),
    width: 6,
  };

  const aisTracks = [
    {
      positions: [
        56.03, 25.76,
        56.14, 25.82,
        56.29, 25.89,
        56.47, 25.95,
        56.66, 26.0,
        56.9, 26.05,
      ],
      style: trackStyle,
    },
    {
      positions: [
        56.95, 25.78,
        56.77, 25.73,
        56.57, 25.69,
        56.36, 25.66,
        56.17, 25.64,
        55.99, 25.63,
      ],
      style: trackStyle,
    },
    {
      positions: [
        56.22, 25.72,
        56.31, 25.78,
        56.43, 25.84,
        56.54, 25.91,
        56.61, 26.0,
      ],
      style: secondaryTrackStyle,
    },
  ];

  for (const track of aisTracks) {
    viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(track.positions),
        ...track.style,
      },
    });
  }
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
  return scene.globe.pick(ray, scene) ?? Cesium.Cartesian3.fromDegrees(56.318238, 26.630442, 0.0);
}

function createAutoRotateController(viewer) {
  const scratchCurrentOffset = new Cesium.Cartesian3();
  let isRotating = false;
  let rotateCenter = Cesium.Cartesian3.fromDegrees(56.318238, 26.630442, 0.0);
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

async function createViewer() {
  try {
    updateLoadingProgress(10, "Initializing terrain...");
    const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(
      BATHYMETRY_ASSET_ID,
      {
        requestVertexNormals: true,
      },
    );
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

    viewer.scene.fog.enabled = false;
    viewer.scene.globe.showGroundAtmosphere = false;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.maximumScreenSpaceError = 0.45;
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    viewer.scene.globe.baseColor = bathymetryBaseColor;
    viewer.scene.globe.material = bathymetryMaterial;
    viewer.targetFrameRate = targetFrameRate;
    viewer.useBrowserRecommendedResolution = true;
    viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1);

    let sawPendingTiles = false;
    viewer.scene.globe.tileLoadProgressEvent.addEventListener((queuedTileCount) => {
      if (queuedTileCount > 0) {
        sawPendingTiles = true;
        const normalized = Math.max(0, 1 - Math.min(queuedTileCount, 24) / 24);
        updateLoadingProgress(30 + normalized * 60, `Loading terrain tiles... ${queuedTileCount}`);
      } else if (sawPendingTiles) {
        updateLoadingProgress(100, "Ready");
        window.setTimeout(() => {
          hideLoadingOverlay();
        }, 180);
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

    const autoRotateController = createAutoRotateController(viewer);
    installNavigator(viewer, autoRotateController);

    const stopRotationOnUserInput = () => {
      autoRotateController.stop();
    };
    viewer.scene.canvas.addEventListener("pointerdown", stopRotationOnUserInput);
    viewer.scene.canvas.addEventListener("wheel", stopRotationOnUserInput, { passive: true });

    setPresetView(viewer, "hormuz");
    updateCameraReadout(viewer);
    viewer.scene.requestRender();

    window.setTimeout(() => {
      if (!sawPendingTiles) {
        updateLoadingProgress(100, "Ready");
        hideLoadingOverlay();
      }
    }, 400);

    return viewer;
  } catch (error) {
    console.error(error);
    setStatus("Bathymetry の初期化に失敗しました。トークンまたは Cesium 読み込みを確認してください。", true);
    throw error;
  }
}

void createViewer();
