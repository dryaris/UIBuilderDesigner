/**
 * Exportador Godot Engine (.tscn + .theme) — cubre el motor indie.
 *
 * Mapeo IR → Godot (contrato "fiel, no idéntico"):
 *  - Frame         → Control / MarginContainer (auto-layout) / PanelContainer
 *  - Text          → Label
 *  - Shape rect    → ColorRect
 *  - Shape ellipse → TextureRect (placeholder,Godot no tiene primitiva elipse)
 *  - Shape line    → HSeparator / VSeparator
 *  - Vector        → TextureRect (SVG exportado como imagen)
 *  - Auto-layout   → HBoxContainer / VBoxContainer / FlowContainer
 *  - Tokens        → Theme (.tres) con custom colors/fonts
 *  - Constraints   → Anchors + offset (responsive)
 *  - Estados       → StyleBoxFlat por tema (hover, pressed, disabled)
 *  - Timelines     → AnimationPlayer tracks (documentados en comentarios)
 *
 * Genera un .zip con:
 *  - scene.tscn   → árbol de nodos Godot
 *  - theme.tres   → tema del sistema de diseño
 *  - GUIA.txt     → instrucciones paso a paso
 */
import JSZip from "jszip";
import type { CanvasDoc, Node, Style, Tokens, Constraints } from "../core/ir";
import { resolveColor, resolveRadius } from "../core/tokens";
import { downloadBlob, projectFileName } from "./png";

// ---------------------------------------------------------------------------
// Función principal
// ---------------------------------------------------------------------------

export function exportGodot(doc: CanvasDoc): { tscn: string; theme: string; guide: string } {
  const theme = buildTheme(doc.tokens);
  const tscn = buildScene(doc);
  const guide = buildGuide(doc);
  return { tscn, theme, guide };
}

export async function exportGodotBundle(doc: CanvasDoc): Promise<Blob> {
  const { tscn, theme, guide } = exportGodot(doc);
  const zip = new JSZip();
  zip.file("scene.tscn", tscn);
  zip.file("theme.tres", theme);
  zip.file("GUIA.txt", guide);
  return zip.generateAsync({ type: "blob" });
}

export function exportGodotFile(doc: CanvasDoc): void {
  void exportGodotBundle(doc).then((blob) => {
    downloadBlob(blob, `${projectFileName(doc)}-godot.zip`);
  });
}

// ---------------------------------------------------------------------------
// Theme (.tres)
// ---------------------------------------------------------------------------

function buildTheme(tokens: Tokens): string {
  const lines: string[] = [
    `[gd_resource type="Theme" load_steps=2 format=3]`,
    ``,
    `[resource]`,
  ];

  // Custom colors → Godot theme colors
  for (const [name, value] of Object.entries(tokens.colors)) {
    const c = resolveColor(tokens, value) ?? value;
    const rgba = hexToRgba(c);
    if (rgba) {
      lines.push(`colors/${sanitizeResName(name)} = ${rgba}`);
    }
  }

  // Radios → StyleBoxFlat corner_radius
  for (const [name, value] of Object.entries(tokens.radii)) {
    lines.push(`constants/${sanitizeResName(name)} = ${Math.round(value)}`);
  }

  // Spacing → theme constants
  for (const [name, value] of Object.entries(tokens.spacing)) {
    lines.push(`constants/spacing_${sanitizeResName(name)} = ${Math.round(value)}`);
  }

  // Typography (font size) → theme font sizes
  for (const [name, typ] of Object.entries(tokens.typography)) {
    if (typ.fontSize) {
      lines.push(`font_sizes/${sanitizeResName(name)} = ${typ.fontSize}`);
    }
  }

  lines.push(``);
  return lines.join(`\n`);
}

// ---------------------------------------------------------------------------
// Scene (.tscn)
// ---------------------------------------------------------------------------

