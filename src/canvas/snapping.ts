/**
 * Snapping — pixel-perfect por defecto.
 *
 * Durante un drag, los bordes y centros del nodo (o del grupo) se comparan
 * contra: guías del root, bordes/centros del frame raíz y bordes/centros de
 * los nodos hermanos. Se elige el candidato más cercano dentro del umbral y
 * se devuelve el ajuste + las líneas de guía a dibujar.
 */
import type { CanvasDoc, Rect } from "../core/ir";
import { nodeRect } from "../core/tree";
import type { Handle, SnapLine } from "../state/store";

interface Targets {
  guidesV: number[];
  guidesH: number[];
  rects: Rect[];
}

export function buildTargets(doc: CanvasDoc, excludeIds: string[], includeRoot: boolean): Targets {
  const guidesV: number[] = [];
  const guidesH: number[] = [];
  if (doc.root.guides) {
    guidesV.push(...doc.root.guides.vertical);
    guidesH.push(...doc.root.guides.horizontal);
  }
  const rects: Rect[] = [];
  if (includeRoot) rects.push(nodeRect(doc.root));
  for (const child of doc.root.children) {
    if (excludeIds.includes(child.id) || child.hidden) continue;
    rects.push(nodeRect(child));
  }
  return { guidesV, guidesH, rects };
}

interface EdgeSet {
  l: boolean;
  r: boolean;
  t: boolean;
  b: boolean;
}

/**
 * Calcula el ajuste (dx, dy) que acerca `rect` a los targets dentro del umbral.
 * `active` indica qué bordes participan (en resize solo los bordes que se mueven).
 */
export function snapRect(
  rect: Rect,
  targets: Targets,
  threshold: number,
  active: EdgeSet = { l: true, r: true, t: true, b: true },
): { dx: number; dy: number; lines: SnapLine[] } {
  const lines: SnapLine[] = [];
  let dx = 0;
  let dy = 0;

  // ---- eje X: bordes izquierdo, centro y derecho ----
  const xCandidates: { delta: number; line: SnapLine; mag: number }[] = [];
  if (active.l || active.r) {
    const edges: { v: number; on: boolean }[] = [
      { v: rect.x, on: active.l },
      { v: rect.x + rect.width, on: active.r },
    ];
    for (const edge of edges) {
      if (!edge.on) continue;
      for (const g of targets.guidesV) {
        xCandidates.push({
          delta: g - edge.v,
          line: { axis: "x", pos: g, from: rect.y, to: rect.y + rect.height },
          mag: Math.abs(g - edge.v),
        });
      }
      for (const t of targets.rects) {
        for (const tv of [t.x, t.x + t.width / 2, t.x + t.width]) {
          xCandidates.push({
            delta: tv - edge.v,
            line: {
              axis: "x",
              pos: tv,
              from: Math.min(rect.y, t.y),
              to: Math.max(rect.y + rect.height, t.y + t.height),
            },
            mag: Math.abs(tv - edge.v),
          });
        }
      }
    }
  }

  // ---- eje Y: bordes superior, centro e inferior ----
  const yCandidates: { delta: number; line: SnapLine; mag: number }[] = [];
  if (active.t || active.b) {
    const edges: { v: number; on: boolean }[] = [
      { v: rect.y, on: active.t },
      { v: rect.y + rect.height, on: active.b },
    ];
    for (const edge of edges) {
      if (!edge.on) continue;
      for (const g of targets.guidesH) {
        yCandidates.push({
          delta: g - edge.v,
          line: { axis: "y", pos: g, from: rect.x, to: rect.x + rect.width },
          mag: Math.abs(g - edge.v),
        });
      }
      for (const t of targets.rects) {
        for (const tv of [t.y, t.y + t.height / 2, t.y + t.height]) {
          yCandidates.push({
            delta: tv - edge.v,
            line: {
              axis: "y",
              pos: tv,
              from: Math.min(rect.x, t.x),
              to: Math.max(rect.x + rect.width, t.x + t.width),
            },
            mag: Math.abs(tv - edge.v),
          });
        }
      }
    }
  }

  const bestX = xCandidates.filter((c) => c.mag <= threshold).sort((a, b) => a.mag - b.mag)[0];
  if (bestX) {
    dx = bestX.delta;
    lines.push(bestX.line);
  }
  const bestY = yCandidates.filter((c) => c.mag <= threshold).sort((a, b) => a.mag - b.mag)[0];
  if (bestY) {
    dy = bestY.delta;
    lines.push(bestY.line);
  }

  return { dx, dy, lines };
}

/** Snap para mover (todos los bordes activos). */
export function snapMove(
  box: Rect,
  doc: CanvasDoc,
  excludeIds: string[],
  threshold: number,
): { dx: number; dy: number; lines: SnapLine[] } {
  return snapRect(box, buildTargets(doc, excludeIds, true), threshold);
}

const HANDLE_EDGES: Record<Handle, EdgeSet> = {
  n: { l: false, r: false, t: true, b: false },
  s: { l: false, r: false, t: false, b: true },
  e: { l: false, r: true, t: false, b: false },
  w: { l: true, r: false, t: false, b: false },
  ne: { l: false, r: true, t: true, b: false },
  nw: { l: true, r: false, t: true, b: false },
  se: { l: false, r: true, t: false, b: true },
  sw: { l: true, r: false, t: false, b: true },
};

/** Snap para redimensionar (solo los bordes que mueve el handle). */
export function snapResize(
  rect: Rect,
  handle: Handle,
  doc: CanvasDoc,
  threshold: number,
): { dx: number; dy: number; lines: SnapLine[] } {
  return snapRect(rect, buildTargets(doc, [], true), threshold, HANDLE_EDGES[handle]);
}

/** Aplica la geometría de un handle a un rect de partida. */
export function resizeRect(start: Rect, handle: Handle, dx: number, dy: number): Rect {
  const min = 1;
  const d = (v: number) => Math.max(min, v);
  switch (handle) {
    case "e": return { ...start, width: d(start.width + dx) };
    case "w": {
      const width = d(start.width - dx);
      return { ...start, x: start.x + (start.width - width), width };
    }
    case "s": return { ...start, height: d(start.height + dy) };
    case "n": {
      const height = d(start.height - dy);
      return { ...start, y: start.y + (start.height - height), height };
    }
    case "se": return { ...start, width: d(start.width + dx), height: d(start.height + dy) };
    case "sw": {
      const width = d(start.width - dx);
      return { ...start, x: start.x + (start.width - width), width, height: d(start.height + dy) };
    }
    case "ne": {
      const height = d(start.height - dy);
      return { ...start, width: d(start.width + dx), y: start.y + (start.height - height), height };
    }
    case "nw": {
      const width = d(start.width - dx);
      const height = d(start.height - dy);
      return {
        ...start,
        x: start.x + (start.width - width),
        y: start.y + (start.height - height),
        width,
        height,
      };
    }
  }
}

/** Rect normalizado (acepta drag en cualquier dirección). */
export function normRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}
