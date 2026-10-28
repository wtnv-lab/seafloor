// A rendered, usable view does not require every refinement/preload tile to finish.
export function watchTerrainLoading({
  scene,
  hasVisibleTerrain,
  onChange,
  settleDelayMs = 180,
  maxBlockingMs = 8000,
}) {
  let phase = "loading";
  let pendingTiles = null;
  let terrainVisible = false;
  let disposed = false;
  let completionTimer;

  const publish = () => onChange({ phase, pendingTiles });
  const cancelCompletion = () => {
    clearTimeout(completionTimer);
    completionTimer = undefined;
  };

  const blockingTimer = setTimeout(() => {
    phase = "slow";
    publish();
  }, maxBlockingMs);

  const removeProgressListener = scene.globe.tileLoadProgressEvent.addEventListener((count) => {
    pendingTiles = count;
    if (count > 0) {
      cancelCompletion();
    }
    publish();
    // Queue notifications run after a frame. Check completion on a fresh render.
    scene.requestRender();
  });

  const removeRenderListener = scene.postRender.addEventListener(() => {
    if (!terrainVisible) {
      if (hasVisibleTerrain()) {
        terrainVisible = true;
        clearTimeout(blockingTimer);
        phase = "refining";
        publish();
        // onChange may raise terrain detail; do not finish using the old frame.
        scene.requestRender();
      }
      return;
    }

    if (!scene.globe.tilesLoaded) {
      cancelCompletion();
      return;
    }
    if (completionTimer !== undefined) {
      return;
    }
    completionTimer = setTimeout(() => {
      completionTimer = undefined;
      if (!scene.globe.tilesLoaded) {
        return;
      }
      phase = "ready";
      pendingTiles = 0;
      dispose();
      publish();
    }, settleDelayMs);
  });

  function dispose() {
    if (disposed) {
      return;
    }
    disposed = true;
    clearTimeout(blockingTimer);
    cancelCompletion();
    removeProgressListener();
    removeRenderListener();
  }

  publish();
  return dispose;
}