function buildScene(doc: CanvasDoc): string {
  const lines: string[] = [
    `[gd_scene load_steps=2 format=3]`,
    ``,
    `[ext_resource type="Theme" path="res://theme.tres" id="1_theme"]`,
    ``,
  ];

  const screen = doc.root;
  const children = screen.children.filter((c) => !c.hidden);

  // Root: Control (screen)
  const rootType = screen.style.flexDirection
    ? flexDirectionToGodot(screen.style.flexDirection)
    : "Control";

  lines.push(`[node name="${sanitizeName(screen.name)}" type="${rootType}"]`);
  lines.push(`theme = ExtResource("1_theme")`);
  emitControlProps(lines, screen.style, screen.constraints, null, 0, 0);
  lines.push(``);

  let childIdx = 2;
  for (const child of children) {
    const result = emitNode(child, doc, lines, 1, childIdx);
    childIdx = result.nextIdx;
  }

  return lines.join(`\n`);
}

interface EmitResult {
  nextIdx: number;
}

function emitNode(
  node: Node,
  doc: CanvasDoc,
  lines: string[],
  depth: number,
  childIdx: number,
): EmitResult {
  const pad = "  ".repeat(depth);
  const name = sanitizeName(node.name);

  if (node.hidden) return { nextIdx: childIdx };

  const nodeType = resolveNodeType(node);
  lines.push(`${pad}[node name="${name}" type="${nodeType}" parent="."]`);
  emitControlProps(lines, node.style, node.constraints, node, depth, childIdx);
  childIdx++;

  // Godot 4 scene resource references are id-based; we use inline resources for styles
  if (node.type === "text") {
    lines.push(`${pad}text = ${escapeGodotString(node.text ?? "")}`);
    emitLabelProps(lines, node.style, pad);
  }

  if (node.type === "vector" || (node.type === "shape" && node.shape === "ellipse")) {
    // TextureRect placeholder for vectors/ellipses
    lines.push(`${pad}expand_mode = 6  # IGNORE_SIZE`);
    lines.push(`${pad}stretch_mode = 5  # KEEP_ASPECT_CENTERED`);
  }

  if (node.type === "shape" && node.shape === "line") {
    lines.push(`${pad}custom_minimum_size = Vector2(${Math.round(node.style.width)}, ${Math.round(node.style.height)})`);
  }

  // Auto-layout containers
  if (node.style.flexDirection) {
    emitContainerProps(lines, node.style, pad);
  }

  lines.push(``);

  // Emit styles as sub-resources (StyleBoxFlat for backgrounds, borders, shadows)
  emitStyleResources(lines, node, doc.tokens, pad, `${name}_${node.id.slice(0, 6)}`);

  // Children
  const visibleChildren = node.children.filter((c) => !c.hidden);
  if (visibleChildren.length > 0 && node.style.flexDirection) {
    // Container children use their own sizing within the container
    for (const child of visibleChildren) {
      const result = emitNode(child, doc, lines, depth + 1, childIdx);
      childIdx = result.nextIdx;
    }
  } else if (visibleChildren.length > 0) {
    for (const child of visibleChildren) {
      const result = emitNode(child, doc, lines, depth + 1, childIdx);
      childIdx = result.nextIdx;
    }
  }

  return { nextIdx: childIdx };
}

function resolveNodeType(node: Node): string {
  if (node.style.flexDirection) {
    const dir = node.style.flexDirection;
    if (node.style.wrap) return "FlowContainer";
    return dir === "row" ? "HBoxContainer" : "VBoxContainer";
  }
  switch (node.type) {
    case "text":
      return "Label";
    case "shape":
      if (node.shape === "ellipse") return "TextureRect";
      if (node.shape === "line") {
        return node.style.width >= node.style.height ? "HSeparator" : "VSeparator";
      }
      return "ColorRect";
    case "vector":
      return "TextureRect";
    default:
      return "PanelContainer";
  }
}

