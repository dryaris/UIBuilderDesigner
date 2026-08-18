/**
 * Reproductor de timelines — Fase 4.
 *
 * Cuando `playing` está activo y el editor está en modo Preview, anima los
 * nodos de la línea de tiempo activa con la Web Animations API directamente
 * sobre los elementos del DOM (el mismo DOM que renderiza el lienzo):
 * interpolación de keyframes, easing por tramo (tokens de easing incluidos)
 * y loop. No muta el documento: el undo y el autosave quedan intactos.
 */
import { useEffect } from "react";
import { useStore } from "../state/store";
import type { CanvasDoc, Style } from "../core/ir";
import { resolveColor } from "../core/tokens";

/** Parsea la curva: "$token" → valor del doc, cubic-bezier() → tal cual, si no "ease". */
function resolveEasing(doc: CanvasDoc, easing: string | undefined): string {
  if (!easing) return "ease";
  if (easing.startsWith("$")) {
    return doc.tokens.easings[easing.slice(1)] ?? "ease";
  }
  if (/^(linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\([^)]*\)|steps\([^)]*\))$/.test(easing)) {
    return easing;
  }
  return "ease";
}

/** Traduce propiedades del IR a propiedades CSS animables (resolviendo tokens). */
function toWaa(p: Partial<Style>, doc: CanvasDoc): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (p.x !== undefined) out.left = `${p.x}px`;
  if (p.y !== undefined) out.top = `${p.y}px`;
  if (p.width !== undefined) out.width = `${p.width}px`;
  if (p.height !== undefined) out.height = `${p.height}px`;
  if (p.opacity !== undefined) out.opacity = p.opacity;
  if (p.scale !== undefined || p.translate) {
    const parts: string[] = [];
    if (p.translate) parts.push(`translate(${p.translate.x}px, ${p.translate.y}px)`);
    if (p.scale !== undefined) parts.push(`scale(${p.scale})`);
    out.transform = parts.join(" ");
  }
  const bg = p.backgroundColor ? resolveColor(doc.tokens, p.backgroundColor) : undefined;
  if (bg) out.backgroundColor = bg;
  const color = p.color ? resolveColor(doc.tokens, p.color) : undefined;
  if (color) out.color = color;
  if (p.fontSize !== undefined) out.fontSize = `${p.fontSize}px`;
  if (p.letterSpacing !== undefined) out.letterSpacing = `${p.letterSpacing}px`;
  if (p.filters?.blur !== undefined) out.filter = `blur(${p.filters.blur}px)`;
  return out;
}

export function useTimelinePlayer(): void {
  const playing = useStore((s) => s.playing);
  const previewMode = useStore((s) => s.previewMode);
  const activeTimelineId = useStore((s) => s.activeTimelineId);

  useEffect(() => {
    if (!playing || !previewMode || !activeTimelineId) return;
    const st = useStore.getState();
    const doc = st.doc;
    const tl = doc.timelines.find((t) => t.id === activeTimelineId);
    if (!tl || tl.keyframes.length === 0) return;

    const animations: Animation[] = [];
    const nodeIds = new Set(tl.keyframes.map((k) => k.nodeId));

    for (const nodeId of nodeIds) {
      const el = document.querySelector<HTMLElement>(`[data-id="${CSS.escape(nodeId)}"]`);
      if (!el) continue;
      const frames = tl.keyframes
        .filter((k) => k.nodeId === nodeId)
        .sort((a, b) => a.t - b.t);
      if (frames.length < 2) continue;

      const keyframes: Keyframe[] = frames.map((f, i) => {
        const kf = { offset: Math.min(1, Math.max(0, f.t)), ...toWaa(f.properties, doc) } as Keyframe;
        // WAAPI: el easing de un keyframe rige el tramo hacia el siguiente.
        if (i < frames.length - 1) kf.easing = resolveEasing(doc, f.easing);
        return kf;
      });

      const anim = el.animate(keyframes, {
        duration: Math.max(1, tl.durationMs),
        iterations: tl.loop ? Infinity : 1,
        fill: "both",
      });
      animations.push(anim);
    }

    return () => {
      for (const a of animations) a.cancel();
    };
  }, [playing, previewMode, activeTimelineId]);
}
