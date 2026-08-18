/**
 * svg.ts — Importador SVG (Fase 8+).
 *
 * Convierte un archivo .svg a nodos del IR: cada primitiva (rect, circle,
 * ellipse, line, polygon, path) pasa a ser un nodo `vector` con su path en
 * coordenadas locales; los grupos se aplastan (transformaciones resueltas con
 * matrices), los gradientes se mapean a Style.gradient y el texto básico a
 * nodos de texto. El resultado es un frame con el tamaño del viewBox que se
 * inserta en la pantalla y se puede editar como cualquier otro nodo.
 */
import type { Gradient, Node, Style } from "../core/ir";
import { uid } from "../core/tree";

// ---------------------------------------------------------------------------
// Matrices 2D (para resolver transform="...")
// ---------------------------------------------------------------------------

interface Mat {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

const ID = (): Mat => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

function mul(m: Mat, n: Mat): Mat {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  };
}

function apply(m: Mat, p: { x: number; y: number }): { x: number; y: number } {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

function translate(tx: number, ty: number): Mat {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

function rotate(deg: number): Mat {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { a: c, b: s, c: -s, d: c, e: 0, f: 0 };
}

function scale(sx: number, sy: number): Mat {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

function parseTransform(str: string | null): Mat {
  if (!str) return ID();
  let m = ID();
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(str))) {
    const op = match[1];
    const nums = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    switch (op) {
      case "matrix":
        if (nums.length >= 6) m = mul(m, { a: nums[0], b: nums[1], c: nums[2], d: nums[3], e: nums[4], f: nums[5] });
        break;
      case "translate":
        m = mul(m, translate(nums[0] ?? 0, nums[1] ?? 0));
        break;
      case "scale":
        m = mul(m, scale(nums[0] ?? 1, nums[1] ?? nums[0] ?? 1));
        break;
      case "rotate": {
        const [deg, cx, cy] = nums;
        if (cx !== undefined && cy !== undefined) {
          m = mul(m, translate(cx, cy));
          m = mul(m, rotate(deg ?? 0));
          m = mul(m, translate(-cx, -cy));
        } else {
          m = mul(m, rotate(deg ?? 0));
        }
        break;
      }
      case "skewX":
        m = mul(m, { a: 1, b: 0, c: Math.tan(((nums[0] ?? 0) * Math.PI) / 180), d: 1, e: 0, f: 0 });
        break;
      case "skewY":
        m = mul(m, { a: 1, b: Math.tan(((nums[0] ?? 0) * Math.PI) / 180), c: 0, d: 1, e: 0, f: 0 });
        break;
    }
  }
  return m;
}

// ---------------------------------------------------------------------------
// Paths: parser → comandos absolutos → arcos a curvas → bbox → serializar
// ---------------------------------------------------------------------------

interface Pt {
  x: number;
  y: number;
}

type Cmd =
  | { op: "M"; pts: Pt[] }
  | { op: "L"; pts: Pt[] }
  | { op: "C"; pts: Pt[] }
  | { op: "Q"; pts: Pt[] }
  | { op: "Z" };

const NUM_T = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?$/;
const isNum = (t: string): boolean => NUM_T.test(t);

/** Exportado para pruebas: parsea datos de path a comandos absolutos. */
export function parsePath(d: string): Cmd[] {
  const cmds: Cmd[] = [];
  let cur = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  let lastC: Pt | null = null;
  let lastQ: Pt | null = null;

  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = "";
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      i++;
    }
    if (!cmd) break;

    const num = () => Number(tokens[i++]);
    const rel = cmd === cmd.toLowerCase();
    const op = cmd.toUpperCase();
    const px = (x: number, y: number): Pt =>
      rel ? { x: cur.x + x, y: cur.y + y } : { x, y };

    if (op === "Z") {
      cmds.push({ op: "Z" });
      cur = { ...start };
      lastC = null;
      lastQ = null;
      i++;
      continue;
    }
    if (op === "M") {
      const pts: Pt[] = [];
      while (i < tokens.length && isNum(tokens[i])) {
        const p = px(num(), num());
        pts.push(p);
        cur = p;
        if (pts.length === 1) start = { ...p };
      }
      if (pts.length === 0) continue;
      cmds.push({ op: "M", pts: [pts[0]] });
      // El resto de puntos del M son L implícitos.
      if (pts.length > 1) cmds.push({ op: "L", pts: pts.slice(1) });
      lastC = null;
      lastQ = null;
      continue;
    }
    if (op === "L" || op === "H" || op === "V") {
      const pts: Pt[] = [];
      while (i < tokens.length && isNum(tokens[i])) {
        if (op === "H") {
          // H solo mueve X (Y se mantiene): relativo suma, absoluto fija.
          const v = num();
          pts.push(rel ? { x: cur.x + v, y: cur.y } : { x: v, y: cur.y });
        } else if (op === "V") {
          // V solo mueve Y (X se mantiene): relativo suma, absoluto fija.
          const v = num();
          pts.push(rel ? { x: cur.x, y: cur.y + v } : { x: cur.x, y: v });
        } else {
          const x = num();
          const y = num();
          pts.push(px(x, y));
        }
      }
      if (pts.length > 0) {
        cmds.push({ op: "L", pts });
        cur = { ...pts[pts.length - 1] };
      }
      lastC = null;
      lastQ = null;
      continue;
    }
    if (op === "C") {
      const pts: Pt[] = [];
      while (i < tokens.length && isNum(tokens[i])) {
        const c1 = px(num(), num());
        const c2 = px(num(), num());
        const e = px(num(), num());
        pts.push(c1, c2, e);
        cur = e;
      }
      if (pts.length > 0) {
        cmds.push({ op: "C", pts });
        lastC = pts[pts.length - 2];
      }
      lastQ = null;
      continue;
    }
    if (op === "S") {
      const pts: Pt[] = [];
      while (i < tokens.length && isNum(tokens[i])) {
        const prev = lastC ?? cur;
        const c1 = { x: 2 * cur.x - prev.x, y: 2 * cur.y - prev.y };
        const c2 = px(num(), num());
        const e = px(num(), num());
        pts.push(c1, c2, e);
        cur = e;
      }
      if (pts.length > 0) {
        cmds.push({ op: "C", pts });
        lastC = pts[pts.length - 2];
      }
      lastQ = null;
      continue;
    }
    if (op === "Q") {
      const pts: Pt[] = [];
      while (i < tokens.length && isNum(tokens[i])) {
        const c = px(num(), num());
        const e = px(num(), num());
        pts.push(c, e);
        cur = e;
      }
      if (pts.length > 0) {
        cmds.push({ op: "Q", pts });
        lastQ = pts[pts.length - 2];
      }
      lastC = null;
      continue;
    }
    if (op === "T") {
      const pts: Pt[] = [];
      while (i < tokens.length && isNum(tokens[i])) {
        const prev = lastQ ?? cur;
        const c = { x: 2 * cur.x - prev.x, y: 2 * cur.y - prev.y };
        const e = px(num(), num());
        pts.push(c, e);
        cur = e;
      }
      if (pts.length > 0) {
        cmds.push({ op: "Q", pts });
        lastQ = pts[pts.length - 2];
      }
      lastC = null;
      continue;
    }
    if (op === "A") {
      while (i < tokens.length && isNum(tokens[i])) {
        const rx = Math.abs(num());
        const ry = Math.abs(num());
        const rot = num();
        const large = num() !== 0;
        const sweep = num() !== 0;
        const x = num();
        const y = num();
        const end = px(x, y);
        if (rx === 0 || ry === 0) {
          cmds.push({ op: "L", pts: [end] });
        } else {
          cmds.push(...arcToCubics(cur, rx, ry, rot, large, sweep, end));
        }
        cur = end;
      }
      lastC = null;
      lastQ = null;
      continue;
    }
    // Comando desconocido: saltar sus argumentos.
    while (i < tokens.length && isNum(tokens[i])) i++;
  }
  return cmds;
}

