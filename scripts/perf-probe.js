// Sonda de rendimiento (SPEC 11). Sin dependencias.
// Uso: abrir /juegos/<id>/jugar con `npm run build && npm run start`, y pasar esta
// función a browser_evaluate del MCP playwright (opts opcionales abajo).
// Devuelve { game, env, fps, frameP95Ms, frameMaxMs, longTasks, playerRenders, canvasRenders,
// cbMeanMs, cbP95Ms }. cb* = coste del callback de rAF del motor (JS por fotograma), que se ve
// aunque el refresco (144 Hz) tape la cadencia. El coste de estilo/capa/pintado sale de CDP
// Performance.getMetrics (TaskDuration, ScriptDuration, RecalcStyleDuration, LayoutDuration),
// que lee el ejecutor en el MCP antes y después de la sonda.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async (opts) => {
  const {
    game = location.pathname.split("/")[2],
    env = "desktop",
    seconds = 20,
    // códigos de tecla que se pulsan en rotación a 5 Hz (p. ej. ["Space"] para lanzar la bola)
    keys = [],
  } = opts || {};
  // Activa el contador de renders (lib/perf.ts) y lo pone a cero
  window.__AV_PERF__ = { renders: {} };
  let longTasks = 0;
  const observer = new PerformanceObserver((list) => {
    longTasks += list.getEntries().length;
  });
  try {
    observer.observe({ type: "longtask", buffered: false });
  } catch {
    longTasks = -1; // longtask no disponible
  }
  // Mide cuánto tarda cada callback de rAF del motor; la sonda usa el rAF original
  const nativeRaf = window.requestAnimationFrame;
  const rawRaf = nativeRaf.bind(window);
  const costs = [];
  window.requestAnimationFrame = (cb) =>
    rawRaf((t) => {
      const s = performance.now();
      cb(t);
      costs.push(performance.now() - s);
    });
  const deltas = [];
  let last = performance.now();
  const start = last;
  let keyTimer = 0;
  if (keys.length) {
    let i = 0;
    keyTimer = setInterval(() => {
      const code = keys[i++ % keys.length];
      window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code }));
    }, 200);
  }
  await new Promise((resolve) => {
    const tick = (now) => {
      deltas.push(now - last);
      last = now;
      if (now - start < seconds * 1000) rawRaf(tick);
      else resolve();
    };
    rawRaf(tick);
  });
  clearInterval(keyTimer);
  observer.disconnect();
  window.requestAnimationFrame = nativeRaf;
  // se descarta el primer delta (incluye el arranque de la sonda)
  const d = deltas.slice(1);
  const sorted = [...d].sort((a, b) => a - b);
  const total = d.reduce((a, b) => a + b, 0);
  const c = [...costs].sort((a, b) => a - b);
  const round = (n, k = 10) => Math.round(n * k) / k;
  const renders = window.__AV_PERF__.renders;
  delete window.__AV_PERF__;
  return {
    game,
    env,
    fps: round((d.length / total) * 1000),
    frameP95Ms: round(sorted[Math.floor(sorted.length * 0.95)]),
    frameMaxMs: round(sorted[sorted.length - 1]),
    longTasks,
    playerRenders: renders.GamePlayer ?? 0,
    canvasRenders: renders.GameCanvas ?? 0,
    cbMeanMs: round(c.reduce((a, b) => a + b, 0) / c.length, 100),
    cbP95Ms: round(c[Math.floor(c.length * 0.95)], 100),
  };
};
