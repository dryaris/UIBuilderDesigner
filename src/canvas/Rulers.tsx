/**
 * Rulers — reglas superior/izquierda con ticks que se adaptan al zoom,
 * marcadores de guías existentes y arrastre para crear guías nuevas.
 */
import type { PointerEvent as ReactPointerEvent } from "react";
import { useStore } from "../state/store";
import { toWorld } from "./transform";
import { canvasElement, beginGuideDrag } from "./pointer";

const STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000];

function rulerTicks(zoom: number, pan: number, length: number) {
  const step = STEPS.find((s) => s * zoom >= 60) ?? 5000;
  const minor = step / 5;
  const start = Math.floor(-pan / minor) * minor;
  const ticks: { v: number; major: boolean }[] = [];
  for (let v = start; v <= -pan + length + minor; v += minor) {
    const major = Math.abs(v % step) < 1e-6;
    ticks.push({ v, major });
  }
  return { step, ticks };
}

export function Rulers() {
  const showRulers = useStore((s) => s.showRulers);
  const vp = useStore((s) => s.viewport);
  const guides = useStore((s) => s.doc.root.guides);

  if (!showRulers) return null;

  const top = rulerTicks(vp.zoom, vp.pan.x, vp.size.x);
  const left = rulerTicks(vp.zoom, vp.pan.y, vp.size.y);

  const dragGuide = (axis: "v" | "h") => (e: ReactPointerEvent) => {
    const canvas = canvasElement.current;
    if (!canvas) return;
    const wp = toWorld(canvas, e.clientX, e.clientY, useStore.getState().viewport);
    beginGuideDrag(axis, axis === "v" ? wp.x : wp.y);
  };

  return (
    <div className="rulers">
      <div className="ruler-corner" />
      <svg
        className="ruler ruler-top"
        width={vp.size.x}
        height={24}
        onPointerDown={dragGuide("v")}
      >
        {top.ticks.map((t, i) =>
          t.major ? (
            <g key={i}>
              <line x1={t.v * vp.zoom + vp.pan.x} y1={0} x2={t.v * vp.zoom + vp.pan.x} y2={12} />
              <text x={t.v * vp.zoom + vp.pan.x + 4} y={10}>
                {Math.round(t.v)}
              </text>
            </g>
          ) : (
            <line key={i} x1={t.v * vp.zoom + vp.pan.x} y1={0} x2={t.v * vp.zoom + vp.pan.x} y2={6} className="ruler-minor" />
          ),
        )}
        {guides?.vertical.map((v) => (
          <rect key={`m${v}`} x={v * vp.zoom + vp.pan.x - 3} y={0} width={6} height={10} className="ruler-guide-marker" />
        ))}
      </svg>
      <svg
        className="ruler ruler-left"
        width={24}
        height={vp.size.y}
        onPointerDown={dragGuide("h")}
      >
        {left.ticks.map((t, i) =>
          t.major ? (
            <g key={i}>
              <line x1={0} y1={t.v * vp.zoom + vp.pan.y} x2={12} y2={t.v * vp.zoom + vp.pan.y} />
              <text x={4} y={t.v * vp.zoom + vp.pan.y - 4}>
                {Math.round(t.v)}
              </text>
            </g>
          ) : (
            <line key={i} x1={0} y1={t.v * vp.zoom + vp.pan.y} x2={6} y2={t.v * vp.zoom + vp.pan.y} className="ruler-minor" />
          ),
        )}
        {guides?.horizontal.map((h) => (
          <rect key={`m${h}`} x={0} y={h * vp.zoom + vp.pan.y - 3} width={10} height={6} className="ruler-guide-marker" />
        ))}
      </svg>
    </div>
  );
}