function emitControlProps(
  lines: string[],
  style: Style,
  constraints: Constraints | undefined,
  _node: Node | null,
  _depth: number,
  _childIdx: number,
): void {
  const pad = lines[lines.length - 1]?.startsWith("  ")
    ? lines[lines.length - 1].match(/^( *)/)?.[1] ?? ""
    : "";

  // Position + size
  lines.push(`${pad}offset_left = ${Math.round(style.x)}`);
  lines.push(`${pad}offset_top = ${Math.round(style.y)}`);
  lines.push(`${pad}offset_right = ${Math.round(style.x + style.width)}`);
  lines.push(`${pad}offset_bottom = ${Math.round(style.y + style.height)}`);

  // Minimum size for containers
  if (style.flexDirection) {
    lines.push(`${pad}custom_minimum_size = Vector2(${Math.round(style.width)}, ${Math.round(style.height)})`);
  }

  // Constraints → Anchors
  if (constraints) {
    const anchors = constraintsToAnchors(constraints);
    lines.push(`${pad}anchor_left = ${anchors.left}`);
    lines.push(`${pad}anchor_top = ${anchors.top}`);
    lines.push(`${pad}anchor_right = ${anchors.right}`);
    lines.push(`${pad}anchor_bottom = ${anchors.bottom}`);
  }

  // Opacity
  if (style.opacity !== undefined && style.opacity < 1) {
    lines.push(`${pad}modulate = Color(1, 1, 1, ${style.opacity})`);
  }

  // Rotation (if translate used as rotation placeholder)
  if (style.scale !== undefined && style.scale !== 1) {
    lines.push(`${pad}scale = Vector2(${style.scale}, ${style.scale})`);
  }
}

function emitLabelProps(lines: string[], style: Style, pad: string): void {
  // Godot Label doesn't have built-in font properties in node; they come from theme.
  // We emit them as comments for the guide.
  const extras: string[] = [];
  if (style.fontSize) extras.push(`font_size=${style.fontSize}`);
  if (style.fontWeight && style.fontWeight >= 700) extras.push(`bold`);
  if (style.letterSpacing) extras.push(`letter_spacing=${style.letterSpacing}`);
  if (style.textAlign) extras.push(`align=${style.textAlign}`);
  if (extras.length > 0) {
    lines.push(`${pad}# font: ${extras.join(", ")}`);
  }
  if (style.color) {
    const c = resolveColor({colors:{},radii:{},spacing:{},typography:{},shadows:{},easings:{}}, style.color) ?? style.color;
    const rgba = hexToRgba(c);
    if (rgba) lines.push(`${pad}# font_color_override = ${rgba}`);
  }
}

function emitContainerProps(lines: string[], style: Style, pad: string): void {
  // HBox/VBoxContainer: alignment maps to theme overrides
  if (style.justifyContent) {
    const js = justifyContentToGodot(style.justifyContent);
    if (js !== undefined) {
      lines.push(`${pad}# alignment: ${js}`);
    }
  }
  if (style.gap !== undefined) {
    lines.push(`${pad}theme_override_constants/separation = ${Math.round(style.gap)}`);
  }
  if (style.padding) {
    const p = style.padding;
    lines.push(`${pad}theme_override_constants/margin_left = ${Math.round(p.left)}`);
    lines.push(`${pad}theme_override_constants/margin_top = ${Math.round(p.top)}`);
    lines.push(`${pad}theme_override_constants/margin_right = ${Math.round(p.right)}`);
    lines.push(`${pad}theme_override_constants/margin_bottom = ${Math.round(p.bottom)}`);
  }
}

