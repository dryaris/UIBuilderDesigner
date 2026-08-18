/**
 * Exportador Unreal UMG — Fase 6.
 *
 * UMG no tiene un formato de texto para .uasset: el contrato aceptado es
 * "fiel, no idéntico". Este exportador genera:
 *  - manifest.json: árbol de widgets UMG (Canvas Panel / Border / TextBlock /
 *    Image) con slots (posición/tamaño), propiedades, estados y animaciones,
 *    listo para reconstruir en un Widget Blueprint.
 *  - GUIA.txt: instrucciones paso a paso para un diseñador técnico.
 */
import JSZip from "jszip";
import type { CanvasDoc, Node, Timeline } from "../core/ir";
import { resolveColor } from "../core/tokens";
import { downloadBlob, projectFileName } from "./png";

interface UmgSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UmgNode {
  name: string;
  widget: "CanvasPanel" | "Border" | "TextBlock" | "Image";
  slot: UmgSlot;
  hidden?: boolean;
  properties?: Record<string, unknown>;
  /** Auto-layout del editor: UMG lo reconstruye con Horizontal/VerticalBox. */
  layout?: { direction: "row" | "column"; gap: number; padding: { top: number; right: number; bottom: number; left: number } };
  note?: string;
  children?: UmgNode[];
}

interface UmgTimeline {
  name: string;
  durationMs: number;
  loop: boolean;
  tracks: { nodeId: string; keyframes: { t: number; properties: string[] }[] }[];
}

interface UmgManifest {
  generator: string;
  screen: string;
  size: { width: number; height: number };
  tokens: { colors: Record<string, string> };
  widgets: UmgNode[];
  states: Record<string, string>;
  timelines: UmgTimeline[];
}

export function exportUmg(doc: CanvasDoc): { manifest: string; guide: string } {
  const manifest = buildManifest(doc);
  return {
    manifest: JSON.stringify(manifest, null, 2),
    guide: buildGuide(doc),
  };
}

export async function exportUmgBundle(doc: CanvasDoc): Promise<Blob> {
  const { manifest, guide } = exportUmg(doc);
  const zip = new JSZip();
  zip.file("manifest.json", manifest);
  zip.file("GUIA.txt", guide);
  return zip.generateAsync({ type: "blob" });
}

export function exportUmgFile(doc: CanvasDoc): void {
  void exportUmgBundle(doc).then((blob) => {
    downloadBlob(blob, `${projectFileName(doc)}-umg.zip`);
  });
}

function buildManifest(doc: CanvasDoc): UmgManifest {
  const root = doc.root;
  const children = root.children.map((c) => toUmgNode(c, doc)).filter((n): n is UmgNode => Boolean(n));

  return {
    generator: "Canvas editor visual de UI/UX",
    screen: root.name,
    size: { width: root.style.width, height: root.style.height },
    tokens: { colors: doc.tokens.colors },
    widgets: children,
    states: {
      hover: "Evento OnHovered → aplicar estilo del estado hover",
      pressed: "Evento OnPressed → aplicar estilo del estado pressed",
      disabled: "IsEnabled = false (y estilo disabled)",
      focused: "Evento OnFocusReceived → aplicar estilo del estado focused",
    },
    timelines: doc.timelines.map((tl) => ({
      name: tl.name,
      durationMs: tl.durationMs,
      loop: tl.loop,
      tracks: groupKeyframes(tl.keyframes),
    })),
  };
}