/** Arco SVG (endpoint) → segmentos de bézier cúbica. */
function arcToCubics(p0: Pt, rx: number, ry: number, rotDeg: number, large: boolean, sweep: boolean, p1: Pt): Cmd[] {
  const phi = (rotDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx = (p0.x - p1.x) / 2;
  const dy = (p0.y - p1.y) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  let rx2 = rx * rx;
  let ry2 = ry * ry;
  const x1p2 = x1p * x1p;
  const y1p2 = y1p * y1p;
  let lam = (x1p2 / rx2) + (y1p2 / ry2);
  if (lam > 1) {
    const s = Math.sqrt(lam);
    rx *= s;
    ry *= s;
    rx2 = rx * rx;
    ry2 = ry * ry;
    lam = 1;
  }

  const num = rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2;
  const den = rx2 * y1p2 + ry2 * x1p2;
  let coef = den <= 0 ? 0 : Math.sqrt(Math.max(0, num / den));
  if (large === sweep) coef = -coef;
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;

  const cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2;

  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy)) || 1;
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };

  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  let theta1 = ang(1, 0, ux, uy);
  let dtheta = ang(ux, uy, vx, vy);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI;

  const segs = Math.max(1, Math.ceil(Math.abs(dtheta) / (Math.PI / 2)));
  const out: Cmd[] = [];
  let t0 = theta1;
  for (let sgm = 0; sgm < segs; sgm++) {
    const t1 = t0 + dtheta / segs;
    const alpha = (4 / 3) * Math.tan((t1 - t0) / 4);
    const c1 = {
      x: cx + rx * (Math.cos(t0) - alpha * Math.sin(t0)) * cosPhi - ry * (Math.sin(t0) + alpha * Math.cos(t0)) * sinPhi,
      y: cy + rx * (Math.cos(t0) - alpha * Math.sin(t0)) * sinPhi + ry * (Math.sin(t0) + alpha * Math.cos(t0)) * cosPhi,
    };
    const c2 = {
      x: cx + rx * (Math.cos(t1) + alpha * Math.sin(t1)) * cosPhi - ry * (Math.sin(t1) - alpha * Math.cos(t1)) * sinPhi,
      y: cy + rx * (Math.cos(t1) + alpha * Math.sin(t1)) * sinPhi + ry * (Math.sin(t1) - alpha * Math.cos(t1)) * cosPhi,
    };
    const end = {
      x: cx + rx * Math.cos(t1) * cosPhi - ry * Math.sin(t1) * sinPhi,
      y: cy + rx * Math.cos(t1) * sinPhi + ry * Math.sin(t1) * cosPhi,
    };
    out.push({ op: "C", pts: [c1, c2, end] });
    t0 = t1;
  }
  return out;
}

