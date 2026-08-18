/**
 * vector.ts — render SVG de nodos vector, COMPARTIDO.
 *
 * Un nodo type === "vector" guarda su geometría en `path` (coords locales de
 * su caja) y su pintura en Style (backgroundColor = relleno, gradient =
 * gradiente, stroke = trazo). Este módulo produce el SVG embebido y lo usan
 * el canvas (NodeView), el exportador HTML y el exportador PNG: un solo
 * string, cero divergencias WYSIWYG.
 */
import type { Node, Style, Tokens } from "./ir";
import { resolveColor } from "./tokens";

function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** SVG completo (con viewBox = caja del nodo) para insertar en el DOM/HTML. */
export function vectorSvg(node: Node, tokens: Tokens): string {
  const s = node.style;
  const w = s.width;
  const h = s.height;
  const defs = s.gradient ? gradientDefs(`vg${node.id.replace(/[^a-zA-Z0-9]/g, "")}`, s.gradient, tokens) : "";
  let attrs = `d="${escapeAttr(node.path ?? "")}"`;
  if (s.gradient) {
    attrs += ` fill="url(#${`vg${node.id.replace(/[^a-zA-Z0-9]/g, "")}`})"`;
  } else {
    const fill = resolveColor(tokens, s.backgroundColor);
    attrs += fill ? ` fill="${escapeAttr(fill)}"` : ` fill="none"`;
  }
  if (s.stroke) {
    const stroke = resolveColor(tokens, s.stroke.color) ?? s.stroke.color;
    attrs += ` stroke="${escapeAttr(stroke)}" stroke-width="${s.stroke.width}"`;
  }
  if (node.fillRule === "evenodd") attrs += ` fill-rule="evenodd"`;
  attrs += ` stroke-linecap="round" stroke-linejoin="round"`;
  // xmlns explícito: el mismo string se incrusta en HTML y en el foreignObject
  // del export PNG (donde un <svg> sin xmlns no se parsea como SVG).
  return `${defs}<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path ${attrs}/></svg>`;
}

/** Defs de gradiente en units de objeto (cubre la caja como CSS linear-gradient). */
function gradientDefs(id: string, g: NonNullable<Style["gradient"]>, tokens: Tokens): string {
  const stops = g.stops
    .map((st) => {
      const color = resolveColor(tokens, st.color) ?? st.color;
      return `<stop offset="${Math.round(st.pos * 100)}%" stop-color="${escapeAttr(color)}"/>`;
    })
    .join("");
  if (g.type === "radial") {
    return `<defs><radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stops}</radialGradient></defs>`;
  }
  // lineal: ángulo CSS (0° = arriba) → endpoints en unit space que cubren la caja.
  const rad = (g.angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const scale = (Math.abs(dx) + Math.abs(dy)) / Math.max(1e-6, Math.max(Math.abs(dx), Math.abs(dy)));
  const hx = (dx * scale) / 2;
  const hy = (dy * scale) / 2;
  return `<defs><linearGradient id="${id}" gradientUnits="objectBoundingBox" x1="${(0.5 - hx).toFixed(4)}" y1="${(0.5 - hy).toFixed(4)}" x2="${(0.5 + hx).toFixed(4)}" y2="${(0.5 + hy).toFixed(4)}">${stops}</linearGradient></defs>`;
}
