/**
 * Contraste WCAG — parsea colores CSS y calcula la relación de contraste
 * para el comprobador de accesibilidad del Inspector (Fase 3).
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Acepta #rgb, #rrggbb y rgb()/rgba() (ignora el canal alfa). */
export function parseColor(input: string): Rgb | null {
  const color = input.trim().toLowerCase();
  const hex3 = color.match(/^#([0-9a-f]{3})$/);
  if (hex3) {
    return {
      r: parseInt(hex3[1][0] + hex3[1][0], 16),
      g: parseInt(hex3[1][1] + hex3[1][1], 16),
      b: parseInt(hex3[1][2] + hex3[1][2], 16),
    };
  }
  const hex6 = color.match(/^#([0-9a-f]{6})$/);
  if (hex6) {
    return {
      r: parseInt(hex6[1].slice(0, 2), 16),
      g: parseInt(hex6[1].slice(2, 4), 16),
      b: parseInt(hex6[1].slice(4, 6), 16),
    };
  }
  const rgb = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgb) {
    return {
      r: Math.round(Number(rgb[1])),
      g: Math.round(Number(rgb[2])),
      b: Math.round(Number(rgb[3])),
    };
  }
  return null;
}

/** Luminancia relativa según WCAG 2.x. */
export function luminance(c: Rgb): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

/** Relación de contraste entre dos colores (1..21). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export type WcagRating = "AAA" | "AA" | "AA-large" | "fail";

/** Calificación: AAA ≥ 7, AA ≥ 4.5, AA-large ≥ 3 (texto grande). */
export function wcagRating(ratio: number): WcagRating {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}
