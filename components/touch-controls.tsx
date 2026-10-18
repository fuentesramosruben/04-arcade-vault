"use client";
import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import {
  TOUCH_LAYOUTS,
  dispatchKey,
  type TouchButton,
} from "@/lib/games/touch-controls";
interface TouchControlsProps {
  gameId: string;
  active: boolean; // falso con pausa o game over: se sueltan todas las teclas
}
export function TouchControls({ gameId, active }: TouchControlsProps) {
  const layout = TOUCH_LAYOUTS[gameId];
  // pointerId -> botón que sostiene; un botón está pulsado mientras tenga algún puntero
  const pointersRef = useRef(new Map<number, TouchButton>());
  const holdersOf = useCallback(
    (button: TouchButton) =>
      [...pointersRef.current.values()].filter((b) => b.code === button.code)
        .length,
    [],
  );
  const releasePointer = useCallback(
    (pointerId: number) => {
      const button = pointersRef.current.get(pointerId);
      if (!button) return;
      pointersRef.current.delete(pointerId);
      if (holdersOf(button) === 0) dispatchKey("keyup", button);
    },
    [holdersOf],
  );
  const releaseAll = useCallback(() => {
    const held = new Map<string, TouchButton>();
    for (const button of pointersRef.current.values())
      held.set(button.code, button);
    pointersRef.current.clear();
    for (const button of held.values()) dispatchKey("keyup", button);
  }, []);
  useEffect(() => {
    if (!active) releaseAll();
  }, [active, releaseAll]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) releaseAll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      releaseAll();
    };
  }, [releaseAll]);
  if (!layout) return null;
  function onPointerDown(
    e: PointerEvent<HTMLButtonElement>,
    button: TouchButton,
  ) {
    if (!active) return;
    // sin foco ni click: el Space del motor no debe activar el botón
    e.preventDefault();
    e.currentTarget.blur();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointersRef.current.has(e.pointerId)) return;
    const first = holdersOf(button) === 0;
    pointersRef.current.set(e.pointerId, button);
    if (first) dispatchKey("keydown", button);
  }
  function onPointerLeave(e: PointerEvent<HTMLButtonElement>) {
    // con el puntero capturado el dedo puede salir del botón sin soltarlo
    if (!e.currentTarget.hasPointerCapture(e.pointerId))
      releasePointer(e.pointerId);
  }
  return (
    <div
      className="touch-controls"
      data-game={gameId}
      data-active={active}
      onContextMenu={(e) => e.preventDefault()}
    >
      {layout.buttons.map((button) => (
        <button
          key={button.code}
          type="button"
          tabIndex={-1}
          className="touch-btn"
          data-area={button.area}
          aria-label={button.ariaLabel}
          onPointerDown={(e) => onPointerDown(e, button)}
          onPointerUp={(e) => releasePointer(e.pointerId)}
          onPointerCancel={(e) => releasePointer(e.pointerId)}
          onLostPointerCapture={(e) => releasePointer(e.pointerId)}
          onPointerLeave={onPointerLeave}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