function emitStyleResources(
  lines: string[],
  node: Node,
  tokens: Tokens,
  pad: string,
  uid: string,
): void {
  const style = node.style;
  const hasBg = style.backgroundColor || style.gradient;
  const hasBorder = style.borderRadius !== undefined || style.stroke;
  const hasShadow = style.boxShadow;

  if (!hasBg && !hasBorder && !hasShadow) return;

  // Emit as inline StyleBoxFlat (Godot 4 format)
  const subPad = pad + "  ";
  lines.push(`${pad}[sub_resource type="StyleBoxFlat" id="style_${uid}"]`);

  if (style.backgroundColor) {
    const c = resolveColor(tokens, style.backgroundColor) ?? style.backgroundColor;
    const rgba = hexToRgba(c);
    if (rgba) lines.push(`${subPad}bg_color = ${rgba}`);
  }

  if (style.gradient) {
    // Godot 4 supports gradient in StyleBoxFlat
    const g = style.gradient;
    if (g.type === "linear") {
      lines.push(`${subPad}gradient = SubResource("gradient_${uid}")`);
      // Gradient sub-resource
      const gLines: string[] = [
        `${pad}[sub_resource type="Gradient" id="gradient_${uid}"]`,
        `${subPad}colors = PackedColorArray(${g.stops
          .map((s) => {
            const c2 = resolveColor(tokens, s.color) ?? s.color;
            const rgba2 = hexToRgba(c2) ?? "Color(0, 0, 0, 1)";
            return `${rgba2}`;
          })
          .join(", ")})`,
        `${subPad}offsets = PackedFloat32Array(${g.stops.map((s) => s.pos).join(", ")})`,
      ];
      // Insert gradient before current StyleBoxFlat
      const insertIdx = lines.length - 1;
      for (const gl of gLines) lines.splice(insertIdx, 0, gl);
    }
  }

  const radius = resolveRadius(tokens, style.borderRadius);
  if (radius !== undefined) {
    const r = Math.round(radius);
    lines.push(`${subPad}corner_radius_top_left = ${r}`);
    lines.push(`${subPad}corner_radius_top_right = ${r}`);
    lines.push(`${subPad}corner_radius_bottom_left = ${r}`);
    lines.push(`${subPad}corner_radius_bottom_right = ${r}`);
  }

  if (style.stroke) {
    const c = resolveColor(tokens, style.stroke.color) ?? style.stroke.color;
    const rgba = hexToRgba(c);
    if (rgba) lines.push(`${subPad}border_color = ${rgba}`);
    lines.push(`${subPad}border_width_left = ${Math.round(style.stroke.width)}`);
    lines.push(`${subPad}border_width_top = ${Math.round(style.stroke.width)}`);
    lines.push(`${subPad}border_width_right = ${Math.round(style.stroke.width)}`);
    lines.push(`${subPad}border_width_bottom = ${Math.round(style.stroke.width)}`);
  }

  if (style.boxShadow && !style.boxShadow.inset) {
    lines.push(`${subPad}shadow_color = ${hexToRgba(style.boxShadow.color) ?? "Color(0, 0, 0, 0.3)"}`);
    lines.push(`${subPad}shadow_size = ${Math.round(style.boxShadow.blur)}`);
    lines.push(`${subPad}shadow_offset = Vector2(${Math.round(style.boxShadow.x)}, ${Math.round(style.boxShadow.y)})`);
  }

  lines.push(`${pad}# ↑ StyleBoxFlat: aplicar al tema o como theme_override_styles/panel en el nodo`);
  lines.push(``);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function constraintsToAnchors(
  c: Constraints,
): { left: number; top: number; right: number; bottom: number } {
  const mapH = (v: string): { anchor: number; offset: boolean } => {
    switch (v) {
      case "min": return { anchor: 0, offset: true };
      case "max": return { anchor: 1, offset: true };
      case "center": return { anchor: 0.5, offset: true };
      case "stretch": return { anchor: 0, offset: false };
      default: return { anchor: 0, offset: true };
    }
  };

  const mapV = (v: string): { anchor: number; offset: boolean } => {
    switch (v) {
      case "min": return { anchor: 0, offset: true };
      case "max": return { anchor: 1, offset: true };
      case "center": return { anchor: 0.5, offset: true };
      case "stretch": return { anchor: 0, offset: false };
      default: return { anchor: 0, offset: true };
    }
  };

  const h = mapH(c.horizontal);
  const v = mapV(c.vertical);

  return {
    left: h.anchor,
    top: v.anchor,
    right: c.horizontal === "stretch" ? 1 : h.anchor,
    bottom: c.vertical === "stretch" ? 1 : v.anchor,
  };
}

function flexDirectionToGodot(dir: string): string {
  return dir === "row" ? "HBoxContainer" : "VBoxContainer";
}

function justifyContentToGodot(j: string): string | undefined {
  switch (j) {
    case "flex-start": return undefined; // default
    case "center": return "CENTER";
    case "flex-end": return "END";
    case "space-between": return "SPACE_BETWEEN";
    case "space-around": return "SPACE_AROUND";
    case "space-evenly": return "SPACE_EVENLY";
    default: return undefined;
  }
}

function hexToRgba(hex: string): string | null {
  if (!hex) return null;
  // Token reference
  if (hex.startsWith("$")) return null;

  // Handle rgb/rgba
  if (hex.startsWith("rgb")) {
    const m = hex.match(/[\d.]+/g);
    if (!m) return null;
    const r = parseInt(m[0], 10) / 255;
    const g = parseInt(m[1], 10) / 255;
    const b = parseInt(m[2], 10) / 255;
    const a = m[3] ? parseFloat(m[3]) : 1;
    return `Color(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, ${a.toFixed(3)})`;
  }

  // Hex
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16) / 255;
    const g = parseInt(h[1] + h[1], 16) / 255;
    const b = parseInt(h[2] + h[2], 16) / 255;
    return `Color(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, 1)`;
  }
  if (h.length >= 6) {
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return `Color(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, ${a.toFixed(3)})`;
  }

  return null;
}

function sanitizeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "_").replace(/^[0-9]/, "n_$&") || "Node";
}

function sanitizeResName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

function escapeGodotString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

// ---------------------------------------------------------------------------
// Guide
// ---------------------------------------------------------------------------

function buildGuide(doc: CanvasDoc): string {
  return `CANVAS → GODOT ENGINE — guía de importación
==========================================
Contrato: "fiel, no idéntico". Godot usa Control nodes para UI,
no flexbox/CSS. Usa scene.tscn + theme.tres como punto de partida.

RESOLUCIÓN DE PANTALLA
  ${doc.root.style.width}×${doc.root.style.height} px

ARCHIVOS
  scene.tscn  → Escena Godot 4 (nodos Control)
  theme.tres  → Tema del sistema de diseño (colores, radios, spacing, fonts)

PASOS
  1) Abre Godot 4.0+ y crea un proyecto nuevo (o abre uno existente).

  2) Copia scene.tscn y theme.tres a la carpeta del proyecto.

  3) Abre scene.tscn: verás el árbol de nodos Control.
     - PanelContainer = contenedor visual (borde/sombra/gradiente)
     - ColorRect = rectángulo de color sólido
     - Label = texto
     - HBoxContainer/VBoxContainer = auto-layout
     - TextureRect = vector SVG / elipse (placeholder)

  4) Los vectores SVG se exportan como paths; Godot no los renderiza
     directamente. Opciones:
     a) Exporta el SVG desde Canvas y ponlo como textura en TextureRect
     b) Usa un ColorRect del mismo color como placeholder
     c) Importa el SVG en Godot (soporte limitado en 4.x)

  5) Theme (theme.tres):
     - Colores del sistema de diseño → theme colors
     - Radios → theme constants
     - Spacing → theme spacing
     - Font sizes → theme font_sizes
     Aplica: selecciona un nodo → Theme Override → usa el color/constante

  6) Auto-layout → Containers:
     - HBoxContainer → flexDirection: "row"
     - VBoxContainer → flexDirection: "column"
     - FlowContainer → flexDirection + wrap
     - Separation → gap
     - Margins → padding

  7) Responsive (constraints → anchors):
     - Los offsets incluyen anchors (left/right/top/bottom = 0..1)
     - stretch → anchor_left=0, anchor_right=1 (llena el eje)
     - center → anchor=0.5
     Ajusta los anchors en Godot Inspector si necesitas.

  8) Estados (hover, pressed, disabled):
     - Crea StyleBoxFlat por estado en el Theme
     - Conecta señales (mouse_entered, pressed, etc.)
     - O usa un Node con script que cambie el theme_override

  9) Animaciones (timelines):
     - Crea un AnimationPlayer
     - Por cada keyframe: track de propiedad (position, modulate, scale)
     - Tiempo = t × duración_ms / 1000
     - Loop → loop del AnimationPlayer

  10) Para multiple screens: duplica la escena o usa instancing
      (escenas separadas por pantalla).

NOTAS
  - Godot 4 Control usa anchors (0..1) en vez de pixels para responsive.
  - Los StyleBoxFlat son la forma más cercana a CSS boxes.
  - Para bordes redondeados: StyleBoxFlat corner_radius.
  - Para sombras: StyleBoxFlat shadow_size + shadow_color.
  - Para gradientes: Gradient resource en el tema.
  - El exportador genera la estructura; los detalles finos se ajustan
    en el Inspector de Godot.

TIMELINES (${doc.timelines.length})
  ${doc.timelines.length === 0 ? "(ninguna — crea timelines en Canvas para generar tracks)" : ""}
  ${doc.timelines.map((tl) => `  - ${tl.name}: ${tl.durationMs}ms, loop=${tl.loop}, playMode=${tl.playMode}`).join("\n")}

CONTRATO
  "Fiel, no idéntico": el exportador reproduce la estructura visual y
  tokens; los detalles finos (anti-aliasing, sombras suaves, gradientes
  complejos) se ajustan en el editor de Godot.
`;
}
