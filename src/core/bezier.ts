/**
 * bezier.ts — Curvas cubic-bezier para el editor visual de easing (Fase 8).
 *
 * Funciones puras (sin DOM) para parsear, muestrear y formatear la curva;
 * el componente visual de arrastre vive en la UI y usa estas mismas funciones,
 * así el render del canvas y el exportador (HTML/Lottie/DTCG) comparten el
 * mismo contrato: "cubic-bezier(x1, y1, x2, y2)".
 */

export interface CubicBezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Parsea "cubic-bezier(0.4, 0, 0.2, 1)" → curva; null si no es válida. */
export function parseCubicBezier(str: string): CubicBezier | null {
  const m = /cubic-bezier\(\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*\)/.exec(
    str.trim(),
  );
  if (!m) return null;
  const c: CubicBezier = {
    x1: Number(m[1]),
    y1: Number(m[2]),
    x2: Number(m[3]),
    y2: Number(m[4]),
  };
  // Las X deben estar en [0, 1] para ser una función de tiempo válida.
  if (!Number.isFinite(c.x1) || !Number.isFinite(c.y1) || !Number.isFinite(c.x2) || !Number.isFinite(c.y2)) {
    return null;
  }
  if (c.x1 < 0 || c.x1 > 1 || c.x2 < 0 || c.x2 > 1) return null;
  return c;
}

export function formatCubicBezier(c: CubicBezier): string {
  const f = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000));
  return `cubic-bezier(${f(c.x1)}, ${f(c.y1)}, ${f(c.x2)}, ${f(c.y2)})`;
}

/**
 * Límites del editor visual: X siempre en [0,1]; Y admite sobre-paso
 * (efecto resorte) en [-0.5, 1.5].
 */
export const EASING_Y_MIN = -0.5;
export const EASING_Y_MAX = 1.5;

export function clampCubicBezier(c: CubicBezier): CubicBezier {
  return {
    x1: Math.min(1, Math.max(0, c.x1)),
    y1: Math.min(EASING_Y_MAX, Math.max(EASING_Y_MIN, c.y1)),
    x2: Math.min(1, Math.max(0, c.x2)),
    y2: Math.min(EASING_Y_MAX, Math.max(EASING_Y_MIN, c.y2)),
  };
}

/** Punto de la curva en t ∈ [0,1] (coordenadas CSS: y hacia abajo, 0..1). */
export function sampleCubicBezier(c: CubicBezier, t: number): { x: number; y: number } {
  const u = 1 - t;
  const x = 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t;
  const y = 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t;
  return { x, y };
}

/**
 * Valor de la curva para un tiempo x ∈ [0,1]: resuelve t con bisección sobre
 * la X de la bézier (la X es monótona porque x1,x2 ∈ [0,1]) y devuelve su Y.
 */
export function easingValue(c: CubicBezier, x: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const t = (lo + hi) / 2;
    const px = sampleCubicBezier(c, t).x;
    if (px < x) lo = t;
    else hi = t;
  }
  return sampleCubicBezier(c, (lo + hi) / 2).y;
}

/**
 * Path SVG de la curva: viewBox 0 0 100 100 con Y mapeada del rango
 * [EASING_Y_MAX..EASING_Y_MIN] → [0..100] (invertida para pantalla).
 */
export function cubicBezierPath(c: CubicBezier): string {
  const Y = (n: number) => (((EASING_Y_MAX - n) / (EASING_Y_MAX - EASING_Y_MIN)) * 100).toFixed(1);
  const X = (n: number) => (n * 100).toFixed(1);
  return `M 0 ${Y(0)} C ${X(c.x1)} ${Y(c.y1)}, ${X(c.x2)} ${Y(c.y2)}, 100 ${Y(1)}`;
}

/** Posición de pantalla de un punto de la curva (para handles y el demo). */
export function cubicBezierPoint(c: CubicBezier, t: number): { x: number; y: number } {
  const p = sampleCubicBezier(c, t);
  return { x: p.x * 100, y: ((EASING_Y_MAX - p.y) / (EASING_Y_MAX - EASING_Y_MIN)) * 100 };
}

export interface EasingPreset {
  name: string;
  label: string;
  curve: CubicBezier;
  /** Descripción en lenguaje de diseñador (sin jerga técnica). */
  desc: string;
}

export const EASING_PRESETS: EasingPreset[] = [
  { name: "lineal", label: "Lineal", curve: { x1: 0, y1: 0, x2: 1, y2: 1 }, desc: "Velocidad constante" },
  { name: "entrada", label: "Entrada", curve: { x1: 0.42, y1: 0, x2: 1, y2: 1 }, desc: "Arranca despacio" },
  { name: "salida", label: "Salida", curve: { x1: 0, y1: 0, x2: 0.58, y2: 1 }, desc: "Frena despacio" },
  { name: "entrada-salida", label: "Entrada y salida", curve: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 }, desc: "Suave en ambos extremos" },
  { name: "resorte", label: "Resorte", curve: { x1: 0.68, y1: -0.55, x2: 0.27, y2: 1.55 }, desc: "Sobre-pasa y rebota" },
  { name: "brusco", label: "Brusco", curve: { x1: 0.1, y1: 0.9, x2: 0.2, y2: 1 }, desc: "Frena casi en seco" },
];
