/**
 * lottie.ts — Exportador Lottie (Fase 8).
 *
 * Convierte la pantalla + una línea de tiempo del IR a JSON Bodymovin (el
 * formato de Lottie), reproduciendo posición, opacidad, escala, color de
 * relleno y tamaño con la curva de easing de cada keyframe. Regla de la casa:
 * fiel, no idéntico — los gradientes y vectores se aproximan (primer stop /
 * se omiten) y se documenta en el JSON.
 */
import type { CanvasDoc, Node, Timeline } from "../core/ir";
import { resolveColor } from "../core/tokens";
import { worldRect } from "../core/layout";
import { downloadBlob, projectFileName } from "./png";

interface LottieKey {
  t: number;
  s: number[] | string;
  e?: number[] | string;
  o?: { x: number; y: number };
  i?: { x: number; y: number };
  h?: number;
}

const FR = 60;

function hexRgb01(hex: string): [number, number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return [0, 0, 0, 1];
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}

/** Curva CSS cubic-bezier → tangentes Lottie (o = salida, i = entrada). */
function easingTangents(easing: string | undefined): { o: { x: number; y: number }; i: { x: number; y: number } } {
  const m = /cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/.exec(easing ?? "");
  if (m) {
    return {
      o: { x: Number(m[1]), y: Number(m[2]) },
      i: { x: Number(m[3]), y: Number(m[4]) },
    };
  }
  return { o: { x: 0, y: 0 }, i: { x: 100, y: 100 } }; // lineal
}

