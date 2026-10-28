import assert from "node:assert/strict";
import test from "node:test";
import { watchTerrainLoading } from "../terrain-loading.js";

function createEvent() {
  const listeners = new Set();

  return {
    addEventListener(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    raiseEvent(...args) {
      for (const listener of [...listeners]) {
        listener(...args);
      }
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

function createClock(t) {
  let now = 0;
  let nextId = 0;
  const timers = new Map();

  t.mock.method(globalThis, "setTimeout", (callback, delay = 0, ...args) => {
    const id = ++nextId;
    timers.set(id, { at: now + Math.max(0, delay), callback, args });
    return id;
  });
  t.mock.method(globalThis, "clearTimeout", (id) => timers.delete(id));

  return {
    advance(milliseconds) {
      const target = now + milliseconds;

      for (let callbacks = 0; ; callbacks += 1) {
        assert.ok(callbacks < 10000, "the virtual clock must not loop indefinitely");
        const next = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort(([aId, a], [bId, b]) => a.at - b.at || aId - bId)[0];

        if (!next) {
          break;
        }

        const [id, timer] = next;
        timers.delete(id);
        now = timer.at;
        timer.callback(...timer.args);
      }

      now = target;
    },
    get pendingCount() {
      return timers.size;
    },
  };
}

function createHarness(t, options = {}) {
  const clock = createClock(t);
  const changes = [];
  const calls = [];
  let visible = false;
  const scene = {
    globe: {
      tilesLoaded: false,
      tileLoadProgressEvent: createEvent(),
    },
    postRender: createEvent(),
    requestRender() {
      calls.push("requestRender");
    },
  };

  const dispose = watchTerrainLoading({
    scene,
    hasVisibleTerrain: () => visible,
    onChange(state) {
      changes.push({ ...state });
      calls.push(state.phase);
      options.onChange?.(state, scene);
    },
    ...options.timing,
  });
  t.after(dispose);

  return {
    clock,
    scene,
    changes,
    calls,
    dispose,
    render({ terrainVisible = visible, tilesLoaded = scene.globe.tilesLoaded } = {}) {
      visible = terrainVisible;
      scene.globe.tilesLoaded = tilesLoaded;
      scene.postRender.raiseEvent(scene);
    },
    queue(count) {
      scene.globe.tileLoadProgressEvent.raiseEvent(count);
    },
    get latest() {
      return changes.at(-1);
    },
    get requestedRenders() {
      return calls.filter((call) => call === "requestRender").length;
    },
  };
}

function phases(changes) {
  return changes
    .map(({ phase }) => phase)
    .filter((phase, index, all) => index === 0 || phase !== all[index - 1]);
}

test("visible terrain unlocks the view while the last tile remains pending", (t) => {
  const h = createHarness(t);
  assert.equal(h.latest.phase, "loading");

  h.queue(24);
  h.queue(1);
  h.render({ terrainVisible: true, tilesLoaded: false });

  assert.equal(h.latest.phase, "refining");
  assert.equal(h.latest.pendingTiles, 1);
  h.clock.advance(60000);

  assert.equal(h.latest.phase, "refining");
  assert.deepEqual(phases(h.changes), ["loading", "refining"]);
});

test("normal completion waits for the rendered view and a stable settling interval", (t) => {
  const h = createHarness(t);
  h.queue(24);
  h.render({ terrainVisible: true, tilesLoaded: false });
  h.queue(3);

  const beforeZero = h.requestedRenders;
  h.queue(0);
  assert.ok(h.requestedRenders > beforeZero, "an empty queue requests a fresh render");
  h.clock.advance(180);
  assert.equal(h.latest.phase, "refining", "a queue event alone is not a rendered view");

  h.render({ tilesLoaded: true });
  h.clock.advance(179);
  assert.equal(h.latest.phase, "refining");
  h.clock.advance(1);

  assert.deepEqual(phases(h.changes), ["loading", "refining", "ready"]);
  assert.equal(h.latest.pendingTiles, 0);
  assert.equal(h.scene.globe.tileLoadProgressEvent.listenerCount, 0);
  assert.equal(h.scene.postRender.listenerCount, 0);
  assert.equal(h.clock.pendingCount, 0);

  const completedChanges = h.changes.length;
  h.queue(10);
  h.render({ terrainVisible: false, tilesLoaded: false });
  h.clock.advance(60000);
  assert.equal(h.changes.length, completedChanges, "later camera views do not restart loading");
});

test("cached terrain can complete without any tile queue event", (t) => {
  const h = createHarness(t);
  h.render({ terrainVisible: true, tilesLoaded: true });

  assert.equal(h.latest.phase, "refining");
  h.clock.advance(500);
  assert.equal(h.latest.phase, "refining", "the preview frame cannot certify final detail");

  h.render({ tilesLoaded: true });
  h.clock.advance(180);
  assert.equal(h.latest.phase, "ready");
});

test("the app can restore detail before the refining phase requests another frame", (t) => {
  const h = createHarness(t, {
    onChange(state, scene) {
      if (state.phase === "refining") {
        scene.globe.tilesLoaded = false;
      }
    },
  });
  h.calls.length = 0;
  h.render({ terrainVisible: true, tilesLoaded: true });

  const refiningIndex = h.calls.indexOf("refining");
  assert.ok(refiningIndex >= 0);
  assert.ok(h.calls.slice(refiningIndex + 1).includes("requestRender"));
  h.clock.advance(180);
  assert.equal(h.latest.phase, "refining");

  h.render({ tilesLoaded: false });
  h.clock.advance(180);
  assert.equal(h.latest.phase, "refining", "restored detail must finish before ready");

  h.render({ tilesLoaded: true });
  h.clock.advance(180);
  assert.equal(h.latest.phase, "ready");
});

test("an empty queue cannot mark a view ready before terrain is visible", (t) => {
  const h = createHarness(t);
  h.scene.globe.tilesLoaded = true;
  const beforeZero = h.requestedRenders;
  h.queue(0);

  assert.ok(h.requestedRenders > beforeZero);
  h.clock.advance(400);
  h.render({ terrainVisible: false, tilesLoaded: true });
  h.clock.advance(180);

  assert.equal(h.latest.phase, "loading");
  assert.equal(h.changes.some(({ phase }) => phase === "ready"), false);
});

test("new pending tiles cancel readiness until a later view settles", (t) => {
  const h = createHarness(t);
  h.queue(24);
  h.render({ terrainVisible: true, tilesLoaded: false });
  h.queue(0);
  h.render({ tilesLoaded: true });
  h.clock.advance(90);

  h.scene.globe.tilesLoaded = false;
  h.queue(4);
  h.clock.advance(180);
  assert.equal(h.latest.phase, "refining");
  assert.equal(h.latest.pendingTiles, 4);
  assert.equal(h.changes.some(({ phase }) => phase === "ready"), false);

  h.queue(0);
  h.render({ tilesLoaded: true });
  h.clock.advance(179);
  assert.equal(h.latest.phase, "refining");
  h.clock.advance(1);
  assert.equal(h.latest.phase, "ready");
});

test("a view with no visible terrain becomes slow, then recovers without a false ready", (t) => {
  const h = createHarness(t);
  h.clock.advance(7999);
  assert.equal(h.latest.phase, "loading");
  h.clock.advance(1);

  assert.equal(h.latest.phase, "slow");
  assert.equal(h.changes.some(({ phase }) => phase === "ready"), false);
  h.clock.advance(30000);
  assert.equal(h.latest.phase, "slow");

  h.queue(1);
  h.render({ terrainVisible: true, tilesLoaded: false });
  assert.equal(h.latest.phase, "refining");
  h.queue(0);
  h.render({ tilesLoaded: true });
  h.clock.advance(180);

  assert.deepEqual(phases(h.changes), ["loading", "slow", "refining", "ready"]);
});

test("dispose detaches events and prevents the loading deadline from changing state", (t) => {
  const h = createHarness(t);
  h.queue(1);
  const beforeDispose = h.changes.length;

  h.dispose();
  h.dispose();
  assert.equal(h.scene.globe.tileLoadProgressEvent.listenerCount, 0);
  assert.equal(h.scene.postRender.listenerCount, 0);
  assert.equal(h.clock.pendingCount, 0);

  h.queue(0);
  h.render({ terrainVisible: true, tilesLoaded: true });
  h.clock.advance(60000);
  assert.equal(h.changes.length, beforeDispose);
});

test("dispose cancels a pending ready transition", (t) => {
  const h = createHarness(t);
  h.render({ terrainVisible: true, tilesLoaded: true });
  h.render({ tilesLoaded: true });
  h.clock.advance(90);
  const beforeDispose = h.changes.length;

  h.dispose();
  assert.equal(h.clock.pendingCount, 0);
  h.clock.advance(60000);

  assert.equal(h.changes.length, beforeDispose);
  assert.equal(h.latest.phase, "refining");
});
