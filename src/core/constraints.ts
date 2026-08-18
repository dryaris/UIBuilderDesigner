/**
 * constraints.ts — Constraints/responsive (Fase 3, pendiente).
 *
 * Comportamiento estilo Figma: cada nodo define cómo reacciona su posición y
 * tamaño cuando su contenedor cambia de tamaño. Por eje (horizontal/vertical):
 *  - min     → el borde fijo al inicio del padre (izquierda/arriba).
 *  - max     → el borde fijo al final del padre (derecha/abajo).
 *  - center  → el centro se mantiene en la misma proporción del padre.
 *  - stretch → los dos bordes fijos: el nodo se estira con el padre.
 *  - scale   → posición y tamaño escalan proporcionalmente.
 *
 * Se ignora en hijos de auto-layout (el flexbox los coloca) y en el frame raíz.
 */
import type { Constraints, Node, Rect, Style } from "./ir";

export const DEFAULT_CONSTRAINTS: Constraints = { horizontal: "min", vertical: "min" };

/** ¿El padre coloca a sus hijos con auto-layout (flexbox)? → constraints ignorados. */
export function isAutoLayoutChild(parent: Node): boolean {
  return Boolean(parent.style.flexDirection);
}

/**
 * Aplica los constraints de los hijos directos al redimensionar el padre.
 * Mutación sobre los estilos de los hijos (dentro de un draft de Immer).
 * Solo toca nodos cuyo tamaño real (efectivo) sea definido; los que estén en
 * auto-layout se saltan. Devuelve cuántos hijos se reposicionaron.
 */
export function applyConstraintsOnResize(
  parent: Node,
  children: Node[],
  oldParent: Rect,
  newParent: Rect,
): number {
  let changed = 0;
  const ow = oldParent.width || 1;
  const oh = oldParent.height || 1;
  for (const child of children) {
    const c = child.constraints;
    if (!c) continue;
    if (isAutoLayoutChild(parent)) continue;
    const s = child.style;
    if (s.x === undefined || s.y === undefined || s.width === undefined || s.height === undefined) continue;

    let nx = s.x;
    let ny = s.y;
    let nw = s.width;
    let nh = s.height;

    const dx = newParent.x - oldParent.x;
    const dy = newParent.y - oldParent.y;
    const dw = newParent.width - oldParent.width;
    const dh = newParent.height - oldParent.height;

    switch (c.horizontal) {
      case "min":
        nx = s.x + dx;
        break;
      case "max":
        nx = s.x + s.width + dx + dw - s.width;
        break;
      case "center":
        nx = (s.x + s.width / 2 - oldParent.x) / ow * newParent.width + newParent.x - s.width / 2;
        break;
      case "stretch":
        nx = s.x + dx;
        nw = s.width + dw;
        break;
      case "scale": {
        const k = newParent.width / ow;
        nx = newParent.x + (s.x - oldParent.x) * k;
        nw = s.width * k;
        break;
      }
    }
    switch (c.vertical) {
      case "min":
        ny = s.y + dy;
        break;
      case "max":
        ny = s.y + s.height + dy + dh - s.height;
        break;
      case "center":
        ny = (s.y + s.height / 2 - oldParent.y) / oh * newParent.height + newParent.y - s.height / 2;
        break;
      case "stretch":
        ny = s.y + dy;
        nh = s.height + dh;
        break;
      case "scale": {
        const k = newParent.height / oh;
        ny = newParent.y + (s.y - oldParent.y) * k;
        nh = s.height * k;
        break;
      }
    }

    s.x = Math.round(nx);
    s.y = Math.round(ny);
    s.width = Math.max(1, Math.round(nw));
    s.height = Math.max(1, Math.round(nh));
    changed += 1;
  }
  return changed;
}

/**
 * CSS de posicionamiento responsive para el exportador HTML.
 * Devuelve las reglas de caja para un nodo con constraints dentro de un padre
 * de pw×ph. `null` si no aplica (auto-layout o sin constraints).
 */
export function constraintCss(
  s: Style,
  c: Constraints,
  pw: number,
  ph: number,
): string[] | null {
  if (s.x === undefined || s.y === undefined || s.width === undefined || s.height === undefined) {
    return null;
  }
  const rules: string[] = [];
  const w = s.width;
  const h = s.height;

  switch (c.horizontal) {
    case "min":
      rules.push(`left: ${s.x}px;`);
      break;
    case "max":
      rules.push(`right: ${Math.round(pw - s.x - w)}px;`);
      break;
    case "center":
      rules.push(`left: ${((s.x + w / 2) / (pw || 1)) * 100}%;`);
      rules.push(`margin-left: ${-w / 2}px;`);
      break;
    case "stretch":
      rules.push(`left: ${s.x}px;`);
      rules.push(`right: ${Math.round(pw - s.x - w)}px;`);
      rules.push("width: auto;");
      break;
    case "scale":
      rules.push(`left: ${(s.x / (pw || 1)) * 100}%;`);
      rules.push(`width: ${(w / (pw || 1)) * 100}%;`);
      break;
  }
  switch (c.vertical) {
    case "min":
      rules.push(`top: ${s.y}px;`);
      break;
    case "max":
      rules.push(`bottom: ${Math.round(ph - s.y - h)}px;`);
      break;
    case "center":
      rules.push(`top: ${((s.y + h / 2) / (ph || 1)) * 100}%;`);
      rules.push(`margin-top: ${-h / 2}px;`);
      break;
    case "stretch":
      rules.push(`top: ${s.y}px;`);
      rules.push(`bottom: ${Math.round(ph - s.y - h)}px;`);
      rules.push("height: auto;");
      break;
    case "scale":
      rules.push(`top: ${(s.y / (ph || 1)) * 100}%;`);
      rules.push(`height: ${(h / (ph || 1)) * 100}%;`);
      break;
  }
  return rules;
}

/** Etiquetas de UI sin jerga técnica para el inspector. */
export const CONSTRAINT_LABELS: Record<Constraints["horizontal"], string> = {
  min: "Izquierda",
  max: "Derecha",
  center: "Centrado",
  stretch: "Estirar",
  scale: "Escalar",
};
