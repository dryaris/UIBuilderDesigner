/**
 * Gizmos — overlay SVG en espacio de PANTALLA (trazo constante a cualquier zoom).
 * Dibuja: cajas de selección + handles, hover, líneas de snapping, marquee,
 * guías arrastrables, áreas seguras TV/consola y cuadrícula de puntos.
 */
import type { ReactNode, RefObject } from "react";
import type { DragSession, Viewport } from "../state/store";
import { useStore } from "../state/store";
import type { Node, Rect } from "../core/ir";
import { findNode, nodeRect } from "../core/tree";
import { toScreen } from "./transform";
import { beginGuideDrag } from "./pointer";

const SAFE_TITLE = "#4ade80";
const SAFE_ACTION = "#fbbf24";

/** Rect efectivo de un nodo, incluyendo la vista previa del drag en curso. */
function effectiveRect(node: Node, drag: DragSession | null): Rect {
  const r = nodeRect(node);
  if (drag?.kind === "move" && drag.ids.includes(node.id)) {
    return { ...r, x: r.x + drag.dx, y: r.y + drag.dy };
  }
  if (drag?.kind === "resize" && drag.id === node.id) return drag.rect;
  return r;
}

export function Gizmos({ canvasRef }: { canvasRef: RefObject<HTMLDivElement | null> }) {
  const selection = useStore((s) => s.selection);
  const hoverId = useStore((s) => s.hoverId);
  const doc = useStore((s) => s.doc);
  const drag = useStore((s) => s.drag);
  const vp = useStore((s) => s.viewport);
  const showGuides = useStore((s) => s.showGuides);
  const showSafeAreas = useStore((s) => s.showSafeAreas);
  const showGrid = useStore((s) => s.showGrid);

  const canvas = canvasRef.current;
  const toS = (wx: number, wy: number) => toScreen(canvas as HTMLDivElement, wx, wy, vp);
  if (!canvas) return null;

  const g = doc.root.guides;
  const guidesV = showGuides ? g?.vertical ?? [] : [];
  const guidesH = showGuides ? g?.horizontal ?? [] : [];

  // Frame "activo" para safe areas: la selección si es un frame con safeArea, si no el root.
  let safeFrame: Node | null = null;
  if (showSafeAreas) {
    const sel = selection.length === 1 ? findNode(doc.root, selection[0]) : null;
    if (sel?.safeArea) safeFrame = sel;
    else if (doc.root.safeArea) safeFrame = doc.root;
  }

  // Líneas de snap activas durante el drag (solo move/resize las generan).
  const snapLines =
    drag && (drag.kind === "move" || drag.kind === "resize") ? drag.lines : [];

  // Rectángulos de vista previa (marquee / create / zoom).
  const preview = drag && (drag.kind === "marquee" || drag.kind === "create" || drag.kind === "zoom-marquee") ? previewRect(drag, vp, canvas) : null;

  return (
    <svg className="gizmos" width="100%" height="100%">
      {/* Cuadrícula de puntos anclada al mundo */}
      {showGrid && gridSvg(vp)}

      {/* Áreas seguras TV/consola */}
      {safeFrame?.safeArea && <SafeAreas frame={safeFrame} toS={toS} />}

      {/* Guías */}
      {guidesV.map((v) => (
        <line
          key={`gv-${v}`}
          className="guide-line"
          x1={toS(v, 0).x}
          y1={0}
          x2={toS(v, 0).x}
          y2={canvas.clientHeight}
          onPointerDown={() => beginGuideDrag("v", v, v)}
        />
      ))}
      {guidesH.map((h) => (
        <line
          key={`gh-${h}`}
          className="guide-line"
          x1={0}
          y1={toS(0, h).y}
          x2={canvas.clientWidth}
          y2={toS(0, h).y}
          onPointerDown={() => beginGuideDrag("h", h, h)}
        />
      ))}

      {/* Guía temporal durante arrastre desde regla */}
      {drag?.kind === "guide" &&
        (drag.axis === "v" ? (
          <line className="guide-line guide-temp" x1={toS(drag.pos, 0).x} y1={0} x2={toS(drag.pos, 0).x} y2={canvas.clientHeight} />
        ) : (
          <line className="guide-line guide-temp" x1={0} y1={toS(0, drag.pos).y} x2={canvas.clientWidth} y2={toS(0, drag.pos).y} />
        ))}

      {/* Líneas de snapping */}
      {snapLines.map((l, i) => {
        const p1 = toS(l.axis === "x" ? l.pos : l.from, l.axis === "x" ? l.from : l.pos);
        const p2 = toS(l.axis === "x" ? l.pos : l.to, l.axis === "x" ? l.to : l.pos);
        return <line key={i} className="snap-line" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />;
      })}

      {/* Hover */}
      {hoverId && !selection.includes(hoverId) && (
        <HoverOutline id={hoverId} drag={drag} toS={toS} />
      )}

      {/* Selección */}
      {selection.map((id) => {
        const node = findNode(doc.root, id);
        if (!node) return null;
        const r = effectiveRect(node, drag);
        const a = toS(r.x, r.y);
        const b = toS(r.x + r.width, r.y + r.height);
        const w = b.x - a.x;
        const h = b.y - a.y;
        const single = selection.length === 1;
        return (
          <g key={id}>
            <rect className="selection-box" x={a.x} y={a.y} width={w} height={h} rx={2} />
            {single && (
              <>
                <text className="node-label" x={a.x} y={a.y - 10}>
                  {node.name}
                </text>
                <ResizeHandles rect={r} toS={toS} />
              </>
            )}
          </g>
        );
      })}

      {/* Vista previa de marquee / creación / zoom */}
      {preview && <rect className="preview-box" x={preview.x} y={preview.y} width={preview.width} height={preview.height} />}
    </svg>
  );
}

