"use client";
import { useEffect } from "react";
// Contador de commits para medir re-renders (SPEC 11). Solo actúa si la sonda
// (scripts/perf-probe.js) ha puesto window.__AV_PERF__; sin la bandera no hace nada.
// No se usa <Profiler> porque en producción React no llama a onRender.
declare global {
  interface Window {
    __AV_PERF__?: { renders: Record<string, number> };
  }
}
export function usePerfRenders(id: string) {
  // sin deps: se ejecuta tras cada commit del componente
  useEffect(() => {
    const perf = window.__AV_PERF__;
    if (perf) perf.renders[id] = (perf.renders[id] ?? 0) + 1;
  });
}
