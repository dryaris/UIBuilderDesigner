/**
 * Resolución de tokens — traduce "$nombre" → valor concreto del documento.
 * El canvas y los exportadores SIEMPRE pasan por aquí para resolver referencias.
 */
import type { Tokens } from "./ir";

/** Resuelve una referencia "$token" de color; si no es referencia, devuelve el valor. */
export function resolveColor(tokens: Tokens, v: string | undefined): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("$")) return tokens.colors[v.slice(1)] ?? v;
  return v;
}

/** Resuelve borderRadius (número o "$token" de radii). */
export function resolveRadius(tokens: Tokens, v: number | string | undefined): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") {
    if (v.startsWith("$")) return tokens.radii[v.slice(1)];
    return undefined;
  }
  return v;
}

/** Devuelve la referencia "$token" si el color vino de un token (para UI). */
export function tokenName(v: string | undefined): string | null {
  if (v && v.startsWith("$")) return v.slice(1);
  return null;
}
