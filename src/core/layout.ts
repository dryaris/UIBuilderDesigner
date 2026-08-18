/**
 * layout.ts — geometría del auto-layout (flexbox).
 *
 * El DOM renderiza auto-layout con CSS flexbox real (WYSIWYG exacto con el
 * exportador HTML). Este módulo replica ese mismo algoritmo en JS para todo
 * lo que necesita GEOMETRÍA sin DOM: hit-testing, cajas de selección, marquee
 * y exportadores. Ambas implementaciones usan los mismos inputs (dirección,
 * gap, padding, alineaciones, wrap y tamaños de hijos), así que no divergen.
 */
import type { Node, Rect } from "./ir";
import { findParent } from "./tree";

const ZERO_PAD = { top: 0, right: 0, bottom: 0, left: 0 };

/** ¿El nodo tiene auto-layout activo? (definido por tener flexDirection). */
export function hasAutoLayout(node: Node): boolean {
  return Boolean(node.style.flexDirection);
}

/** ¿El nodo es hijo directo de un padre con auto-layout? */
export function isFlexChild(root: Node, node: Node): boolean {
  const parent = findParent(root, node.id);
  return parent ? hasAutoLayout(parent.parent) : false;
}

/** Tamaño efectivo de un nodo: el de su style, salvo hug (calculado). */
export function effectiveSize(node: Node): { width: number; height: number } {
  return {
    width: node.style.sizing?.x === "hug" ? hugSize(node, "x") : node.style.width,
    height: node.style.sizing?.y === "hug" ? hugSize(node, "y") : node.style.height,
  };
}

/** Tamaño del contenido en un eje si el nodo fuese hug (recursivo). */
function hugSize(node: Node, axis: "x" | "y"): number {
  const s = node.style;
  const pad = s.padding ?? ZERO_PAD;
  if (!hasAutoLayout(node) || node.children.length === 0) {
    return axis === "x" ? s.width : s.height;
  }
  const dir = s.flexDirection as "row" | "column";
  const gap = s.gap ?? 0;
  const sizes = node.children.map((c) => {
    const e = effectiveSize(c);
    return { w: e.width, h: e.height };
  });
  if (axis === "x") {
    const total =
      dir === "row"
        ? sizes.reduce((a, sz, i) => a + sz.w + (i > 0 ? gap : 0), 0)
        : Math.max(0, ...sizes.map((sz) => sz.w));
    return pad.left + pad.right + total;
  }
  const total =
    dir === "column"
      ? sizes.reduce((a, sz, i) => a + sz.h + (i > 0 ? gap : 0), 0)
      : Math.max(0, ...sizes.map((sz) => sz.h));
  return pad.top + pad.bottom + total;
}

/**
 * Rects de los hijos de un nodo con auto-layout, RELATIVOS al nodo (incluye
 * padding). Devuelve null si el nodo no tiene auto-layout (hijos absolutos).
 */