export function exportLottie(doc: CanvasDoc, timelineId?: string): string | null {
  const tl =
    doc.timelines.find((t) => t.id === timelineId) ??
    doc.timelines[0] ??
    null;
  if (!tl) return null;

  const durFrames = Math.max(1, Math.round((tl.durationMs / 1000) * FR));
  const tToF = (t: number) => Math.round(Math.min(1, Math.max(0, t)) * durFrames);

  // Recolecta nodos pintables (hojas) con su rect de mundo + nodo.
  const leaves: { node: Node; rect: ReturnType<typeof worldRect> }[] = [];
  const collect = (n: Node) => {
    const paintable =
      n.type === "text" ||
      n.type === "vector" ||
      Boolean(n.style.backgroundColor || n.style.gradient || n.style.stroke);
    if (paintable && n.type !== "vector") {
      leaves.push({ node: n, rect: worldRect(doc.root, n) });
    }
    for (const c of n.children) collect(c);
  };
  collect(doc.root);

  // Keyframes por nodo, agrupados y ordenados.
  const byNode = new Map<string, Timeline["keyframes"]>();
  for (const k of tl.keyframes) {
    const list = byNode.get(k.nodeId) ?? [];
    list.push(k);
    byNode.set(k.nodeId, list);
  }
  for (const list of byNode.values()) list.sort((a, b) => a.t - b.t);

  const layers: unknown[] = [];
  let ind = 0;

  for (const { node, rect } of leaves) {
    const kfs = byNode.get(node.id) ?? [];
    const animated = kfs.length >= 2;
    ind += 1;

    // Keyframes por propiedad con fallback al estilo BASE del nodo para los
    // valores no capturados en un keyframe parcial (el animado solo overridea).
    const getKf = <T>(getter: (s: Partial<Node["style"]>, base: Node["style"]) => T, fallback: T): LottieKey[] | T => {
      const values = kfs.map((k) => getter(k.properties, node.style));
      const base = getter(node.style, node.style);
      if (!animated || values.every((v) => v === undefined)) {
        return base ?? fallback;
      }
      const out: LottieKey[] = [];
      for (let i = 0; i < kfs.length; i++) {
        const v = values[i];
        if (v === undefined) continue;
        const next = i + 1 < kfs.length ? values[i + 1] : undefined;
        const item: LottieKey = { t: tToF(kfs[i].t), s: v as number[] | string };
        if (next !== undefined && JSON.stringify(next) !== JSON.stringify(v)) item.e = next as number[] | string;
        else if (next === undefined) item.h = 1;
        if (i < kfs.length - 1 && next !== undefined) {
          const { o, i: inn } = easingTangents(kfs[i].easing);
          item.o = o;
          item.i = inn;
        }
        out.push(item);
      }
      return out;
    };

    const posKf = getKf(
      (s, b) => [(s.x ?? b.x) + rect.width / 2, (s.y ?? b.y) + rect.height / 2],
      [rect.x + rect.width / 2, rect.y + rect.height / 2],
    );
    const opacityKf = getKf((s, b) => Math.round((s.opacity ?? b.opacity ?? 1) * 100), Math.round((node.style.opacity ?? 1) * 100));
    const scaleKf = getKf(
      (s, b) => {
        const sc = s.scale ?? b.scale ?? 1;
        return [Math.round(sc * 100), Math.round(sc * 100), 100];
      },
      [Math.round((node.style.scale ?? 1) * 100), Math.round((node.style.scale ?? 1) * 100), 100],
    );

    const baseKs = {
      o: { a: Array.isArray(opacityKf) ? 1 : 0, k: Array.isArray(opacityKf) ? opacityKf : (opacityKf as number) },
      r: { a: 0, k: 0 },
      p: { a: Array.isArray(posKf) ? 1 : 0, k: Array.isArray(posKf) ? posKf : (posKf as number[]) },
      a: { a: 0, k: [rect.width / 2, rect.height / 2, 0] },
      s: { a: Array.isArray(scaleKf) ? 1 : 0, k: Array.isArray(scaleKf) ? scaleKf : (scaleKf as number[]) },
    };

    const common = { ddd: 0, ind, sr: 1, ks: baseKs, ao: 0, ip: 0, op: durFrames, st: 0 };

    if (node.type === "text") {
      const style = node.style;
      const fill = resolveColor(doc.tokens, style.color) ?? "#ffffff";
      const text = node.text ?? "";
      const size = style.fontSize ?? 16;
      layers.push({
        ...common,
        ty: 5,
        nm: node.name,
        t: {
          d: {
            k: [
              {
                t: 0,
                s: {
                  t: text,
                  f: "Inter",
                  s: size,
                  j: style.textAlign === "center" ? 2 : style.textAlign === "right" ? 1 : 0,
                  tr: style.letterSpacing ?? 0,
                  lh: Math.round((style.lineHeight ?? 1.2) * size),
                  fc: hexRgb01(fill),
                },
              },
            ],
          },
          p: {},
          a: {},
        },
      });
      continue;
    }

    // Forma: rect (con esquinas) o elipse; relleno sólido (gradiente → primer stop).
    const isEllipse = node.shape === "ellipse";
    const bg = node.style.backgroundColor
      ? resolveColor(doc.tokens, node.style.backgroundColor) ?? node.style.backgroundColor
      : node.style.gradient?.stops[0]
        ? (resolveColor(doc.tokens, node.style.gradient.stops[0].color) ?? node.style.gradient.stops[0].color)
        : undefined;
    const radius = node.style.borderRadius;

    const shapes: unknown[] = [];
    if (bg) {
      const sizeKf = getKf(
        (s, b) => [s.width ?? b.width, s.height ?? b.height],
        [rect.width, rect.height],
      );
      shapes.push(
        isEllipse
          ? {
              ty: "el",
              d: 1,
              s: { a: 0, k: [rect.width, rect.height] },
              p: { a: 0, k: [0, 0] },
            }
          : {
              ty: "rc",
              d: 1,
              s: { a: Array.isArray(sizeKf) ? 1 : 0, k: sizeKf },
              p: { a: 0, k: [0, 0] },
              r: {
                a: 0,
                k: typeof radius === "number" ? radius : typeof radius === "string" ? (doc.tokens.radii[radius.slice(1)] ?? 0) : 0,
              },
            },
      );
      const fillKf = getKf(
        (s, b) => resolveColor(doc.tokens, s.backgroundColor ?? b.backgroundColor) ?? bg,
        bg,
      );
      // Los colores Lottie son arrays [r,g,b,1] en 0..1.
      const fillC =
        Array.isArray(fillKf)
          ? fillKf.map((k) => ({
              ...k,
              s: hexRgb01(k.s as string),
              e: k.e !== undefined ? hexRgb01(k.e as string) : undefined,
            }))
          : hexRgb01(fillKf as string);
      shapes.push({
        ty: "fl",
        c: { a: Array.isArray(fillC) ? 1 : 0, k: fillC },
        o: { a: 0, k: 100 },
        r: 1,
      });
    }
    if (shapes.length === 0) continue;

    layers.push({ ...common, ty: 4, nm: node.name, shapes });
  }

  if (layers.length === 0) return null;

  const json = {
    v: "5.7.4",
    fr: FR,
    ip: 0,
    op: durFrames,
    w: Math.round(doc.root.style.width),
    h: Math.round(doc.root.style.height),
    nm: `${doc.root.name} — ${tl.name}`,
    ddd: 0,
    assets: [],
    layers,
  };
  return JSON.stringify(json, null, 2);
}

export function exportLottieFile(doc: CanvasDoc, timelineId?: string): boolean {
  const json = exportLottie(doc, timelineId);
  if (!json) return false;
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `${projectFileName(doc)}-lottie.json`);
  return true;
}
