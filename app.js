const CESIUM_ION_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MWQxZDNlZC0xNzY1LTRmYzctYmY2Zi05YjZlYmI2YjI2ZGUiLCJpZCI6ODM3NDEsImlhdCI6MTY4MzkzMjEzNn0.scryF4Q6q6deO3pjfPmCnZ9986voN5H89uXQqGCSPuo";

const BATHYMETRY_ASSET_ID = 2426648;
const minHeight = -250.0;
const maxHeight = 120.0;
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

Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function normalizeHeight(height) {
  return (height - minHeight) / (maxHeight - minHeight);
}

function buildColorRamp() {
  const ramp = document.createElement("canvas");
  ramp.width = 100;
  ramp.height = 15;

  const context = ramp.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 100, 0);

  gradient.addColorStop(normalizeHeight(maxHeight), "#cd6a4a");
  gradient.addColorStop(normalizeHeight(110.0), "#dc8458");
  gradient.addColorStop(normalizeHeight(92.0), "#e9a26a");
  gradient.addColorStop(normalizeHeight(72.0), "#f0bf7d");
  gradient.addColorStop(normalizeHeight(50.0), "#f5d695");
  gradient.addColorStop(normalizeHeight(28.0), "#f9e5ad");
  gradient.addColorStop(normalizeHeight(12.0), "#fcf2cb");
  gradient.addColorStop(normalizeHeight(10.0), "#fff9da");
  gradient.addColorStop(normalizeHeight(0.0), "#f7f3b3");
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

  let uniforms = material.materials.elevationRampMaterial.uniforms;
  uniforms.image = buildColorRamp();
  uniforms.minimumHeight = minHeight * viewer.scene.verticalExaggeration;
  uniforms.maximumHeight = maxHeight * viewer.scene.verticalExaggeration;

  uniforms = material.materials.contourMaterial.uniforms;
  uniforms.width = 1.0;
  uniforms.spacing = contourLineSpacing * viewer.scene.verticalExaggeration;
  uniforms.color = Cesium.Color.fromCssColorString("#23303d").withAlpha(0.42);

  return material;
}

function formatNumber(value) {
  return value.toFixed(6);
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

function applyExaggeration(viewer, value, showingSatellite) {
  viewer.scene.verticalExaggeration = value;
  exaggerationValue.textContent = String(value);

  if (!showingSatellite) {
    viewer.scene.globe.material = buildBathymetryMaterial(viewer);
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
    const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(
      BATHYMETRY_ASSET_ID,
      {
        requestVertexNormals: true,
      },
    );

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

    viewer.scene.fog.enabled = false;
    viewer.scene.globe.showGroundAtmosphere = false;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.maximumScreenSpaceError = 0.25;
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
    viewer.scene.globe.baseColor = bathymetryBaseColor;

    exaggerationSlider.value = String(initialExaggeration);
    applyExaggeration(viewer, initialExaggeration, false);
    exaggerationSlider.addEventListener("input", () => {
      applyExaggeration(viewer, Number(exaggerationSlider.value), false);
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

    flyToPreset(viewer, "hormuz");
    updateCameraReadout(viewer);
    viewer.scene.requestRender();

    return viewer;
  } catch (error) {
    console.error(error);
    setStatus("Bathymetry の初期化に失敗しました。トークンまたは Cesium 読み込みを確認してください。", true);
    throw error;
  }
}

void createViewer();
