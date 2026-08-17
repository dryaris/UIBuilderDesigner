/**
 * Transformación de coordenadas.
 * screen = world * zoom + pan  (el div .world aplica translate(pan) scale(zoom)).
 */
import type { Vec } from "../core/ir";
import type { Viewport } from "../state/store";

export function toWorld(
  canvas: HTMLElement,
  clientX: number,
  clientY: number,
  vp: Viewport,
): Vec {
  const r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left - vp.pan.x) / vp.zoom,
    y: (clientY - r.top - vp.pan.y) / vp.zoom,
  };
}

export function toScreen(
  canvas: HTMLElement,
  wx: number,
  wy: number,
  vp: Viewport,
): Vec {
  const r = canvas.getBoundingClientRect();
  return {
    x: r.left + wx * vp.zoom + vp.pan.x,
    y: r.top + wy * vp.zoom + vp.pan.y,
  };
}
