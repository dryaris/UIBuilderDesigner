/**
 * Transformación de coordenadas.
 * screen = world * zoom + pan  (el div .world aplica translate(pan) scale(zoom)).
 *
 * AMBAS devuelven coordenadas RELATIVAS al elemento canvas (el div .world y
 * el SVG .gizmos comparten ese espacio: inset:0 dentro del canvas). Quien
 * necesite coords de viewport (comparar con clientX/clientY) suma
 * getBoundingClientRect() en el call site (ver hitHandle).
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
  _canvas: HTMLElement,
  wx: number,
  wy: number,
  vp: Viewport,
): Vec {
  return {
    x: wx * vp.zoom + vp.pan.x,
    y: wy * vp.zoom + vp.pan.y,
  };
}
