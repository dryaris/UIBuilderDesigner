/**
 * Exportador Unity UI Toolkit (UXML + USS) — Fase 5.
 *
 * Mapeo IR → Unity (contrato "fiel, no idéntico"):
 *  - style            → reglas USS (posición absoluta, colores, radios, sombras, tipografía)
 *  - tokens           → custom properties USS (:root { --primary: … })
 *  - estados          → pseudo-clases USS (:hover, :active, :disabled, :focus) + transitions
 *  - componentes      → árbol expandido con comentario de la instancia (template en Fase 7)
 *  - timelines        → documentadas como corrutinas/AnimationCurve (Fase 7)
 *
 * Genera un .zip con Screen.uxml + Screen.uss listos para Unity 2022.2+.
 */
import JSZip from "jszip";
import type { CanvasDoc, Node, Style, Tokens } from "../core/ir";
import { resolveRadius } from "../core/tokens";
import { downloadBlob, projectFileName } from "./png";

const STATE_PSEUDO: [keyof NonNullable<Node["states"]>, string][] = [
  ["hover", ":hover"],
  ["pressed", ":active"],
  ["disabled", ":disabled"],
  ["focused", ":focus"],
];

export function exportUnity(doc: CanvasDoc): { uxml: string; uss: string } {
  const uss: string[] = [];
  uss.push("/* UI Forger → Unity UI Toolkit (USS) — generado automáticamente */");

  const vars = ussVars(doc.tokens);
  if (vars) uss.push(`:root {\n${vars}\n}`);

  const body = renderUxml(doc, doc.root, "screen", uss, 0);
  const uxml = `<?xml version="1.0" encoding="utf-8"?>\n<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="../../UIElementsSchema/UIElements.xsd" editor-extension-mode="False">\n${body}\n</ui:UXML>\n`;

  uss.push(timelineDocs(doc));

  return { uxml, uss: uss.join("\n\n") + "\n" };
}

/** Genera el .zip con Screen.uxml + Screen.uss. */
export async function exportUnityBundle(doc: CanvasDoc): Promise<Blob> {
  const { uxml, uss } = exportUnity(doc);
  const zip = new JSZip();
  zip.file("Screen.uxml", uxml);
  zip.file("Screen.uss", uss);
  return zip.generateAsync({ type: "blob" });
}

export function exportUnityFile(doc: CanvasDoc): void {
  void exportUnityBundle(doc).then((blob) => {
    downloadBlob(blob, `${projectFileName(doc)}-unity.zip`);
  });
}

function renderUxml(doc: CanvasDoc, node: Node, cls: string, uss: string[], depth: number): string {
  const pad = "  ".repeat(depth + 1);
  const sel = `.${cls}`;
  // Auto-layout: los hijos de un contenedor flex no usan posición absoluta.
  // Los vectores pintan dentro del path (SVG), no en la caja.
  const boxStyle =
    node.type === "vector"
      ? { ...node.style, backgroundColor: undefined, gradient: undefined }
      : node.style;
  const ussCtx = ussStyle(boxStyle, doc.tokens, Boolean(node.style.flexDirection));
  uss.push(`${sel} {\n${ussCtx}\n}`);
  if (node.type === "vector") {
    uss.push(`/* ${sel}: vector SVG → exportar como sprite/imagen (no soportado en USS) */`);
  }

  // Estados interactivos → pseudo-clases USS.
  const states = node.states ?? {};
  for (const [key, pseudo] of STATE_PSEUDO) {
    const entry = states[key];
    if (!entry) continue;
    const rule = ussStateRule(sel, pseudo, entry.style, doc.tokens);
    if (entry.transition) {
      const dur = entry.transition.durationMs;
      const easing = resolveEasing(doc.tokens, entry.transition.easing);
      uss.push(
        `${sel} {\n  transition-property: background-color, color, opacity, transform, box-shadow;\n  transition-duration: ${dur}ms;\n  transition-timing-function: ${easing};\n}`,
      );
    }
    uss.push(rule);
  }

  const instancia = node.ref?.startsWith("comp:")
    ? ` <!-- instancia de componente: ${(doc.library.components[node.ref.slice(5)]?.name ?? node.ref)} -->`
    : "";
  const comment = node.ref ? `<!-- nodo vinculado: ${node.ref} -->` : "";

  const children = node.children
    .map((c) => renderUxml(doc, c, `${cls}-${hash(c.id)}`, uss, depth + 1))
    .join("\n");

  const name = sanitizeName(node.name);
  if (node.type === "text") {
    return `${pad}<ui:Label name="${name}" class="${cls}" text="${escapeXml(node.text ?? "")}" />${instancia}`;
  }
  const open = node.children.length > 0
    ? `${pad}<ui:VisualElement name="${name}" class="${cls}">${comment}${instancia}\n${children}\n${pad}</ui:VisualElement>`
    : `${pad}<ui:VisualElement name="${name}" class="${cls}" />${instancia}`;
  return open;
}