function previewRect(drag: Extract<DragSession, { kind: "marquee" | "create" | "zoom-marquee" }>, vp: Viewport, canvas: HTMLDivElement): { x: number; y: number; width: number; height: number } {
  const a = toScreen(canvas, drag.start.x, drag.start.y, vp);
  const b = toScreen(canvas, drag.current.x, drag.current.y, vp);
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

function HoverOutline({ id, drag, toS }: { id: string; drag: DragSession | null; toS: (x: number, y: number) => { x: number; y: number } }) {
  const doc = useStore((s) => s.doc);
  const node = findNode(doc.root, id);
  if (!node) return null;
  const r = effectiveRect(node, drag);
  const a = toS(r.x, r.y);
  const b = toS(r.x + r.width, r.y + r.height);
  return <rect className="hover-box" x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} />;
}

function ResizeHandles({ rect, toS }: { rect: Rect; toS: (x: number, y: number) => { x: number; y: number } }) {
  const positions: { x: number; y: number }[] = [
    toS(rect.x, rect.y),
    toS(rect.x + rect.width / 2, rect.y),
    toS(rect.x + rect.width, rect.y),
    toS(rect.x + rect.width, rect.y + rect.height / 2),
    toS(rect.x + rect.width, rect.y + rect.height),
    toS(rect.x + rect.width / 2, rect.y + rect.height),
    toS(rect.x, rect.y + rect.height),
    toS(rect.x, rect.y + rect.height / 2),
  ];
  return (
    <g className="resize-handles">
      {positions.map((p, i) => (
        <rect key={i} x={p.x - 4} y={p.y - 4} width={8} height={8} rx={1.5} />
      ))}
    </g>
  );
}

function SafeAreas({ frame, toS }: { frame: Node; toS: (x: number, y: number) => { x: number; y: number } }) {
  const r = nodeRect(frame);
  const safe = frame.safeArea;
  if (!safe) return null;
  const a = toS(r.x, r.y);
  const w = r.width * (toS(r.x + 1, r.y).x - a.x);
  const h = r.height * (toS(r.x, r.y + 1).y - a.y);
  const draw = (frac: number, color: string, label: string) => {
    const inset = w * frac;
    const insetY = h * frac;
    return (
      <g key={label}>
        <rect
          x={a.x + inset}
          y={a.y + insetY}
          width={w - inset * 2}
          height={h - insetY * 2}
          className="safe-rect"
          stroke={color}
        />
        <text className="safe-label" x={a.x + inset + 6} y={a.y + insetY + 16} fill={color}>
          {label}
        </text>
      </g>
    );
  };
  return (
    <g>
      {safe.action > 0 && draw(safe.action, SAFE_ACTION, `${Math.round(safe.action * 100)}% action safe`)}
      {safe.title > 0 && draw(safe.title, SAFE_TITLE, `${Math.round(safe.title * 100)}% title safe`)}
    </g>
  );
}

/** Cuadrícula de puntos en espacio de pantalla, anclada al mundo (patrón SVG). */
function gridSvg(vp: Viewport): ReactNode {
  const spacing = Math.max(8, 24 * vp.zoom);
  const id = "dotgrid";
  return (
    <g>
      <defs>
        <pattern id={id} width={spacing} height={spacing} patternUnits="userSpaceOnUse" x={vp.pan.x % spacing} y={vp.pan.y % spacing}>
          <circle cx={1} cy={1} r={Math.max(0.5, 1 * vp.zoom)} className="grid-dot" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </g>
  );
}
