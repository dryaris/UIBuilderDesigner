/**
 * Gizmos — overlay SVG en espacio de PANTALLA (trazo constante a cualquier zoom).
 * Dibuja: cajas de selección + handles, hover, líneas de snapping, marquee,
 * guías arrastrables, áreas seguras TV/consola y cuadrícula de puntos.
 */
import type { ReactNode, RefObject } from "react";
import type { DragSession, SpacingHint, Viewport } from "../state/store";
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
  const previewMode = useStore((s) => s.previewMode);
  const vp = useStore((s) => s.viewport);
  const showGuides = useStore((s) => s.showGuides);
  const showSafeAreas = useStore((s) => s.showSafeAreas);
  const showGrid = useStore((s) => s.showGrid);
  const selectedAnnotationId = useStore((s) => s.selectedAnnotationId);
  const setSelectedAnnotationId = useStore((s) => s.setSelectedAnnotationId);

  const canvas = canvasRef.current;
  const toS = (wx: number, wy: number) => toScreen(canvas as HTMLDivElement, wx, wy, vp);
  if (!canvas) return null;

  // En preview no se dibujan guías ni áreas seguras (pertenecen a la pantalla del editor).
  const g = doc.root.guides;
  const guidesV = showGuides && !previewMode ? g?.vertical ?? [] : [];
  const guidesH = showGuides && !previewMode ? g?.horizontal ?? [] : [];

  // Frame "activo" para safe areas: la selección si es un frame con safeArea, si no el root.
  let safeFrame: Node | null = null;
  if (showSafeAreas && !previewMode) {
    const sel = selection.length === 1 ? findNode(doc.root, selection[0]) : null;
    if (sel?.safeArea) safeFrame = sel;
    else if (doc.root.safeArea) safeFrame = doc.root;
  }

  // Líneas de snap activas durante el drag (solo move/resize las generan).
  const snapLines =
    drag && (drag.kind === "move" || drag.kind === "resize") ? drag.lines : [];

  // Pistas de medición durante un move (Fase 2: spacing hints).
  const hints = drag?.kind === "move" ? drag.hints : [];

  // Cuadrícula de layout del frame activo (el seleccionado con layoutGrid o el root).
  const gridFrame =
    selection.length === 1 ? findNode(doc.root, selection[0]) : null;
  const layoutGridNode =
    gridFrame?.layoutGrid?.enabled
      ? gridFrame
      : doc.root.layoutGrid?.enabled
        ? doc.root
        : null;

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

      {/* Pistas de medición (spacing hints) */}
      {hints.map((h, i) => (
        <SpacingHintView key={i} hint={h} toS={toS} />
      ))}

      {/* Cuadrícula de layout del frame */}
      {layoutGridNode && <LayoutGridOverlay frame={layoutGridNode} toS={toS} />}

      {/* Hover y selección se ocultan en modo Preview (Fase 4). */}
      {!previewMode && hoverId && !selection.includes(hoverId) && (
        <HoverOutline id={hoverId} drag={drag} toS={toS} />
      )}

      {/* Selección */}
      {!previewMode && selection.map((id) => {
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

      {/* Pins de anotaciones (solo en edición; los pins son de la pantalla del editor) */}
      {!previewMode && (
        <AnnotationsLayer
          toS={toS}
          annotations={doc.annotations ?? []}
          selectedId={selectedAnnotationId}
          onSelect={(id) => setSelectedAnnotationId(id)}
        />
      )}
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

/** Pinta una pista de medición estilo Figma: línea roja con ticks y etiqueta. */
function SpacingHintView({ hint, toS }: { hint: SpacingHint; toS: (x: number, y: number) => { x: number; y: number } }) {
  if (hint.axis === "h") {
    const a = toS(hint.from, hint.at);
    const b = toS(hint.to, hint.at);
    return (
      <g className="spacing-hint">
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <line x1={a.x} y1={a.y - 5} x2={a.x} y2={a.y + 5} />
        <line x1={b.x} y1={b.y - 5} x2={b.x} y2={b.y + 5} />
        <text x={(a.x + b.x) / 2} y={a.y - 7} textAnchor="middle">
          {hint.value}
        </text>
      </g>
    );
  }
  const a = toS(hint.at, hint.from);
  const b = toS(hint.at, hint.to);
  return (
    <g className="spacing-hint">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <line x1={a.x - 5} y1={a.y} x2={a.x + 5} y2={a.y} />
      <line x1={b.x - 5} y1={b.y} x2={b.x + 5} y2={b.y} />
      <text x={a.x + 7} y={(a.y + b.y) / 2 + 3} textAnchor="middle">
        {hint.value}
      </text>
    </g>
  );
}

/** Cuadrícula de layout del frame: columnas/filas con margin y gutter (Fase 2). */
function LayoutGridOverlay({ frame, toS }: { frame: Node; toS: (x: number, y: number) => { x: number; y: number } }) {
  const g = frame.layoutGrid;
  if (!g || !g.enabled) return null;
  const r = nodeRect(frame);
  const margin = g.margin || 0;
  const gutter = g.gutter || 0;
  const cells: Rect[] = [];

  if (g.columns > 0) {
    const usable = Math.max(0, r.width - margin * 2 - gutter * (g.columns - 1));
    const colW = usable / g.columns;
    for (let i = 0; i < g.columns; i++) {
      cells.push({
        x: r.x + margin + i * (colW + gutter),
        y: r.y + margin,
        width: colW,
        height: Math.max(0, r.height - margin * 2),
      });
    }
  }
  if (g.rows > 0) {
    const usableH = Math.max(0, r.height - margin * 2 - gutter * (g.rows - 1));
    const rowH = usableH / g.rows;
    for (let i = 0; i < g.rows; i++) {
      cells.push({
        x: r.x + margin,
        y: r.y + margin + i * (rowH + gutter),
        width: Math.max(0, r.width - margin * 2),
        height: rowH,
      });
    }
  }

  return (
    <g className="layout-grid">
      {cells.map((c, i) => {
        const a = toS(c.x, c.y);
        const b = toS(c.x + c.width, c.y + c.height);
        return <rect key={i} x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} rx={1} />;
      })}
    </g>
  );
}

/**
 * Pins de anotación (Fase 7): círculos numerados sobre la pantalla. Clic =
 * seleccionar la anotación para editarla en el panel Prototipo; el pin
 * seleccionado se resalta.
 */
function AnnotationsLayer({
  toS,
  annotations,
  selectedId,
  onSelect,
}: {
  toS: (x: number, y: number) => { x: number; y: number };
  annotations: { id: string; x: number; y: number; color: string; text: string; resolved?: boolean }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <g className="annotations-layer">
      {annotations.map((a, i) => {
        const p = toS(a.x, a.y);
        const sel = a.id === selectedId;
        return (
          <g
            key={a.id}
            className={`annotation-pin${sel ? " is-selected" : ""}${a.resolved ? " is-resolved" : ""}`}
            transform={`translate(${p.x}, ${p.y})`}
            onClick={(ev) => {
              ev.stopPropagation();
              onSelect(sel ? null : a.id);
            }}
          >
            <circle r={9} fill={a.resolved ? "#3f8f5f" : a.color} />
            <text y={3.5} textAnchor="middle" className="annotation-num">
              {i + 1}
            </text>
            {a.text && !a.resolved && (
              <g>
                <path d={`M 0 9 L 0 18`} className="annotation-tail" />
                <rect x={14} y={4} rx={4} className="annotation-bubble" width={160} height={22} />
                <text x={22} y={19} className="annotation-bubble-text" style={{ pointerEvents: "none" }}>
                  {a.text.length > 26 ? `${a.text.slice(0, 26)}…` : a.text}
                </text>
              </g>
            )}
            <title>{a.text || `Anotación ${i + 1}`}</title>
          </g>
        );
      })}
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