/** Exportado para pruebas: aplica una matriz a los comandos de un path. */
export function transformCmds(cmds: Cmd[], m: Mat): Cmd[] {
  const out: Cmd[] = [];
  for (const c of cmds) {
    if (c.op === "Z") {
      out.push(c);
    } else {
      out.push({ ...c, pts: c.pts.map((p) => apply(m, p)) });
    }
  }
  return out;
}

/** Exportado para pruebas: caja envolvente (conservadora) de un path. */
export function pathBBox(cmds: Cmd[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (p: Pt) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  };
  for (const c of cmds) {
    if (c.op === "Z") continue;
    for (const p of c.pts) add(p);
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

/** Exportado para pruebas: serializa comandos a string de path. */
export function serialize(cmds: Cmd[]): string {
  const fmt = (v: number) => (Math.round(v * 100) / 100).toString();
  let out = "";
  for (const c of cmds) {
    if (c.op === "M") out += `M${fmt(c.pts[0].x)} ${fmt(c.pts[0].y)}`;
    else if (c.op === "L") for (const p of c.pts) out += `L${fmt(p.x)} ${fmt(p.y)}`;
    else if (c.op === "C")
      for (let i = 0; i < c.pts.length; i += 3)
        out += `C${fmt(c.pts[i].x)} ${fmt(c.pts[i].y)} ${fmt(c.pts[i + 1].x)} ${fmt(c.pts[i + 1].y)} ${fmt(c.pts[i + 2].x)} ${fmt(c.pts[i + 2].y)}`;
    else if (c.op === "Q")
      for (let i = 0; i < c.pts.length; i += 2)
        out += `Q${fmt(c.pts[i].x)} ${fmt(c.pts[i].y)} ${fmt(c.pts[i + 1].x)} ${fmt(c.pts[i + 1].y)}`;
    else out += "Z";
  }
  return out;
}

// ---------------------------------------------------------------------------
// Colores y gradientes
// ---------------------------------------------------------------------------

const NAMED: Record<string, string> = {
  black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff",
  yellow: "#ffff00", orange: "#ffa500", purple: "#800080", pink: "#ffc0cb", cyan: "#00ffff",
  magenta: "#ff00ff", gray: "#808080", grey: "#808080", silver: "#c0c0c0", maroon: "#800000",
  olive: "#808000", lime: "#00ff00", teal: "#008080", navy: "#000080", aqua: "#00ffff",
  fuchsia: "#ff00ff", brown: "#a52a2a", gold: "#ffd700", indigo: "#4b0082", khaki: "#f0e68c",
  lavender: "#e6e6fa", salmon: "#fa8072", tomato: "#ff6347", violet: "#ee82ee", beige: "#f5f5dc",
  coral: "#ff7f50", crimson: "#dc143c", darkblue: "#00008b", darkgray: "#a9a9a9",
  darkgreen: "#006400", darkgrey: "#a9a9a9", darkred: "#8b0000", darkslateblue: "#483d8b",
  darkviolet: "#9400d3", firebrick: "#b22222", hotpink: "#ff69b4", lightblue: "#add8e6",
  lightgray: "#d3d3d3", lightgrey: "#d3d3d3", lightpink: "#ffb6c1", lightyellow: "#ffffe0",
  mediumblue: "#0000cd", midnightblue: "#191970", peru: "#cd853f", rebeccapurple: "#663399",
  royalblue: "#4169e1", skyblue: "#87ceeb", slateblue: "#6a5acd", slategray: "#708090",
  steelblue: "#4682b4", tan: "#d2b48c", turquoise: "#40e0d0", transparent: "rgba(0,0,0,0)",
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function withAlpha(color: string, alpha: number): string {
  if (alpha >= 1 || alpha < 0) return color;
  const rgb = hexToRgb(color);
  if (rgb) return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  return color;
}

/** Color de un <stop>: usa stop-color (no fill). */
function stopColor(el: Element): string | null {
  const value = el.getAttribute("stop-color")?.trim();
  if (!value || value === "none") return null;
  if (value === "currentColor") return "#000000";
  if (value.startsWith("#")) return value;
  if (/^rgba?\(/i.test(value)) return value;
  return NAMED[value.toLowerCase()] ?? null;
}

/** Resuelve fill/stroke a un color literal (o devuelve el ref de gradiente). */
function resolvePaint(
  el: Element,
  attr: "fill" | "stroke",
  gradients: Map<string, GradientDef>,
): string | null {
  let value = el.getAttribute(attr);
  if (!value) value = attr === "fill" ? "#000000" : null; // fill por defecto: negro
  if (!value) return null;
  value = value.trim();
  if (value === "none") return null;
  if (value.startsWith("url(")) {
    const id = /url\(\s*#([^)]+)\s*\)/.exec(value)?.[1];
    if (id && gradients.has(id)) return `grad:${id}`;
    return null;
  }
  if (value === "currentColor") value = "#000000";
  if (value.startsWith("#")) return value;
  if (/^rgba?\(/i.test(value)) return value;
  if (NAMED[value.toLowerCase()]) return NAMED[value.toLowerCase()];
  return "#000000";
}

// ---------------------------------------------------------------------------
// Defs: gradientes
// ---------------------------------------------------------------------------

interface GradientDef {
  kind: "linear" | "radial";
  units: string;
  x1: number; y1: number; x2: number; y2: number;
  cx: number; cy: number; r: number;
  transform: Mat;
  stops: { offset: number; color: string }[];
}

function collectDefs(svg: Element): Map<string, GradientDef> {
  const map = new Map<string, GradientDef>();
  const defs = svg.querySelectorAll("linearGradient, radialGradient");
  defs.forEach((g) => {
    const id = g.getAttribute("id");
    if (!id) return;
    const stops: { offset: number; color: string }[] = [];
    let last = -1;
    g.querySelectorAll("stop").forEach((st, idx, all) => {
      const offAttr = st.getAttribute("offset");
      let offset: number;
      if (offAttr != null) {
        offset = parseFloat(offAttr) / (offAttr.endsWith("%") ? 100 : 1);
      } else {
        // Sin offset: interpolación lineal entre los offsets conocidos.
        offset = all.length <= 1 ? idx : idx / (all.length - 1);
      }
      if (!isFinite(offset)) offset = last >= 0 ? last : idx / Math.max(1, all.length - 1);
      last = offset;
      const color = stopColor(st) ?? "#000000";
      stops.push({ offset: clamp01(offset), color: withAlpha(color, parseFloat(st.getAttribute("stop-opacity") ?? "1")) });
    });
    if (stops.length === 0) return;
    const units = g.getAttribute("gradientUnits") ?? "objectBoundingBox";
    const t = parseTransform(g.getAttribute("gradientTransform"));
    const num = (a: string | null, d: number) => {
      const v = a != null ? parseFloat(a) : d;
      return isFinite(v) ? v : d;
    };
    if (g.tagName === "radialGradient") {
      map.set(id, {
        kind: "radial",
        units,
        x1: 0, y1: 0, x2: 0, y2: 0,
        cx: num(g.getAttribute("cx"), 0.5),
        cy: num(g.getAttribute("cy"), 0.5),
        r: num(g.getAttribute("r"), 0.5),
        transform: t,
        stops,
      });
    } else {
      map.set(id, {
        kind: "linear",
        units,
        x1: num(g.getAttribute("x1"), 0),
        y1: num(g.getAttribute("y1"), 0),
        x2: num(g.getAttribute("x2"), 1),
        y2: num(g.getAttribute("y2"), 0),
        cx: 0, cy: 0, r: 0,
        transform: t,
        stops,
      });
    }
  });
  return map;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Convierte un GradientDef a IR Gradient para la caja (x,y,w,h) del nodo. */
function gradientFor(def: GradientDef, box: { x: number; y: number; w: number; h: number }): Gradient {
  const stops = def.stops.map((s) => ({ pos: clamp01(s.offset), color: s.color }));
  if (def.kind === "radial") {
    return { type: "radial", angle: 0, stops };
  }
  // Normaliza los endpoints al space del objeto y aplica el transform del def.
  let p1 = { x: def.x1, y: def.y1 };
  let p2 = { x: def.x2, y: def.y2 };
  if (def.units === "userSpaceOnUse") {
    const bw = Math.max(1, box.w);
    const bh = Math.max(1, box.h);
    p1 = { x: (p1.x - box.x) / bw, y: (p1.y - box.y) / bh };
    p2 = { x: (p2.x - box.x) / bw, y: (p2.y - box.y) / bh };
  }
  p1 = apply(def.transform, p1);
  p2 = apply(def.transform, p2);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  // Convención CSS: dirección (sin a, -cos a) → ángulo.
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return { type: "linear", angle, stops };
}

// ---------------------------------------------------------------------------
// Caminata del árbol → items
// ---------------------------------------------------------------------------

type Item =
  | { kind: "path"; cmds: Cmd[]; fill: string | null; gradientId: string | null; stroke: { color: string; width: number } | null; opacity: number; fillRule?: "evenodd" }
  | { kind: "text"; text: string; x: number; y: number; fontSize: number; fontFamily: string | undefined; fill: string | null; anchor: string; opacity: number };

function walk(
  el: Element,
  m: Mat,
  gradients: Map<string, GradientDef>,
  items: Item[],
  warnings: string[],
  depth: number,
): void {
  if (depth > 40) return;
  const local = parseTransform(el.getAttribute("transform"));
  const m2 = mul(m, local);
  const tag = el.tagName.toLowerCase();
  const opacity = clamp01(parseFloat(el.getAttribute("opacity") ?? "1"));
  const fillRule = el.getAttribute("fill-rule") === "evenodd" ? "evenodd" as const : undefined;

  const strokeWidth = (() => {
    const w = parseFloat(el.getAttribute("stroke-width") ?? "");
    if (!isFinite(w) || w <= 0) return null;
    if ((el.getAttribute("stroke") ?? "").trim() === "none") return null;
    return w;
  })();
  const strokeColor = strokeWidth != null ? resolvePaint(el, "stroke", gradients) : null;
  const stroke =
    strokeWidth != null && strokeColor != null && !strokeColor.startsWith("grad:")
      ? { color: strokeColor, width: strokeWidth }
      : null;

  const pushPath = (cmds: Cmd[], fill: string | null, gradientId: string | null) => {
    items.push({ kind: "path", cmds, fill, gradientId, stroke, opacity: opacity * (parseFloat(el.getAttribute("fill-opacity") ?? "1") || 1), fillRule });
  };

  switch (tag) {
    case "path": {
      const d = el.getAttribute("d");
      if (d) pushPath(transformCmds(parsePath(d), m2), resolvePaint(el, "fill", gradients), gradientRef(resolvePaint(el, "fill", gradients)));
      break;
    }
    case "rect": {
      const x = parseFloat(el.getAttribute("x") ?? "0");
      const y = parseFloat(el.getAttribute("y") ?? "0");
      const w = parseFloat(el.getAttribute("width") ?? "0");
      const h = parseFloat(el.getAttribute("height") ?? "0");
      if (w <= 0 || h <= 0) break;
      const rx = Math.min(parseFloat(el.getAttribute("rx") ?? "0") || 0, w / 2);
      const ry = Math.min(parseFloat(el.getAttribute("ry") ?? "0") || 0, h / 2);
      pushPath(transformCmds(roundedRect(x, y, w, h, rx, ry), m2), resolvePaint(el, "fill", gradients), gradientRef(resolvePaint(el, "fill", gradients)));
      break;
    }
    case "circle": {
      const cx = parseFloat(el.getAttribute("cx") ?? "0");
      const cy = parseFloat(el.getAttribute("cy") ?? "0");
      const r = parseFloat(el.getAttribute("r") ?? "0");
      if (r <= 0) break;
      pushPath(transformCmds(circlePath(cx, cy, r), m2), resolvePaint(el, "fill", gradients), gradientRef(resolvePaint(el, "fill", gradients)));
      break;
    }
    case "ellipse": {
      const cx = parseFloat(el.getAttribute("cx") ?? "0");
      const cy = parseFloat(el.getAttribute("cy") ?? "0");
      const rx = parseFloat(el.getAttribute("rx") ?? "0");
      const ry = parseFloat(el.getAttribute("ry") ?? "0");
      if (rx <= 0 || ry <= 0) break;
      pushPath(transformCmds(circlePath(cx, cy, rx, ry), m2), resolvePaint(el, "fill", gradients), gradientRef(resolvePaint(el, "fill", gradients)));
      break;
    }
    case "line": {
      const x1 = parseFloat(el.getAttribute("x1") ?? "0");
      const y1 = parseFloat(el.getAttribute("y1") ?? "0");
      const x2 = parseFloat(el.getAttribute("x2") ?? "0");
      const y2 = parseFloat(el.getAttribute("y2") ?? "0");
      if (!stroke) break;
      pushPath(transformCmds([{ op: "M", pts: [{ x: x1, y: y1 }] }, { op: "L", pts: [{ x: x2, y: y2 }] }], m2), null, null);
      break;
    }
    case "polygon":
    case "polyline": {
      const pts = (el.getAttribute("points") ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      const pairs: Pt[] = [];
      for (let i = 0; i + 1 < pts.length; i += 2) pairs.push({ x: pts[i], y: pts[i + 1] });
      if (pairs.length < 2) break;
      const cmds: Cmd[] = [{ op: "M", pts: [pairs[0]] }, { op: "L", pts: pairs.slice(1) }];
      if (tag === "polygon") cmds.push({ op: "Z" });
      pushPath(transformCmds(cmds, m2), resolvePaint(el, "fill", gradients), gradientRef(resolvePaint(el, "fill", gradients)));
      break;
    }
    case "text": {
      const text = el.textContent ?? "";
      const x = parseFloat(el.getAttribute("x") ?? "0");
      const y = parseFloat(el.getAttribute("y") ?? "0");
      const fontSize = parseFloat(el.getAttribute("font-size") ?? "16") || 16;
      const anchor = el.getAttribute("text-anchor") ?? "start";
      const fontFamily = el.getAttribute("font-family") ?? undefined;
      const fill = resolvePaint(el, "fill", gradients);
      const p = apply(m2, { x, y });
      items.push({
        kind: "text",
        text,
        x: p.x,
        y: p.y,
        fontSize,
        fontFamily,
        fill: fill && !fill.startsWith("grad:") ? fill : null,
        anchor,
        opacity,
      });
      break;
    }
    case "g":
    case "a":
    case "svg":
      for (const child of el.children) walk(child, m2, gradients, items, warnings, depth + 1);
      break;
    case "defs":
    case "style":
    case "title":
    case "desc":
    case "metadata":
      break;
    case "image":
      warnings.push("Imágenes raster incrustadas: se omiten (importa el PNG aparte)");
      break;
    case "use":
      warnings.push("Referencias <use>: se omiten en esta versión");
      break;
    case "clipPath":
    case "mask":
      warnings.push(`Elemento ${tag}: se omite en esta versión`);
      break;
    default:
      // Nodo desconocido: intenta con sus hijos (suele ser un contenedor).
      if (el.children.length > 0) {
        for (const child of el.children) walk(child, m2, gradients, items, warnings, depth + 1);
      }
  }
}

function gradientRef(paint: string | null): string | null {
  return paint?.startsWith("grad:") ? paint.slice(5) : null;
}

function roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number): Cmd[] {
  if (rx <= 0 || ry <= 0) {
    return [{ op: "M", pts: [{ x, y }] }, { op: "L", pts: [{ x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] }, { op: "Z" }];
  }
  return [
    { op: "M", pts: [{ x: x + rx, y }] },
    { op: "L", pts: [{ x: x + w - rx, y }] },
    ...arcToCubics({ x: x + w - rx, y }, rx, ry, 0, false, true, { x: x + w, y: y + ry }),
    { op: "L", pts: [{ x: x + w, y: y + h - ry }] },
    ...arcToCubics({ x: x + w, y: y + h - ry }, rx, ry, 0, false, true, { x: x + w - rx, y: y + h }),
    { op: "L", pts: [{ x: x + rx, y: y + h }] },
    ...arcToCubics({ x: x + rx, y: y + h }, rx, ry, 0, false, true, { x, y: y + h - ry }),
    { op: "L", pts: [{ x, y: y + ry }] },
    ...arcToCubics({ x, y: y + ry }, rx, ry, 0, false, true, { x: x + rx, y }),
    { op: "Z" },
  ];
}

function circlePath(cx: number, cy: number, rx: number, ry = rx): Cmd[] {
  const k = 0.5522847498;
  return [
    { op: "M", pts: [{ x: cx - rx, y: cy }] },
    {
      op: "C",
      pts: [
        { x: cx - rx, y: cy + ry * k },
        { x: cx - rx * k, y: cy + ry },
        { x: cx, y: cy + ry },
      ],
    },
    {
      op: "C",
      pts: [
        { x: cx + rx * k, y: cy + ry },
        { x: cx + rx, y: cy + ry * k },
        { x: cx + rx, y: cy },
      ],
    },
    {
      op: "C",
      pts: [
        { x: cx + rx, y: cy - ry * k },
        { x: cx + rx * k, y: cy - ry },
        { x: cx, y: cy - ry },
      ],
    },
    {
      op: "C",
      pts: [
        { x: cx - rx * k, y: cy - ry },
        { x: cx - rx, y: cy - ry * k },
        { x: cx - rx, y: cy },
      ],
    },
    { op: "Z" },
  ];
}

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------

export interface SvgImportResult {
  node: Node;
  warnings: string[];
}

export function parseSvg(text: string, name: string): SvgImportResult {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("El archivo no es un SVG válido");
  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== "svg") throw new Error("El archivo no es un SVG");

  const vbRaw = svg.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  const vb =
    vbRaw && vbRaw.length === 4 && vbRaw[2] > 0 && vbRaw[3] > 0
      ? { x: vbRaw[0], y: vbRaw[1], w: vbRaw[2], h: vbRaw[3] }
      : null;
  const w = vb ? vb.w : parseLength(svg.getAttribute("width")) ?? 300;
  const h = vb ? vb.h : parseLength(svg.getAttribute("height")) ?? 150;
  const ox = vb ? vb.x : 0;
  const oy = vb ? vb.y : 0;
  if (w <= 0 || h <= 0) throw new Error("El SVG no tiene tamaño (falta width/height o viewBox)");

  const warnings: string[] = [];
  const gradients = collectDefs(svg);
  const items: Item[] = [];
  walk(svg, ID(), gradients, items, warnings, 0);
  if (items.length === 0) throw new Error("El SVG no tiene elementos dibujables");

  const children: Node[] = [];
  for (const item of items) {
    if (item.kind === "text") {
      const est = Math.ceil(item.text.length * item.fontSize * 0.55);
      const tw = Math.max(est, 1);
      const th = Math.ceil(item.fontSize * 1.25);
      let x = item.x - ox;
      if (item.anchor === "middle") x -= tw / 2;
      if (item.anchor === "end") x -= tw;
      const style: Style = {
        x: Math.round(x),
        y: Math.round(item.y - item.fontSize - oy),
        width: tw,
        height: th,
        fontSize: item.fontSize,
        color: item.fill ?? "#000000",
        ...(item.fontFamily ? { fontFamily: item.fontFamily } : {}),
        ...(item.opacity < 1 ? { opacity: item.opacity } : {}),
      };
      children.push({
        id: uid(),
        type: "text",
        name: "Texto",
        text: item.text,
        style,
        children: [],
      });
      continue;
    }

    const strokePad = item.stroke ? item.stroke.width / 2 : 0;
    const b = pathBBox(item.cmds);
    const bw = b.maxX - b.minX + strokePad * 2;
    const bh = b.maxY - b.minY + strokePad * 2;
    if (bw <= 0.001 || bh <= 0.001) continue;
    // La caja del nodo vive en coords del frame (= espacio del SVG menos el
    // origen del viewBox); el path se traslada a coords locales del nodo.
    const shift = { a: 1, b: 0, c: 0, d: 1, e: -b.minX + strokePad, f: -b.minY + strokePad };
    const path = serialize(transformCmds(item.cmds, shift));

    const style: Style = {
      x: Math.round(b.minX - strokePad - ox),
      y: Math.round(b.minY - strokePad - oy),
      width: Math.ceil(bw),
      height: Math.ceil(bh),
    };
    if (item.gradientId && gradients.has(item.gradientId)) {
      style.gradient = gradientFor(gradients.get(item.gradientId)!, { x: b.minX, y: b.minY, w: bw, h: bh });
    } else if (item.fill) {
      style.backgroundColor = withAlpha(item.fill, item.opacity);
    }
    if (item.stroke) style.stroke = item.stroke;
    if (item.opacity < 1 && !item.fill) style.opacity = item.opacity;

    children.push({
      id: uid(),
      type: "vector",
      name: "Forma",
      path,
      fillRule: item.fillRule,
      style,
      children: [],
    });
  }

  if (children.length === 0) throw new Error("No se pudo convertir el SVG a formas");

  const node: Node = {
    id: uid(),
    type: "frame",
    name,
    style: { x: 0, y: 0, width: Math.ceil(w), height: Math.ceil(h) },
    children,
  };
  return { node, warnings };
}

function parseLength(v: string | null): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return isFinite(n) ? n : null;
}
