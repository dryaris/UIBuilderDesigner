/**
 * Helpers de árbol — navegación, hit-testing y geometría sobre el IR.
 * Estas funciones son PURAS: no mutan el documento (salvo las marcadas para
 * usarse dentro de recipes de Immer).
 */
import type { Node, Rect } from "./ir";
import { flexChildRects } from "./layout";

export function uid(): string {
  return crypto.randomUUID();
}

export function nodeRect(n: Node): Rect {
  return { x: n.style.x, y: n.style.y, width: n.style.width, height: n.style.height };
}

export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
  );
}

/** Busca un nodo por id (incluyéndose a sí mismo). */
export function findNode(node: Node, id: string): Node | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return null;
}

/** Busca el padre e índice de un nodo. */
export function findParent(
  node: Node,
  id: string,
): { parent: Node; index: number } | null {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.id === id) return { parent: node, index: i };
    const hit = findParent(child, id);
    if (hit) return hit;
  }
  return null;
}

/** Recorre el árbol en profundidad (preorden). */
export function walk(node: Node, fn: (n: Node) => void): void {
  fn(node);
  for (const child of node.children) walk(child, fn);
}

/** Clon profundo independiente (para duplicar y para sesiones). */
export function cloneNode(n: Node): Node {
  return JSON.parse(JSON.stringify(n)) as Node;
}

/** Caja envolvente de un conjunto de rects. */
export function bbox(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Hit-testing estilo Figma: recorre de ARRIBA (último hijo) hacia abajo.
 * Un nodo solo es seleccionable si tiene "pintura" (fondo, gradiente, trazo,
 * texto o imagen); los frames transparentes no capturan el clic.
 *
 * Usa rects de MUNDO calculados por layout.ts: compensa el offset de cada
 * padre y la posición de auto-layout (flexChildRects) cuando aplica.
 */
export function hitTest(root: Node, x: number, y: number): Node | null {
  const rects = flexChildRects(root) ?? root.children.map(nodeRect);
  for (let i = root.children.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (!r) continue;
    const childWorld = {
      x: root.style.x + r.x,
      y: root.style.y + r.y,
      width: r.width,
      height: r.height,
    };
    const hit = hitNode(root.children[i], childWorld, x, y);
    if (hit) return hit;
  }
  return null;
}

function hitNode(node: Node, world: Rect, x: number, y: number): Node | null {
  if (node.hidden) return null;
  const rects = flexChildRects(node) ?? node.children.map(nodeRect);
  for (let i = node.children.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (!r) continue;
    const childWorld = {
      x: world.x + r.x,
      y: world.y + r.y,
      width: r.width,
      height: r.height,
    };
    const hit = hitNode(node.children[i], childWorld, x, y);
    if (hit) return hit;
  }
  const s = node.style;
  const paintable =
    s.backgroundColor ||
    s.gradient ||
    s.stroke ||
    node.type === "text" ||
    node.type === "image" ||
    node.type === "vector";
  if (paintable && pointInRect(x, y, world)) return node;
  return null;
}

/** Nodos seleccionables de primer nivel (hijos del frame raíz). */
export function topLevelNodes(root: Node): Node[] {
  return root.children.filter((n) => !n.hidden);
}

/** Todos los nodos del documento excepto la raíz. */
export function allNodes(root: Node): Node[] {
  const out: Node[] = [];
  for (const child of root.children) walk(child, (n) => out.push(n));
  return out;
}