function ussStyle(s: Style, tokens: Tokens, inFlex = false): string {
  const rules: string[] = [];
  if (inFlex) {
    rules.push(`position: relative;`);
  } else {
    rules.push(`position: absolute;`);
    // Los campos de caja pueden faltar en overrides parciales (estados).
    if (s.x !== undefined) rules.push(`left: ${s.x}px;`);
    if (s.y !== undefined) rules.push(`top: ${s.y}px;`);
  }
  if (s.sizing?.x === "hug") rules.push(`width: auto;`);
  else if (s.width !== undefined) rules.push(`width: ${s.width}px;`);
  if (s.sizing?.y === "hug") rules.push(`height: auto;`);
  else if (s.height !== undefined) rules.push(`height: ${s.height}px;`);
  if (s.flexDirection) {
    // UI Toolkit usa flexbox real: mismo modelo que el editor.
    rules.push(`flex-direction: ${s.flexDirection};`);
    if (s.justifyContent) rules.push(`justify-content: ${s.justifyContent};`);
    if (s.alignItems) rules.push(`align-items: ${s.alignItems};`);
    if (s.gap !== undefined) rules.push(`gap: ${s.gap}px;`);
    if (s.padding) {
      rules.push(
        `padding: ${s.padding.top}px ${s.padding.right}px ${s.padding.bottom}px ${s.padding.left}px;`,
      );
    }
    if (s.wrap) rules.push(`flex-wrap: wrap;`);
  }

  const bg = colorValue(tokens, s.backgroundColor);
  if (bg) rules.push(`background-color: ${bg};`);
  if (s.gradient) rules.push(`/* gradiente: no soportado en USS (usar Image + sprite/shader) */`);
  const radius = resolveRadius(tokens, s.borderRadius);
  if (radius !== undefined) rules.push(`border-radius: ${radius}px;`);
  if (s.boxShadow) {
    const c = colorValue(tokens, s.boxShadow.color);
    rules.push(`box-shadow: ${s.boxShadow.x}px ${s.boxShadow.y}px ${s.boxShadow.blur}px ${c ?? "rgba(0,0,0,0.3)"};`);
  }
  if (s.opacity !== undefined) rules.push(`opacity: ${s.opacity};`);
  if (s.stroke) {
    rules.push(`border-left-width: ${s.stroke.width}px; border-right-width: ${s.stroke.width}px;`);
    rules.push(`border-top-width: ${s.stroke.width}px; border-bottom-width: ${s.stroke.width}px;`);
    rules.push(`border-color: ${s.stroke.color};`);
  }
  if (s.blendMode && s.blendMode !== "normal") rules.push(`/* blend mode ${s.blendMode}: no soportado en USS */`);
  if (s.filters?.blur) rules.push(`/* blur ${s.filters.blur}px: no soportado en USS */`);

  const isText = s.fontSize !== undefined || s.color !== undefined;
  if (isText) {
    if (s.fontSize) rules.push(`font-size: ${s.fontSize}px;`);
    if (s.fontWeight) rules.push(`font-weight: ${s.fontWeight};`);
    const color = colorValue(tokens, s.color);
    if (color) rules.push(`color: ${color};`);
    if (s.letterSpacing !== undefined) rules.push(`letter-spacing: ${s.letterSpacing}px;`);
    if (s.lineHeight) rules.push(`line-height: ${s.lineHeight};`);
    if (s.textAlign) rules.push(`-unity-text-align: ${textAlignUss(s.textAlign)};`);
    if (s.textTransform && s.textTransform !== "none") rules.push(`text-transform: ${s.textTransform};`);
    if (s.gradient) rules.push(`/* gradiente de texto: no soportado en USS */`);
  }
  return rules.join("\n");
}

function ussStateRule(
  sel: string,
  pseudo: string,
  partial: Partial<Style>,
  tokens: Tokens,
): string {
  // Override parcial: solo el delta visual (sin caja), como en el HTML.
  const { x, y, width, height, ...rest } = partial;
  return `${sel}${pseudo} {\n${ussStyle(rest as Style, tokens)}\n}`;
}

/** Color del IR → literal o var(--token). */
function colorValue(_tokens: Tokens, v: string | undefined): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("$")) return `var(--${v.slice(1)})`;
  return v;
}

function ussVars(tokens: Tokens): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(tokens.colors)) lines.push(`  --${k}: ${v};`);
  for (const [k, v] of Object.entries(tokens.easings)) {
    if (/^cubic-bezier\([^)]*\)$/.test(v)) lines.push(`  --${k}: ${v};`);
  }
  return lines.join("\n");
}

function resolveEasing(tokens: Tokens, easing: string): string {
  if (easing.startsWith("$")) return tokens.easings[easing.slice(1)] ?? "ease";
  if (/^(linear|ease|ease-in|ease-out|ease-in-out)$/.test(easing)) return easing;
  if (easing.startsWith("cubic-bezier(")) return easing;
  return "ease";
}

function textAlignUss(a: string): string {
  switch (a) {
    case "center": return "middle-center";
    case "right": return "upper-right";
    default: return "upper-left";
  }
}

/** Documenta las líneas de tiempo como corrutinas/AnimationCurve (contrato fiel). */
function timelineDocs(doc: CanvasDoc): string {
  if (doc.timelines.length === 0) return "";
  const lines: string[] = ["/* Líneas de tiempo — implementar en Unity como corrutinas o AnimationCurve */"];
  for (const tl of doc.timelines) {
    lines.push(
      `/* ${tl.name}: duración ${tl.durationMs}ms, loop=${tl.loop ? "on" : "off"}, playMode=${tl.playMode} */`,
    );
    const byNode = new Map<string, typeof tl.keyframes>();
    for (const kf of tl.keyframes) {
      const arr = byNode.get(kf.nodeId) ?? [];
      arr.push(kf);
      byNode.set(kf.nodeId, arr);
    }
    for (const [nodeId, frames] of byNode) {
      const desc = frames
        .sort((a, b) => a.t - b.t)
        .map((f) => `t=${(f.t * 100).toFixed(0)}% props=[${Object.keys(f.properties).join(",")}] easing=${f.easing ?? "default"}`)
        .join(" → ");
      lines.push(`/*   ${nodeId}: ${desc} */`);
    }
  }
  return lines.join("\n");
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[0-9]/.test(cleaned) ? `n_${cleaned}` : cleaned;
}

function hash(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "");
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