function toUmgNode(node: Node, doc: CanvasDoc): UmgNode | null {
  if (node.hidden) return null;
  const slot: UmgSlot = {
    x: node.style.x,
    y: node.style.y,
    width: node.style.width,
    height: node.style.height,
  };
  const base: UmgNode = { name: node.name, widget: "Border", slot };

  if (node.type === "text") {
    const color = resolveColor(doc.tokens, node.style.color) ?? "#ffffff";
    return {
      ...base,
      widget: "TextBlock",
      properties: {
        text: node.text ?? "",
        fontSize: node.style.fontSize ?? 16,
        fontWeight: node.style.fontWeight ?? 400,
        color,
        justification: node.style.textAlign ?? "left",
        letterSpacing: node.style.letterSpacing ?? 0,
        lineHeight: node.style.lineHeight ?? 1.2,
      },
      note: "TextBlock: color en ColorAndOpacity; justificación en Justification.",
    };
  }

  if (node.style.flexDirection) {
    const pad = node.style.padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
    base.layout = {
      direction: node.style.flexDirection,
      gap: node.style.gap ?? 0,
      padding: pad,
    };
    base.note =
      "Auto-layout: reconstruir con HorizontalBox/VerticalBox + Spacer/Slot padding; " +
      "los slots posicionales no aplican a los hijos.";
  }

  const props: Record<string, unknown> = {};
  const bg = resolveColor(doc.tokens, node.style.backgroundColor);
  if (bg) props.brushColor = bg;
  if (node.style.opacity !== undefined) props.opacity = node.style.opacity;
  if (node.style.borderRadius !== undefined) {
    props.cornerRadius = node.style.borderRadius;
    base.note = "Borde redondeado: usar Border con Brush (Slate) o imagen; UMG no tiene esquinas nativas.";
  }
  if (node.style.boxShadow) {
    props.boxShadow = `${node.style.boxShadow.x}px ${node.style.boxShadow.y}px ${node.style.boxShadow.blur}px ${node.style.boxShadow.color}`;
    base.note = "Sombra: aplicar como imagen/brush o capa adicional (UMG no tiene drop shadow nativo).";
  }
  if (node.style.stroke) {
    props.stroke = `${node.style.stroke.width}px ${node.style.stroke.color}`;
    base.note = "Trazo: usar BorderBrush con Draw As = Border o una imagen.";
  }
  if (node.type === "vector") {
    base.widget = "Image";
    base.note = "Vector SVG: exportar como sprite/imagen (Image + Brush) — UMG no renderiza paths.";
  }
  if (node.shape === "ellipse") {
    base.widget = "Image";
    props.shape = "circle";
    base.note = "Elipse: usar Image con un brush circular (o SBox + Border con radio).";
  }
  if (node.shape === "line") {
    props.shape = "line";
    base.note = "Línea: usar Image/Border fino; UMG no tiene primitiva de línea.";
  }
  base.properties = props;

  const kids = node.children.map((c) => toUmgNode(c, doc)).filter((n): n is UmgNode => Boolean(n));
  if (kids.length > 0) base.children = kids;

  if (node.states && Object.keys(node.states).length > 0) {
    base.properties = {
      ...props,
      states: Object.fromEntries(
        Object.entries(node.states).map(([k, v]) => [
          k,
          {
            style: v.style,
            transition: v.transition ?? null,
          },
        ]),
      ),
    };
  }
  return base;
}

function groupKeyframes(keyframes: Timeline["keyframes"]) {
  const byNode = new Map<string, { t: number; properties: string[] }[]>();
  for (const kf of keyframes) {
    const arr = byNode.get(kf.nodeId) ?? [];
    arr.push({ t: kf.t, properties: Object.keys(kf.properties) });
    byNode.set(kf.nodeId, arr);
  }
  return Array.from(byNode.entries()).map(([nodeId, kfs]) => ({
    nodeId,
    keyframes: kfs.sort((a, b) => a.t - b.t),
  }));
}

function buildGuide(doc: CanvasDoc): string {
  return `CANVAS → UNREAL UMG — guía de importación
========================================
Contrato: "fiel, no idéntico". UMG no tiene flexbox ni un formato de texto
para .uasset; usa manifest.json como mapa para reconstruir la pantalla.

1) Crea un Widget Blueprint (UserWidget) con la resolución de la pantalla
   (${doc.root.style.width}×${doc.root.style.height}).

2) Añade un Canvas Panel como raíz (Fill Screen).

3) Por cada nodo de manifest.json → widgets.widgets:
   - CanvasPanel  → Canvas Panel anidado (contenedor de hijos).
   - Border       → Border (BrushColor = brushColor; Opacity = opacity).
   - TextBlock    → TextBlock (Text, FontSize, ColorAndOpacity, Justification).
   - Image        → Image (usa un brush/sprite; ver "note").
   Slot de cada hijo: Position (X/Y) y Size (W/H) del Canvas Panel.

4) Estados (widgets.states y properties.states):
   - hover/pressed → eventos OnHovered/OnPressed del widget: cambia
     ColorAndOpacity / BrushColor con una animación corta o Set...().
   - disabled → IsEnabled = false y aplica el estilo disabled.
   - La transición (durationMs + easing) se puede reproducir con un
     UMG Animation corto por estado (curva según el easing).

5) Animaciones (timelines):
   - Crea un UMG Animation por línea de tiempo.
   - Añade un track por nodo con sus keyframes (tiempo = t × duración en s).
   - Propiedades animables: posición, tamaño, opacidad, color, escala.
   - Loop = loop del timeline.

6) Tokens: usa la paleta de colores (tokens.colors) para mantener coherencia.
`;
}