export function flexChildRects(node: Node): Rect[] | null {
  if (!hasAutoLayout(node)) return null;
  const s = node.style;
  const dir = s.flexDirection as "row" | "column";
  const gap = s.gap ?? 0;
  const pad = s.padding ?? ZERO_PAD;
  const wrap = !!s.wrap;

  const kids = node.children;
  const sizes = kids.map((c) => effectiveSize(c));

  // Tamaño disponible en el eje principal (para wrap). Hug → sin límite.
  const mainLimit =
    dir === "row" ? node.style.width - pad.left - pad.right : node.style.height - pad.top - pad.bottom;
  const huggingMain =
    dir === "row" ? s.sizing?.x === "hug" : s.sizing?.y === "hug";
  const crossLimit =
    dir === "row" ? node.style.height - pad.top - pad.bottom : node.style.width - pad.left - pad.right;
  const huggingCross =
    dir === "row" ? s.sizing?.y === "hug" : s.sizing?.x === "hug";

  const itemMain = (i: number) => (dir === "row" ? sizes[i].width : sizes[i].height);
  const itemCross = (i: number) => (dir === "row" ? sizes[i].height : sizes[i].width);

  // Empaquetado en líneas (wrap) o una sola línea.
  const lines: number[][] = [];
  if (wrap && !huggingMain && mainLimit > 0) {
    let cur: number[] = [];
    let curMain = 0;
    for (let i = 0; i < kids.length; i++) {
      const add = cur.length === 0 ? itemMain(i) : curMain + gap + itemMain(i);
      if (cur.length > 0 && add > mainLimit) {
        lines.push(cur);
        cur = [];
        curMain = 0;
      }
      cur.push(i);
      curMain = cur.length === 1 ? itemMain(i) : curMain + gap + itemMain(i);
    }
    if (cur.length > 0) lines.push(cur);
  } else {
    lines.push(kids.map((_, i) => i));
  }

  const justify = s.justifyContent ?? "flex-start";
  const align = s.alignItems ?? "flex-start";
  const out: Rect[] = new Array(kids.length);

  // Offset del contenido según align (cruzado). stretch no aplica: los hijos
  // tienen tamaño explícito (igual que en el CSS: no se estiran).
  const crossOffset = (lineCross: number) => {
    const space = huggingCross ? lineCross : crossLimit;
    if (align === "center") return (space - lineCross) / 2;
    if (align === "flex-end") return space - lineCross;
    return 0;
  };

  let cursor = 0; // avance cruzado (línea a línea con wrap)
  for (const line of lines) {
    const lineCross = Math.max(0, ...line.map(itemCross));
    const lineMain = line.reduce((a, i, k) => a + itemMain(i) + (k > 0 ? gap : 0), 0);
    const free = huggingMain ? 0 : Math.max(0, mainLimit - lineMain);
    const starts = mainStarts(line, itemMain, gap, free, justify);

    for (let k = 0; k < line.length; k++) {
      const i = line[k];
      if (dir === "row") {
        out[i] = {
          x: pad.left + starts[k],
          y: pad.top + cursor + crossOffset(lineCross),
          width: sizes[i].width,
          height: sizes[i].height,
        };
      } else {
        out[i] = {
          x: pad.left + cursor + crossOffset(lineCross),
          y: pad.top + starts[k],
          width: sizes[i].width,
          height: sizes[i].height,
        };
      }
    }
    cursor += lineCross + gap; // siguiente línea (wrap)
  }
  return out;
}

/**
 * Offset inicial de cada ítem en el eje principal, replicando justify-content
 * de CSS combinado con `gap` (el gap es el mínimo; el espacio libre se reparte
 * según la distribución).
 */
function mainStarts(
  line: number[],
  itemMain: (i: number) => number,
  gap: number,
  free: number,
  justify: string,
): number[] {
  const n = line.length;
  let between = gap;
  let cursor = 0;
  if (justify === "center") cursor = free / 2;
  else if (justify === "flex-end") cursor = free;
  else if (justify === "space-between" && n > 1) between = gap + free / (n - 1);
  else if (justify === "space-around") {
    between = gap + (2 * free) / n;
    cursor = free / n;
  } else if (justify === "space-evenly") {
    between = gap + free / (n + 1);
    cursor = free / (n + 1);
  }
  const starts: number[] = [];
  for (const i of line) {
    starts.push(cursor);
    cursor += itemMain(i) + between;
  }
  return starts;
}

/**
 * Rect de MUNDO de un nodo (compensa padres y auto-layout). Para la raíz es
 * su propio style; para el resto suma el rect relativo al padre (calculado
 * por flex si el padre tiene auto-layout, o su x/y absoluta si no).
 */
export function worldRect(root: Node, node: Node): Rect {
  const eff = effectiveSize(node);
  const parent = findParent(root, node.id);
  if (!parent) {
    return { x: node.style.x, y: node.style.y, width: eff.width, height: eff.height };
  }
  const pWorld = worldRect(root, parent.parent);
  const rects = flexChildRects(parent.parent);
  const rel = rects
    ? rects[parent.index]
    : { x: node.style.x, y: node.style.y, width: eff.width, height: eff.height };
  return {
    x: pWorld.x + rel.x,
    y: pWorld.y + rel.y,
    width: rel.width,
    height: rel.height,
  };
}
